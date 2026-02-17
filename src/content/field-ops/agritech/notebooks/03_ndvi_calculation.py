# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 03_ndvi_calculation.py
# MISSION:  AgriTech — Precision Agriculture Data Platform
# STATUS:   BROKEN — NDVI formula uses (Red - NIR) instead of (NIR - Red)
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Calculate Normalized Difference Vegetation Index (NDVI) from satellite
#   band data. NDVI is the most widely used vegetation index in precision
#   agriculture — it quantifies plant health by comparing near-infrared
#   (NIR) reflectance (which healthy vegetation reflects strongly) against
#   red light reflectance (which chlorophyll absorbs).
#
# WHAT YOU'LL LEARN:
#   ✅ NDVI formula and remote sensing fundamentals
#   ✅ Band arithmetic with PySpark column expressions
#   ✅ Value clamping with greatest()/least()
#   ✅ CASE WHEN for categorical classification
#   ✅ Time-series vegetation trend analysis with window functions
#
# ⚠️ KNOWN BUG:
#   The NDVI formula is reversed: (Red - NIR)/(Red + NIR).
#   The CORRECT formula is: (NIR - Red)/(NIR + Red).
#   This produces NEGATIVE values for healthy vegetation and POSITIVE
#   for bare soil — the exact opposite of reality.
#
# REFERENCE:
#   NDVI = (NIR - Red) / (NIR + Red)
#   Range: -1.0 to +1.0
#     -1.0 to 0.0  → Water, bare soil, urban, clouds
#      0.0 to 0.33 → Sparse vegetation, stressed crops
#      0.33 to 0.66 → Moderate vegetation, cropland
#      0.66 to 1.0  → Dense, healthy vegetation
#
# INPUT:
#   - {catalog}.{schema_prefix}_bronze.satellite_imagery
#
# OUTPUT:
#   - {catalog}.{schema_prefix}_silver.ndvi_metrics
#
# DOCUMENTATION:
#   - NDVI:    https://en.wikipedia.org/wiki/Normalized_difference_vegetation_index
#   - Spark:   https://docs.databricks.com/en/sql/language-manual/functions/greatest.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
silver_schema = f"{catalog}.{schema_prefix}_silver"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Load Satellite Band Data
# ────────────────────────────────────────────────────────────────────────────
# Satellite imagery typically contains spectral bands:
#   - band_red:    visible red reflectance (0.0 - 1.0)
#   - band_nir:    near-infrared reflectance (0.0 - 1.0)
#   - band_green:  visible green reflectance (0.0 - 1.0)
#   - band_blue:   visible blue reflectance (0.0 - 1.0)
#   - ndvi:        pre-calculated NDVI from source (may be stale)

from pyspark.sql.functions import (
    col, to_date, when, lit, greatest, least,
    avg, min as spark_min, max as spark_max, count,
    round as spark_round, current_timestamp, row_number,
    lag
)
from pyspark.sql.window import Window

df_satellite = spark.read.table(f"{bronze_schema}.satellite_imagery")

display(df_satellite.limit(10))
print(f"📊 Total satellite records: {df_satellite.count()}")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2: Compute NDVI from Band Data (⚠️ BUG: Formula Reversed!)
# ────────────────────────────────────────────────────────────────────────────
# NDVI = (NIR - Red) / (NIR + Red)
#
# ⚠️ BUG: The formula below is REVERSED — it computes (Red - NIR)/(Red + NIR)
# This produces negative values for healthy vegetation and positive
# for bare soil. The values will fail the validation range check.

