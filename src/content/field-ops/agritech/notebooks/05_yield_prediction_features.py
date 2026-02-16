# Databricks notebook source
# MAGIC %md
# MAGIC # Yield Prediction Feature Engineering
# MAGIC Create ML-ready features for crop yield prediction models

# COMMAND ----------
from databricks import feature_store
from pyspark.sql import functions as F
from pyspark.sql.window import Window

# COMMAND ----------
fs = feature_store.FeatureStoreClient()

# COMMAND ----------
# Read enriched sensor data
sensors_df = spark.read.table("agritech_silver.sensor_weather_enriched")
ndvi_df = spark.read.table("agritech_silver.satellite_imagery_processed")
irrigation_df = spark.read.table("agritech_gold.irrigation_summary")

# COMMAND ----------
# BROKEN: Growing Degree Days (GDD) calculation is missing crop-specific base temperatures
# Expected: GDD base temp varies by crop (corn=50°F, wheat=32°F, soybeans=50°F)
# Current: Using fixed 50°F for all crops - wrong for wheat and other cool-season crops!

# Calculate daily GDD
# Formula: GDD = ((Tmax + Tmin) / 2) - Tbase
gdd_df = (
    sensors_df
    .groupBy("field_id", "date", "crop_type")
    .agg(
        F.max("weather_temp_f").alias("tmax"),
        F.min("weather_temp_f").alias("tmin")
    )
    .withColumn("tavg", (F.col("tmax") + F.col("tmin")) / 2)
    # ❌ WRONG: Using fixed 50°F base temp for all crops
    .withColumn("gdd", 
        F.when(F.col("tavg") > 50, F.col("tavg") - 50).otherwise(0)
    )
)

# Calculate cumulative GDD
window_spec = Window.partitionBy("field_id").orderBy("date").rowsBetween(Window.unboundedPreceding, 0)
gdd_cumulative = gdd_df.withColumn(
    "gdd_cumulative", F.sum("gdd").over(window_spec)
)

# COMMAND ----------
# Aggregate features by field and week
feature_df = (
    sensors_df
    .groupBy("field_id", F.weekofyear("timestamp_parsed").alias("week"))
    .agg(
        F.avg("soil_moisture_pct").alias("avg_soil_moisture"),
        F.avg("soil_temp_c").alias("avg_soil_temp"),
        F.avg("ph").alias("avg_ph"),
        F.avg("nitrogen_ppm").alias("avg_nitrogen"),
        F.avg("rainfall_inches").alias("total_rainfall")
    )
    .join(
        ndvi_df.groupBy("field_id").agg(F.avg("ndvi").alias("avg_ndvi")),
        "field_id",
        "left"
    )
    .join(
        gdd_cumulative.groupBy("field_id").agg(F.max("gdd_cumulative").alias("gdd_cumulative")),
        "field_id",
        "left"
    )
)

# COMMAND ----------
# Register in Feature Store
fs.create_table(
    name="feature_store.crop_yield_features",
    primary_keys=["field_id", "week"],
    df=feature_df,
    description="Weekly aggregated features for crop yield prediction"
)

# COMMAND ----------
# MAGIC %md
# MAGIC ## Expected Fix
# MAGIC ```python
# MAGIC # Use crop-specific base temperatures for GDD
# MAGIC gdd_df = (
# MAGIC     sensors_df
# MAGIC     .groupBy("field_id", "date", "crop_type")
# MAGIC     .agg(...)
# MAGIC     .withColumn("tavg", (F.col("tmax") + F.col("tmin")) / 2)
# MAGIC     .withColumn("tbase",
# MAGIC         F.when(F.col("crop_type") == "corn", 50)
# MAGIC          .when(F.col("crop_type") == "wheat", 32)
# MAGIC          .when(F.col("crop_type") == "soybeans", 50)
# MAGIC          .otherwise(50)
# MAGIC     )
# MAGIC     .withColumn("gdd",
# MAGIC         F.when(F.col("tavg") > F.col("tbase"), F.col("tavg") - F.col("tbase"))
# MAGIC          .otherwise(0)
# MAGIC     )
# MAGIC )
# MAGIC ```
