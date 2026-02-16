# Databricks notebook source
# MAGIC %md
# MAGIC # Multi-Source Data Enrichment
# MAGIC Join soil sensors with weather and satellite data for unified analytics

# COMMAND ----------
from pyspark.sql import functions as F

# COMMAND ----------
# Read source data
sensors_df = spark.read.table("agritech_bronze.soil_sensors")
weather_df = spark.read.table("agritech_bronze.weather_history")
satellite_df = spark.read.table("agritech_bronze.satellite_imagery")

# COMMAND ----------
# Prepare timestamps for joining
sensors_prepared = (
    sensors_df
    .withColumn("timestamp_parsed", F.to_timestamp("timestamp"))
    .withColumn("date", F.to_date("timestamp_parsed"))
    .withColumn("hour", F.hour("timestamp_parsed"))
)

weather_prepared = (
    weather_df
    .withColumn("observation_time_parsed", F.to_timestamp("observation_time"))
    .withColumn("date", F.to_date("observation_time_parsed"))
    .withColumn("hour", F.hour("observation_time_parsed"))
)

satellite_prepared = (
    satellite_df
    .withColumn("capture_date_parsed", F.to_date("capture_date"))
)

# COMMAND ----------
# BROKEN: Using INNER JOIN causes massive data loss
# Expected: Use LEFT JOIN to preserve all sensor readings
# Current: INNER JOIN drops sensors when weather/satellite data is missing

# ❌ WRONG: Loses 40% of sensor readings due to missing weather/satellite data
enriched_df = (
    sensors_prepared
    .join(
        weather_prepared,
        (sensors_prepared.field_id == weather_prepared.field_id) &
        (sensors_prepared.date == weather_prepared.date) &
        (sensors_prepared.hour == weather_prepared.hour),
        "inner"  # ❌ Should be "left"
    )
    .join(
        satellite_prepared,
        (sensors_prepared.field_id == satellite_prepared.field_id) &
        (sensors_prepared.date == satellite_prepared.capture_date_parsed),
        "inner"  # ❌ Should be "left"
    )
)

# COMMAND ----------
# Write to Silver
(
    enriched_df
    .write
    .format("delta")
    .mode("overwrite")
    .saveAsTable("agritech_silver.sensor_weather_enriched")
)

# COMMAND ----------
# MAGIC %md
# MAGIC ## Expected Fix
# MAGIC ```python
# MAGIC # Use LEFT JOIN to preserve all sensor readings
# MAGIC enriched_df = (
# MAGIC     sensors_prepared
# MAGIC     .join(weather_prepared, [...], "left")  # ✅ Preserve sensors
# MAGIC     .join(satellite_prepared, [...], "left")  # ✅ Preserve sensors
# MAGIC )
# MAGIC ```
