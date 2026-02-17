# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 03_predictive_maint.py
# MISSION:  Automotive — IoT Predictive Maintenance
# STATUS:   BROKEN — days_to_service always NULL (join key mismatch)
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Build a predictive maintenance Gold table that estimates when each
#   vehicle is due for service based on:
#     - Mileage since last service
#     - Anomaly frequency (number of anomalies in last 30 days)
#     - Time since last service
#   And generates maintenance priority alerts.
#
# WHAT YOU'LL LEARN:
#   ✅ Multi-table joins for enrichment (telemetry + vehicles + service)
#   ✅ Window functions: ROW_NUMBER() to find latest service per vehicle
#   ✅ datediff() for calculating days between dates
#   ✅ CASE WHEN for maintenance priority levels
#   ✅ Gold layer aggregation patterns
#
# ⚠️ KNOWN BUG:
#   The join between service_records and vehicles uses the wrong key!
#   service_records.vehicle_id is joined on service_records.service_id,
#   causing NULL in all calculated fields.
#
# INPUT:
#   - {catalog}.{schema_prefix}_bronze.vehicles
#   - {catalog}.{schema_prefix}_bronze.service_records
#   - {catalog}.{schema_prefix}_silver.anomaly_events
#
# OUTPUT:
#   - {catalog}.{schema_prefix}_gold.predictive_maintenance
#     Required: vehicle_id, days_to_service > 0
#
# DOCUMENTATION:
#   - datediff:      https://docs.databricks.com/en/sql/language-manual/functions/datediff.html
#   - ROW_NUMBER:    https://docs.databricks.com/en/sql/language-manual/functions/row_number.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
silver_schema = f"{catalog}.{schema_prefix}_silver"
gold_schema   = f"{catalog}.{schema_prefix}_gold"

# Service interval thresholds
SERVICE_INTERVAL_MILES = 10000   # Recommended miles between services
SERVICE_INTERVAL_DAYS  = 180    # Recommended days between services

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Find Latest Service Record per Vehicle
# ────────────────────────────────────────────────────────────────────────────
# Use ROW_NUMBER() to find the most recent service for each vehicle.
# This is a common "last value per group" pattern.

from pyspark.sql.window import Window
from pyspark.sql.functions import (
    col, row_number, datediff, current_date, when, lit,
    count, round as spark_round, broadcast, coalesce, to_date,
    current_timestamp
)

df_service = spark.read.table(f"{bronze_schema}.service_records")

# Window to rank services by date within each vehicle
service_window = Window.partitionBy("vehicle_id").orderBy(col("service_date").desc())

df_latest_service = (
    df_service
    .withColumn("service_date", to_date(col("service_date")))
    .withColumn("rn", row_number().over(service_window))
    .filter(col("rn") == 1)
    .select(
        col("vehicle_id"),
        col("service_date").alias("last_service_date"),
        col("odometer").alias("last_service_odometer"),
        col("service_type").alias("last_service_type"),
    )
)

print(f"📊 Vehicles with service records: {df_latest_service.count()}")
display(df_latest_service.limit(5))

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2: Count Recent Anomalies per Vehicle
# ────────────────────────────────────────────────────────────────────────────

df_anomalies = spark.read.table(f"{silver_schema}.anomaly_events")

df_anomaly_counts = (
    df_anomalies
    .groupBy("vehicle_id")
    .agg(
        count("*").alias("total_anomalies"),
        count(when(col("anomaly_type") == "engine_overheating", True)).alias("engine_anomalies"),
        count(when(col("anomaly_type") == "low_oil_pressure", True)).alias("oil_anomalies"),
        count(when(col("anomaly_type") == "low_battery_voltage", True)).alias("battery_anomalies"),
    )
)

print(f"📊 Vehicles with anomalies: {df_anomaly_counts.count()}")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Build Predictive Maintenance Table (⚠️ BUG: Wrong Join Key)
# ────────────────────────────────────────────────────────────────────────────
# Join vehicles with their latest service record and anomaly counts
# to calculate days_to_service.
#
# ⚠️ BUG: The join below uses service_id instead of vehicle_id!
# This causes NULL values for all service-related fields.

df_vehicles = spark.read.table(f"{bronze_schema}.vehicles")

# ⚠️ BUG: Left join uses wrong key — service_id doesn't match vehicle_id!
# FIX: Change "service_id" to "vehicle_id" in the join condition
df_maintenance = (
    df_vehicles
    .join(
        df_latest_service.withColumnRenamed("vehicle_id", "service_id"),  # ⚠️ BUG!
        col("vehicle_id") == col("service_id"),   # ⚠️ Always FALSE — columns renamed wrongly
        "left"
    )
    .join(df_anomaly_counts, "vehicle_id", "left")
    .fillna(0, subset=["total_anomalies", "engine_anomalies", "oil_anomalies", "battery_anomalies"])
)

