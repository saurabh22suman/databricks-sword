# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 02_anomaly_detection.py
# MISSION:  Automotive — IoT Predictive Maintenance
# STATUS:   BROKEN — All threshold comparisons INVERTED
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Detect anomalous vehicle readings using threshold-based rules:
#     - Engine temperature > 220°F (overheating)
#     - Oil pressure < 20 PSI (low lubrication)
#     - Battery voltage < 12V (failing battery)
#   Create an anomaly_events table in Silver with details on each anomaly.
#
# WHAT YOU'LL LEARN:
#   ✅ CASE WHEN for multi-condition anomaly flagging
#   ✅ PySpark when/otherwise chaining
#   ✅ explode() or UNPIVOT for normalizing anomaly types
#   ✅ Window functions for detecting anomaly trends
#   ✅ SQL UNION ALL for combining anomaly streams
#
# ⚠️ KNOWN BUG:
#   ALL threshold comparisons are backwards!
#   - engine_temp_f < 220 instead of > 220 (flags NORMAL, misses overheating)
#   - oil_pressure_psi > 20 instead of < 20 (flags NORMAL, misses low oil)
#   - battery_voltage > 12 instead of < 12 (flags NORMAL, misses dead battery)
#
# INPUT:
#   - {catalog}.{schema_prefix}_bronze.vehicle_telemetry
#   - {catalog}.{schema_prefix}_bronze.vehicles
#
# OUTPUT:
#   - {catalog}.{schema_prefix}_silver.anomaly_events
#
# DOCUMENTATION:
#   - when:    https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.when.html
#   - CASE:    https://docs.databricks.com/en/sql/language-manual/functions/case.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
silver_schema = f"{catalog}.{schema_prefix}_silver"

# Anomaly thresholds (reference)
THRESHOLDS = {
    "engine_temp_f":     {"operator": ">", "value": 220, "label": "Engine Overheating"},
    "oil_pressure_psi":  {"operator": "<", "value": 20,  "label": "Low Oil Pressure"},
    "battery_voltage":   {"operator": "<", "value": 12,  "label": "Low Battery Voltage"},
}

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Load Bronze Telemetry
# ────────────────────────────────────────────────────────────────────────────

df_telemetry = spark.read.table(f"{bronze_schema}.vehicle_telemetry")
print(f"📊 Telemetry readings: {df_telemetry.count()}")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2: Flag Anomalies — PySpark (⚠️ ALL COMPARISONS INVERTED!)
# ────────────────────────────────────────────────────────────────────────────
# Each reading is checked against threshold rules.
# A boolean column is added for each anomaly type.
#
# ⚠️ BUG: Every comparison operator is BACKWARDS!
# These conditions flag NORMAL readings as anomalies and miss real ones.

from pyspark.sql.functions import (
    col, when, lit, array, explode, struct, current_timestamp,
    count, sum as spark_sum
)

df_flagged = (
    df_telemetry
    .withColumn(
        "anomaly_engine_temp",
        when(col("engine_temp_f") < 220, True)   # ⚠️ BUG: should be > 220
        .otherwise(False)
    )
    .withColumn(
        "anomaly_oil_pressure",
        when(col("oil_pressure_psi") > 20, True)  # ⚠️ BUG: should be < 20
        .otherwise(False)
    )
    .withColumn(
        "anomaly_battery",
        when(col("battery_voltage") > 12, True)   # ⚠️ BUG: should be < 12
        .otherwise(False)
    )
    .withColumn(
        "is_anomalous",
        col("anomaly_engine_temp") | col("anomaly_oil_pressure") | col("anomaly_battery")
    )
)

anomaly_count = df_flagged.filter(col("is_anomalous")).count()
total_count = df_flagged.count()
print(f"🚩 Anomalous readings: {anomaly_count} / {total_count} ({100*anomaly_count/total_count:.1f}%)")
print("⚠️  If the percentage is very high (>50%), the comparisons are probably inverted!")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Build Anomaly Events Table
# ────────────────────────────────────────────────────────────────────────────
# Each anomaly type becomes its own row with details about what was
# detected, the actual value, and the threshold it violated.
# This is a UNPIVOT / melt pattern — wide to long.

from pyspark.sql.functions import expr

