# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 02_multi_source_enrichment.py
# MISSION:  AgriTech — Precision Agriculture Data Platform
# STATUS:   BROKEN — INNER JOINs should be LEFT JOINs (40% data loss)
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Join validated soil sensor data with satellite imagery, weather history,
#   and field metadata to create an enriched Silver table. This combined
#   view is essential for downstream NDVI analysis and yield prediction.
#
# WHAT YOU'LL LEARN:
#   ✅ LEFT JOIN vs INNER JOIN — when to use each
#   ✅ Multi-table join patterns (3+ sources)
#   ✅ Date-based joins for time-series alignment
#   ✅ broadcast() for small reference tables
#   ✅ coalesce() for handling NULL from LEFT JOINs
#
# ⚠️ KNOWN BUG:
#   ALL joins use INNER JOIN. Since weather and satellite data don't exist
#   for every field on every day, INNER JOIN drops ~40% of valid sensor
#   readings that simply don't have matching weather/satellite data.
#   FIX: Use LEFT JOIN to preserve ALL sensor readings.
#
# DATA ALIGNMENT:
#   - Sensors: reading per sensor per timestamp (50K rows)
#   - Weather: one record per field per day (10K rows)
#   - Satellite: one image per field per capture_date (10K rows)
#   - Fields: 200 fields (static reference)
#
# INPUT:
#   - {catalog}.{schema_prefix}_silver.soil_sensors_clean
#   - /Volumes/.../weather_history.csv
#   - /Volumes/.../satellite_imagery.csv
#   - {catalog}.{schema_prefix}_bronze.fields
#
# OUTPUT:
#   - {catalog}.{schema_prefix}_silver.sensor_weather_enriched
#
# DOCUMENTATION:
#   - Joins:     https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.join.html
#   - coalesce:  https://docs.databricks.com/en/sql/language-manual/functions/coalesce.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
silver_schema = f"{catalog}.{schema_prefix}_silver"
volume_path   = f"/Volumes/{catalog}/{schema_prefix}_bronze/raw_data"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Load All Data Sources
# ────────────────────────────────────────────────────────────────────────────

from pyspark.sql.functions import (
    col, to_date, to_timestamp, broadcast, coalesce, lit,
    count, current_timestamp, round as spark_round
)

# Clean sensor data (from notebook 01)
df_sensors = spark.read.table(f"{silver_schema}.soil_sensors_clean")

# Weather history
df_weather = (
    spark.read.option("header", "true").option("inferSchema", "true")
    .csv(f"{volume_path}/weather_history.csv")
    .withColumn("weather_date", to_date(col("date")))
)
df_weather.write.mode("overwrite").saveAsTable(f"{bronze_schema}.weather_history")

# Satellite imagery
df_satellite = (
    spark.read.option("header", "true").option("inferSchema", "true")
    .csv(f"{volume_path}/satellite_imagery.csv")
    .withColumn("capture_date", to_date(col("capture_date")))
)
df_satellite.write.mode("overwrite").saveAsTable(f"{bronze_schema}.satellite_imagery")

# Fields reference
df_fields = spark.read.table(f"{bronze_schema}.fields")

print(f"📊 Sensors:   {df_sensors.count()}")
print(f"📊 Weather:   {df_weather.count()}")
print(f"📊 Satellite: {df_satellite.count()}")
print(f"📊 Fields:    {df_fields.count()}")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2: Prepare Join Keys
# ────────────────────────────────────────────────────────────────────────────
# Sensor data has timestamps; weather and satellite have dates.
# Extract date from sensor timestamp for date-level joining.