# Because of the wrong join, these will all be NULL:
display(
    df_maintenance
    .select("vehicle_id", "odometer", "last_service_date", "last_service_odometer")
    .limit(5)
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: Calculate Days-to-Service + Maintenance Priority
# ────────────────────────────────────────────────────────────────────────────
# days_to_service estimates how many days until the vehicle should
# be serviced based on miles driven since last service.

df_predictions = (
    df_maintenance
    .withColumn(
        "days_since_service",
        when(col("last_service_date").isNotNull(),
             datediff(current_date(), col("last_service_date"))
        ).otherwise(lit(365))   # Default: assume 1 year if no record
    )
    .withColumn(
        "miles_since_service",
        when(col("last_service_odometer").isNotNull(),
             col("odometer") - col("last_service_odometer")
        ).otherwise(col("odometer"))  # Full odometer if no service record
    )
    .withColumn(
        "service_urgency_pct",
        spark_round(
            (col("miles_since_service") / lit(SERVICE_INTERVAL_MILES)) * 100,
            1
        )
    )
    .withColumn(
        "days_to_service",
        when(col("miles_since_service").isNull(), lit(0))   # NULL from bad join = 0
        .otherwise(
            spark_round(
                (lit(SERVICE_INTERVAL_MILES) - col("miles_since_service"))
                / (col("miles_since_service") / col("days_since_service").cast("double")),
                0
            ).cast("int")
        )
    )
    .withColumn(
        "maintenance_priority",
        when(
            (col("total_anomalies") > 10) | (col("days_to_service") < 0),
            "CRITICAL"
        )
        .when(
            (col("total_anomalies") > 5) | (col("days_to_service") < 30),
            "HIGH"
        )
        .when(col("days_to_service") < 60, "MEDIUM")
        .otherwise("LOW")
    )
    .withColumn("_predicted_at", current_timestamp())
)

display(
    df_predictions
    .select("vehicle_id", "make", "model", "odometer",
            "days_since_service", "miles_since_service",
            "days_to_service", "total_anomalies", "maintenance_priority")
    .orderBy("days_to_service")
    .limit(20)
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: SQL Equivalent — Full Query with Correct Joins
# ────────────────────────────────────────────────────────────────────────────

# ⚡ SQL APPROACH: Implement the correct SQL query yourself!
# No SQL hints are provided for this operation.
# Use the WHAT'S BROKEN section at the bottom and Databricks SQL docs for guidance.

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 6: Write Gold Predictive Maintenance Table
# ────────────────────────────────────────────────────────────────────────────

(
    df_predictions
    .select(
        "vehicle_id", "make", "model", "year", "odometer", "fuel_type",
        "last_service_date", "last_service_odometer", "last_service_type",
        "days_since_service", "miles_since_service", "service_urgency_pct",
        "days_to_service", "total_anomalies", "engine_anomalies",
        "oil_anomalies", "battery_anomalies", "maintenance_priority",
        "_predicted_at",
    )
    .write
    .mode("overwrite")
    .option("overwriteSchema", "true")
    .saveAsTable(f"{gold_schema}.predictive_maintenance")
)

print(f"✅ Gold table: {gold_schema}.predictive_maintenance")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 7: Validation
# ────────────────────────────────────────────────────────────────────────────

result = spark.sql(f"""
    SELECT COUNT(*) AS count
    FROM {gold_schema}.predictive_maintenance
    WHERE days_to_service > 0
""").collect()[0]["count"]

print(f"{'✅' if result >= 1 else '❌'} Vehicles with days_to_service > 0: {result}")
print("   If 0, check: The join between vehicles and service_records is broken!")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: BROKEN — Join Key Mismatch
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   latest_service.vehicle_id is renamed to service_id, so the join
#   condition `vehicle_id == service_id` always fails. All service-related
#   columns (last_service_date, last_service_odometer) are NULL,
#   making days_to_service always 0 or NULL.
#
# TO FIX:
#   Remove the .withColumnRenamed("vehicle_id", "service_id") call,
#   and join directly on vehicle_id:
#     df_vehicles.join(df_latest_service, "vehicle_id", "left")
#
# CONCEPTS LEARNED:
#   1. ROW_NUMBER() to find "latest record per group"
#   2. datediff() for date arithmetic
#   3. Multi-table LEFT JOINs for enrichment
#   4. CASE WHEN for priority classification
#   5. Mileage-based service prediction formula
#
# MISSION COMPLETE when days_to_service validation passes! 🏆
# ────────────────────────────────────────────────────────────────────────────
