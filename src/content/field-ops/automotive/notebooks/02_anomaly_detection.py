# Databricks notebook source
# MAGIC %md
# MAGIC # Anomaly Detection
# MAGIC Detect anomalous vehicle behavior patterns for predictive alerts

# COMMAND ----------
from pyspark.sql import functions as F
from pyspark.sql.window import Window

# COMMAND ----------
# Read Bronze telemetry
telemetry_df = spark.readStream.table("field_ops_automotive.bronze_telemetry")

# COMMAND ----------
# BROKEN: Anomaly thresholds are inverted - high temp is flagged as low
# Expected: engine_temp > 220 is overheating
# Current code: engine_temp < 220 (flags normal temps as anomalies!)
anomaly_df = telemetry_df.withColumn(
    "is_overheating",
    F.when(F.col("engine_temp") < 220, True).otherwise(False)  # ❌ INVERTED LOGIC
).withColumn(
    "is_low_battery",
    F.when(F.col("battery_voltage") > 11.5, True).otherwise(False)  # ❌ INVERTED
).withColumn(
    "is_overspeed",
    F.when(F.col("speed") < 120, True).otherwise(False)  # ❌ INVERTED
)

# COMMAND ----------
# Statistical anomaly detection (working correctly)
window_spec = Window.partitionBy("vehicle_id").orderBy("timestamp_parsed").rowsBetween(-100, 0)

stats_df = anomaly_df.withColumn(
    "rpm_rolling_avg", F.avg("rpm").over(window_spec)
).withColumn(
    "rpm_rolling_std", F.stddev("rpm").over(window_spec)
).withColumn(
    "is_rpm_anomaly",
    F.abs(F.col("rpm") - F.col("rpm_rolling_avg")) > (3 * F.col("rpm_rolling_std"))
)

# COMMAND ----------
# Write to Silver table
(
    stats_df.writeStream
    .format("delta")
    .outputMode("append")
    .option("checkpointLocation", "/mnt/checkpoints/automotive_silver")
    .trigger(processingTime="1 minute")
    .toTable("field_ops_automotive.silver_anomalies")
)

# COMMAND ----------
# MAGIC %md
# MAGIC ## Expected Fix
# MAGIC ```python
# MAGIC # Correct anomaly detection with proper thresholds
# MAGIC anomaly_df = telemetry_df.withColumn(
# MAGIC     "is_overheating",
# MAGIC     F.when(F.col("engine_temp") > 220, True).otherwise(False)  # ✅ HIGH temp
# MAGIC ).withColumn(
# MAGIC     "is_low_battery",
# MAGIC     F.when(F.col("battery_voltage") < 11.5, True).otherwise(False)  # ✅ LOW voltage
# MAGIC ).withColumn(
# MAGIC     "is_overspeed",
# MAGIC     F.when(F.col("speed") > 120, True).otherwise(False)  # ✅ HIGH speed
# MAGIC )
# MAGIC ```