df_ndvi = (
    df_satellite
    .withColumn(
        "computed_ndvi",
        # ⚠️ BUG: (Red - NIR) instead of (NIR - Red) — inverts all values!
        (col("band_red") - col("band_nir"))
        / (col("band_red") + col("band_nir"))
    )
    # Clamp to valid range [-1, 1] to handle any floating point drift
    .withColumn("computed_ndvi",
        greatest(lit(-1.0), least(lit(1.0), col("computed_ndvi")))
    )
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: SQL Equivalent (Correct Formula for Reference)
# ────────────────────────────────────────────────────────────────────────────

# ⚡ SQL APPROACH: Implement the correct SQL query yourself!
# No SQL hints are provided for this operation.
# Use the WHAT'S BROKEN section at the bottom and Databricks SQL docs for guidance.

# NOTE: SQL approach uses NULLIF to avoid division by zero when both
# bands are 0 (e.g., ocean pixels). PySpark equivalent:
#   when(col("band_nir") + col("band_red") != 0, ...)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: Classify Vegetation Health
# ────────────────────────────────────────────────────────────────────────────
# Map NDVI continuous value to discrete health categories.

df_classified = (
    df_ndvi
    .withColumn("vegetation_class",
        when(col("computed_ndvi") < 0.0, "water_or_bare")
        .when(col("computed_ndvi") < 0.15, "bare_soil")
        .when(col("computed_ndvi") < 0.33, "sparse_vegetation")
        .when(col("computed_ndvi") < 0.50, "moderate_vegetation")
        .when(col("computed_ndvi") < 0.66, "healthy_vegetation")
        .otherwise("dense_vegetation")
    )
)

# Show distribution of classes
display(
    df_classified
    .groupBy("vegetation_class")
    .agg(count("*").alias("pixel_count"))
    .orderBy("vegetation_class")
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: SQL Classification with CASE WHEN
# ────────────────────────────────────────────────────────────────────────────

# ⚡ SQL APPROACH: Implement the correct SQL query yourself!
# No SQL hints are provided for this operation.
# Use the WHAT'S BROKEN section at the bottom and Databricks SQL docs for guidance.

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 6: NDVI Trend Analysis per Field (Window Functions)
# ────────────────────────────────────────────────────────────────────────────
# Track vegetation health changes over time using LAG().
# A significant drop in NDVI between consecutive captures may indicate
# drought, disease, or harvest.

window_field_time = Window.partitionBy("field_id").orderBy("capture_date")

df_with_trend = (
    df_classified
    .withColumn("prev_ndvi", lag("computed_ndvi", 1).over(window_field_time))
    .withColumn("ndvi_change",
        when(col("prev_ndvi").isNotNull(),
             spark_round(col("computed_ndvi") - col("prev_ndvi"), 4))
    )
    .withColumn("trend",
        when(col("ndvi_change") > 0.1, "improving")
        .when(col("ndvi_change") < -0.1, "declining")
        .otherwise("stable")
    )
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 7: Aggregate NDVI by Field
# ────────────────────────────────────────────────────────────────────────────
# Compute per-field NDVI statistics for use in downstream enrichment.

df_field_ndvi_stats = (
    df_with_trend
    .groupBy("field_id")
    .agg(
        spark_round(avg("computed_ndvi"), 4).alias("avg_ndvi"),
        spark_round(spark_min("computed_ndvi"), 4).alias("min_ndvi"),
        spark_round(spark_max("computed_ndvi"), 4).alias("max_ndvi"),
        count("*").alias("observation_count"),
        avg(when(col("trend") == "declining", 1).otherwise(0)).alias("decline_rate"),
    )
)

display(df_field_ndvi_stats)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 8: Write NDVI Metrics to Silver
# ────────────────────────────────────────────────────────────────────────────

(
    df_with_trend
    .withColumn("_computed_at", current_timestamp())
    .write
    .mode("overwrite")
    .option("overwriteSchema", "true")
    .saveAsTable(f"{silver_schema}.ndvi_metrics")
)

print(f"✅ Silver table: {silver_schema}.ndvi_metrics")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 9: Validation — NDVI Range Check
# ────────────────────────────────────────────────────────────────────────────
# All NDVI values must be in [-1, 1]. Due to the REVERSED formula,
# values for healthy fields will show as NEGATIVE (inverted).

df_check = spark.sql(f"""
    SELECT
        MIN(computed_ndvi) AS min_ndvi,
        MAX(computed_ndvi) AS max_ndvi,
        COUNT(*) AS total_records,
        SUM(CASE WHEN computed_ndvi < -1 OR computed_ndvi > 1 THEN 1 ELSE 0 END) AS out_of_range
    FROM {silver_schema}.ndvi_metrics
""")

display(df_check)
print("⚠️ NOTE: If min_ndvi is very negative, check the formula — NIR and Red may be swapped!")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: BROKEN — NDVI Formula Reversed
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   The NDVI formula computes (Red - NIR) / (Red + NIR) instead of the
#   correct (NIR - Red) / (NIR + Red). This inverts all NDVI values:
#   healthy crops show negative, bare soil shows positive.
#
# TO FIX:
#   Swap the subtraction order in the computed_ndvi expression:
#     (col("band_nir") - col("band_red"))
#     / (col("band_nir") + col("band_red"))
#
# DOMAIN KNOWLEDGE:
#   Healthy vegetation strongly reflects NIR and absorbs Red light.
#   So NIR > Red → NDVI > 0 for vegetation.
#   The reversed formula makes NIR > Red → NDVI < 0 (wrong!).
#
# CONCEPTS LEARNED:
#   1. NDVI formula and band arithmetic
#   2. greatest()/least() for value clamping
#   3. CASE WHEN for categorical classification
#   4. LAG() for time-series trend detection
#   5. Domain validation of computed metrics
#
# NEXT: Run 04_irrigation_efficiency.py for water use analysis
# ────────────────────────────────────────────────────────────────────────────