df_sensors_dated = (
    df_sensors
    .withColumn("reading_date", to_date(col("event_ts")))
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Multi-Source Join (⚠️ BUG: INNER JOINs!)
# ────────────────────────────────────────────────────────────────────────────
# We need to join:
#   sensors ← fields (by field_id)
#   sensors ← weather (by field_id + date)
#   sensors ← satellite (by field_id + date)
#
# ⚠️ BUG: All three joins use INNER join! This drops sensor readings
# when weather or satellite data is missing for that field/date.
# Weather may be unavailable due to station outages.
# Satellite may be unavailable due to cloud cover.

df_enriched = (
    df_sensors_dated
    # Join 1: Add field metadata (crop type, soil type, location)
    .join(
        broadcast(df_fields.select("field_id", "crop_type", "soil_type",
                                    "acreage", "latitude", "longitude")),
        on="field_id",
        how="inner"       # ⚠️ BUG: Should be "left" — drops fields not in reference table
    )
    # Join 2: Add weather data for the same field & date
    .join(
        df_weather.select(
            col("field_id").alias("wx_field_id"),
            col("weather_date"),
            col("temp_max_c").alias("weather_temp_max_c"),
            col("temp_min_c").alias("weather_temp_min_c"),
            col("precipitation_mm").alias("weather_precip_mm"),
            col("humidity_percent").alias("weather_humidity"),
            col("solar_radiation_wm2").alias("weather_solar_rad"),
        ),
        (col("field_id") == col("wx_field_id"))
        & (col("reading_date") == col("weather_date")),
        "inner"           # ⚠️ BUG: Should be "left" — drops readings without weather
    )
    # Join 3: Add satellite imagery for the same field & date
    .join(
        df_satellite.select(
            col("field_id").alias("sat_field_id"),
            col("capture_date"),
            col("ndvi").alias("satellite_ndvi"),
            col("evi").alias("satellite_evi"),
            col("lai").alias("satellite_lai"),
            col("cloud_cover_percent"),
        ),
        (col("field_id") == col("sat_field_id"))
        & (col("reading_date") == col("capture_date")),
        "inner"           # ⚠️ BUG: Should be "left" — drops readings without imagery
    )
    .drop("wx_field_id", "sat_field_id", "weather_date", "capture_date")
)

# Check how many readings survived the INNER joins
enriched_count = df_enriched.count()
original_count = df_sensors.count()
loss_pct = (1 - enriched_count / original_count) * 100

print(f"📊 Enriched records: {enriched_count}")
print(f"📊 Original sensors: {original_count}")
print(f"⚠️ Data loss: {loss_pct:.1f}% (should be <5% with LEFT JOINs!)")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: SQL Equivalent — With LEFT JOINs (Correct!)
# ────────────────────────────────────────────────────────────────────────────

# ⚡ SQL APPROACH: Implement the correct SQL query yourself!
# No SQL hints are provided for this operation.
# Use the WHAT'S BROKEN section at the bottom and Databricks SQL docs for guidance.

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: Handle NULLs from LEFT JOINs
# ────────────────────────────────────────────────────────────────────────────
# When using LEFT JOINs, RIGHT side columns may be NULL.
# Use coalesce() to provide sensible defaults.

df_enriched_clean = (
    df_enriched
    .withColumn("weather_temp_max_c", coalesce(col("weather_temp_max_c"), lit(0)))
    .withColumn("weather_precip_mm", coalesce(col("weather_precip_mm"), lit(0)))
    .withColumn("satellite_ndvi", coalesce(col("satellite_ndvi"), lit(0)))
    .withColumn("_enriched_at", current_timestamp())
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 6: Write Silver Enriched Table
# ────────────────────────────────────────────────────────────────────────────

(
    df_enriched_clean
    .write
    .mode("overwrite")
    .option("overwriteSchema", "true")
    .saveAsTable(f"{silver_schema}.sensor_weather_enriched")
)

print(f"✅ Silver table: {silver_schema}.sensor_weather_enriched")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: BROKEN — INNER JOINs Cause 40% Data Loss
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   All three joins use "inner" instead of "left". This drops sensor
#   readings when weather/satellite data is missing for that field/date.
#   ~40% of valid sensor data is silently discarded.
#
# TO FIX:
#   Change all three join types from "inner" to "left":
#     .join(..., how="left")   # Preserve all sensor readings
#
# WHEN TO USE EACH JOIN TYPE:
#   INNER JOIN: Both sides must have matching keys (use when mandatory)
#   LEFT JOIN:  Keep all rows from left table (use when right is optional)
#   RIGHT JOIN: Keep all rows from right table (rarely used)
#   FULL JOIN:  Keep all rows from both tables (use for reconciliation)
#
# CONCEPTS LEARNED:
#   1. LEFT vs INNER JOIN — critical for data preservation
#   2. Multi-source join patterns (3+ tables)
#   3. Date-based joins for time-series alignment
#   4. coalesce() for NULL handling after LEFT JOINs
#   5. broadcast() hint for small reference tables
#
# NEXT: Run 03_ndvi_calculation.py for satellite NDVI processing
# ────────────────────────────────────────────────────────────────────────────