# Engine temperature anomalies
df_engine_anomalies = (
    df_flagged
    .filter(col("anomaly_engine_temp"))
    .select(
        "reading_id", "vehicle_id", "timestamp",
        lit("engine_overheating").alias("anomaly_type"),
        col("engine_temp_f").cast("double").alias("actual_value"),
        lit(220.0).alias("threshold_value"),
        lit("Engine temperature exceeds safe operating range").alias("description"),
    )
)

# Oil pressure anomalies
df_oil_anomalies = (
    df_flagged
    .filter(col("anomaly_oil_pressure"))
    .select(
        "reading_id", "vehicle_id", "timestamp",
        lit("low_oil_pressure").alias("anomaly_type"),
        col("oil_pressure_psi").cast("double").alias("actual_value"),
        lit(20.0).alias("threshold_value"),
        lit("Oil pressure below minimum safe level").alias("description"),
    )
)

# Battery voltage anomalies
df_battery_anomalies = (
    df_flagged
    .filter(col("anomaly_battery"))
    .select(
        "reading_id", "vehicle_id", "timestamp",
        lit("low_battery_voltage").alias("anomaly_type"),
        col("battery_voltage").cast("double").alias("actual_value"),
        lit(12.0).alias("threshold_value"),
        lit("Battery voltage below minimum charging threshold").alias("description"),
    )
)

# Combine all anomaly streams
df_all_anomalies = (
    df_engine_anomalies
    .unionAll(df_oil_anomalies)
    .unionAll(df_battery_anomalies)
    .withColumn("_detected_at", current_timestamp())
)

print(f"📊 Total anomaly events: {df_all_anomalies.count()}")
df_all_anomalies.show(10, truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: SQL Alternative — UNION ALL for Anomaly Streams
# ────────────────────────────────────────────────────────────────────────────
# SQL approach using UNION ALL to combine anomaly streams.
# NOTE: This version has the CORRECT threshold comparisons!

# ⚡ SQL APPROACH: Implement the correct SQL query yourself!
# No SQL hints are provided for this operation.
# Use the WHAT'S BROKEN section at the bottom and Databricks SQL docs for guidance.

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: Enrich with Vehicle Details
# ────────────────────────────────────────────────────────────────────────────

from pyspark.sql.functions import broadcast

df_vehicles = spark.read.table(f"{bronze_schema}.vehicles")

df_anomalies_enriched = (
    df_all_anomalies
    .join(
        broadcast(df_vehicles.select("vehicle_id", "make", "model", "year", "fuel_type")),
        on="vehicle_id",
        how="left"
    )
)

df_anomalies_enriched.show(10, truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 6: Write Silver Anomaly Events
# ────────────────────────────────────────────────────────────────────────────

(
    df_anomalies_enriched
    .write
    .mode("overwrite")
    .option("overwriteSchema", "true")
    .saveAsTable(f"{silver_schema}.anomaly_events")
)

print(f"✅ Silver table: {silver_schema}.anomaly_events")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 7: Anomaly Distribution Summary
# ────────────────────────────────────────────────────────────────────────────

spark.sql(f"""
    SELECT
        anomaly_type,
        COUNT(*) AS event_count,
        COUNT(DISTINCT vehicle_id) AS vehicles_affected,
        ROUND(AVG(actual_value), 2) AS avg_actual_value,
        ROUND(MIN(actual_value), 2) AS min_actual_value,
        ROUND(MAX(actual_value), 2) AS max_actual_value
    FROM {silver_schema}.anomaly_events
    GROUP BY anomaly_type
    ORDER BY event_count DESC
""").show(truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: BROKEN — Inverted Thresholds
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   ALL three threshold comparisons are backwards:
#     engine_temp_f < 220  →  should be > 220
#     oil_pressure_psi > 20  →  should be < 20
#     battery_voltage > 12  →  should be < 12
#
# TO FIX:
#   Flip the comparison operators on all three .withColumn() calls:
#     when(col("engine_temp_f") > 220, True)
#     when(col("oil_pressure_psi") < 20, True)
#     when(col("battery_voltage") < 12, True)
#
# CONCEPTS LEARNED:
#   1. Threshold-based anomaly detection for IoT
#   2. UNION ALL pattern to combine anomaly streams
#   3. Wide-to-long transformation (UNPIVOT)
#   4. broadcast() joins for vehicle enrichment
#   5. Anomaly summary dashboards with GROUP BY
#
# NEXT: Run 03_predictive_maint.py to build maintenance predictions
# ────────────────────────────────────────────────────────────────────────────
