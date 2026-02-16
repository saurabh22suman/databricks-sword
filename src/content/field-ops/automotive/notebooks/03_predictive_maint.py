# Databricks notebook source
# MAGIC %md
# MAGIC # Predictive Maintenance
# MAGIC Calculate maintenance predictions based on DTC codes and service history

# COMMAND ----------
from pyspark.sql import functions as F
from pyspark.sql.window import Window

# COMMAND ----------
# Read anomalies and vehicle reference data
anomalies_df = spark.readStream.table("field_ops_automotive.silver_anomalies")
vehicles_df = spark.read.table("field_ops_automotive.vehicles")
dtc_codes_df = spark.read.table("field_ops_automotive.dtc_codes")
service_df = spark.read.table("field_ops_automotive.service_history")

# COMMAND ----------
# Join with DTC code descriptions
enriched_df = (
    anomalies_df
    .join(dtc_codes_df, "dtc_code", "left")
    .join(vehicles_df, "vehicle_id", "left")
)

# COMMAND ----------
# BROKEN: Maintenance window calculation is completely empty
# Expected: Calculate days until next service based on mileage patterns
# Current: Returns NULL for all maintenance predictions

# Get last service mileage (working)
last_service_window = Window.partitionBy("vehicle_id").orderBy(F.desc("service_date"))
last_service_df = service_df.withColumn(
    "row_num", F.row_number().over(last_service_window)
).filter("row_num = 1").select("vehicle_id", "mileage", "service_date")

# Calculate mileage since last service (working)
current_mileage_df = enriched_df.groupBy("vehicle_id").agg(
    F.max("mileage").alias("current_mileage")
)

# ❌ BROKEN: Missing join and calculation logic
# Should join last_service_df with current_mileage_df
# Should calculate miles_since_service and estimate days_until_service
predictions_df = enriched_df.select(
    "vehicle_id",
    "timestamp_parsed",
    "dtc_code",
    "description",
    "severity",
    "is_overheating",
    "is_low_battery",
    "is_rpm_anomaly"
).withColumn(
    "days_until_service", F.lit(None).cast("int")  # ❌ ALWAYS NULL
).withColumn(
    "maintenance_priority", F.lit("UNKNOWN")  # ❌ NO LOGIC
)

# COMMAND ----------
# Write to Gold table
(
    predictions_df.writeStream
    .format("delta")
    .outputMode("append")
    .option("checkpointLocation", "/mnt/checkpoints/automotive_gold")
    .trigger(processingTime="5 minutes")
    .toTable("field_ops_automotive.gold_maintenance_predictions")
)

# COMMAND ----------
# MAGIC %md
# MAGIC ## Expected Fix
# MAGIC ```python
# MAGIC # Calculate maintenance window based on mileage patterns
# MAGIC maintenance_df = (
# MAGIC     current_mileage_df
# MAGIC     .join(last_service_df, "vehicle_id", "left")
# MAGIC     .withColumn(
# MAGIC         "miles_since_service",
# MAGIC         F.col("current_mileage") - F.col("mileage")
# MAGIC     )
# MAGIC     .withColumn(
# MAGIC         "days_until_service",
# MAGIC         F.when(
# MAGIC             F.col("miles_since_service") >= 4500,
# MAGIC             F.lit(0)  # Due now
# MAGIC         ).when(
# MAGIC             F.col("miles_since_service") >= 3500,
# MAGIC             F.lit(15)  # Due soon (2 weeks)
# MAGIC         ).otherwise(
# MAGIC             F.lit(30)  # Normal schedule
# MAGIC         )
# MAGIC     )
# MAGIC )
# MAGIC 
# MAGIC predictions_df = (
# MAGIC     enriched_df
# MAGIC     .join(maintenance_df, "vehicle_id", "left")
# MAGIC     .withColumn(
# MAGIC         "maintenance_priority",
# MAGIC         F.when(F.col("severity") == "CRITICAL", "HIGH")
# MAGIC          .when(F.col("days_until_service") == 0, "HIGH")
# MAGIC          .when(F.col("days_until_service") <= 15, "MEDIUM")
# MAGIC          .otherwise("LOW")
# MAGIC     )
# MAGIC )
# MAGIC ```
