# Databricks notebook source
# MAGIC %md
# MAGIC # Irrigation Efficiency Analysis
# MAGIC Calculate water use efficiency metrics by field and crop type

# COMMAND ----------
from pyspark.sql import functions as F
from pyspark.sql.window import Window

# COMMAND ----------
# Read irrigation logs
irrigation_df = spark.read.table("agritech_bronze.irrigation_logs")

# Read field boundaries with crop types
fields_df = spark.read.table("agritech_bronze.field_boundaries")

# COMMAND ----------
# Join irrigation with field metadata
irrigation_enriched = (
    irrigation_df
    .withColumn("timestamp_parsed", F.to_timestamp("timestamp"))
    .join(fields_df.select("field_id", "crop_type", "acres"), "field_id", "left")
)

# COMMAND ----------
# BROKEN: Water Use Efficiency calculation is incorrect
# Expected: WUE = (yield / total_water_applied) - need to aggregate water by field/week
# Current: Calculating per-event efficiency instead of cumulative

# Calculate moisture increase per irrigation event
irrigation_metrics = irrigation_enriched.withColumn(
    "moisture_increase",
    F.col("soil_moisture_after") - F.col("soil_moisture_before")
).withColumn(
    "date", F.to_date("timestamp_parsed")
).withColumn(
    "week", F.weekofyear("timestamp_parsed")
)

# ❌ WRONG: Calculating efficiency per event, not aggregated by week
# Should: Sum water_applied over week, then calculate efficiency
irrigation_metrics = irrigation_metrics.withColumn(
    "water_use_efficiency",
    F.col("moisture_increase") / F.col("water_applied_gallons")  # ❌ Per-event, not cumulative
)

# COMMAND ----------
# Write to Gold
(
    irrigation_metrics
    .write
    .format("delta")
    .mode("overwrite")
    .saveAsTable("agritech_gold.irrigation_summary")
)

# COMMAND ----------
# MAGIC %md
# MAGIC ## Expected Fix
# MAGIC ```python
# MAGIC # Aggregate water usage by field and week
# MAGIC weekly_irrigation = (
# MAGIC     irrigation_enriched
# MAGIC     .groupBy("field_id", "crop_type", "week")
# MAGIC     .agg(
# MAGIC         F.sum("water_applied_gallons").alias("total_water_gallons"),
# MAGIC         F.avg("soil_moisture_after").alias("avg_moisture_after"),
# MAGIC         F.avg("soil_moisture_before").alias("avg_moisture_before"),
# MAGIC         F.count("*").alias("irrigation_events")
# MAGIC     )
# MAGIC     .withColumn("moisture_increase", F.col("avg_moisture_after") - F.col("avg_moisture_before"))
# MAGIC     .withColumn("water_use_efficiency", F.col("moisture_increase") / F.col("total_water_gallons"))
# MAGIC )
# MAGIC ```
