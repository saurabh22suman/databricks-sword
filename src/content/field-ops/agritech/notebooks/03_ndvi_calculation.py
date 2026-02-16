# Databricks notebook source
# MAGIC %md
# MAGIC # NDVI Calculation from Satellite Imagery
# MAGIC Calculate Normalized Difference Vegetation Index for crop health monitoring

# COMMAND ----------
from pyspark.sql import functions as F

# COMMAND ----------
# Read satellite imagery data
satellite_df = spark.read.table("agritech_bronze.satellite_imagery")

# COMMAND ----------
# BROKEN: Band ordering is reversed - NIR and Red are swapped
# Expected: NDVI = (NIR - Red) / (NIR + Red), where NIR = band_8, Red = band_4
# Current: Using Red in place of NIR and vice versa - produces negative NDVI values!

# ❌ WRONG: Bands are reversed (Red - NIR) instead of (NIR - Red)
ndvi_df = satellite_df.withColumn(
    "ndvi",
    (F.col("band_4_red") - F.col("band_8_nir")) / 
    (F.col("band_4_red") + F.col("band_8_nir"))
)

# COMMAND ----------
# Check NDVI range (should be -1 to +1, typically 0.2 to 0.8 for crops)
print("NDVI Statistics:")
ndvi_df.select(
    F.min("ndvi").alias("min_ndvi"),
    F.max("ndvi").alias("max_ndvi"),
    F.avg("ndvi").alias("avg_ndvi")
).show()

# Current output: min_ndvi = -0.8, max_ndvi = -0.4 (ALL NEGATIVE - clearly wrong!)

# COMMAND ----------
# Filter out cloudy images
ndvi_filtered = ndvi_df.filter(F.col("cloud_cover_pct") < 10)

# COMMAND ----------
# Write to Silver
(
    ndvi_filtered
    .write
    .format("delta")
    .mode("overwrite")
    .saveAsTable("agritech_silver.satellite_imagery_processed")
)

# COMMAND ----------
# MAGIC %md
# MAGIC ## Expected Fix
# MAGIC ```python
# MAGIC # Correct NDVI formula with proper band ordering
# MAGIC ndvi_df = satellite_df.withColumn(
# MAGIC     "ndvi",
# MAGIC     (F.col("band_8_nir") - F.col("band_4_red")) /   # ✅ NIR - Red
# MAGIC     (F.col("band_8_nir") + F.col("band_4_red"))     # ✅ NIR + Red
# MAGIC )
# MAGIC ```
