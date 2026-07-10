# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 05_yield_prediction_features.py
# MISSION:  AgriTech — Precision Agriculture Data Platform
# STATUS:   BROKEN — Fixed 50°F GDD base instead of crop-specific
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Build a comprehensive feature table for crop yield prediction models.
#   Combine soil sensor data, weather history, NDVI metrics, and irrigation
#   efficiency into a single feature set. Register the features in the
#   Databricks Feature Store for model training and serving.
#
# WHAT YOU'LL LEARN:
#   ✅ Growing Degree Days (GDD) formula and crop-specific base temps
#   ✅ Feature engineering from multiple time-series sources
#   ✅ Feature Store API (FeatureEngineeringClient)
#   ✅ pivot() for creating wide feature tables
#   ✅ Domain-aware feature design for agriculture ML
#
# ⚠️ KNOWN BUG:
#   GDD (Growing Degree Days) uses a hardcoded base temperature of 50°F
#   for ALL crops. In reality, each crop has a different base:
#     Corn = 50°F, Wheat = 40°F, Soybeans = 50°F, Rice = 50°F
#   Using 50°F for wheat significantly underestimates heat accumulation,
#   producing incorrect GDD features and degrading model performance.
#
# GDD FORMULA:
#   GDD = max(0, ((T_max + T_min) / 2) - T_base)
#   Where T_base varies by crop species.
#
# DATA SOURCES:
#   - sensor_weather_enriched (Silver): soil + weather + satellite
#   - ndvi_metrics (Silver): vegetation indices
#   - irrigation_efficiency (Gold): water use metrics
#   - harvest_records (Bronze): actual yield outcomes
#   - fields (Bronze): field metadata + crop type
#
# OUTPUT:
#   - {catalog}.{schema_prefix}_gold.yield_prediction_features (12+ features)
#   - Feature Store table registered
#
# DOCUMENTATION:
#   - Feature Store: https://docs.databricks.com/en/machine-learning/feature-store/index.html
#   - GDD:          https://en.wikipedia.org/wiki/Growing_degree-day
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
silver_schema = f"{catalog}.{schema_prefix}_silver"
gold_schema   = f"{catalog}.{schema_prefix}_gold"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Load All Source Tables
# ────────────────────────────────────────────────────────────────────────────

from pyspark.sql.functions import (
    col, avg, sum as spark_sum, count, min as spark_min, max as spark_max,
    round as spark_round, when, lit, greatest, coalesce,
    current_timestamp, stddev, percentile_approx, broadcast
)
from pyspark.sql.window import Window

# Core tables
df_enriched = spark.read.table(f"{silver_schema}.sensor_weather_enriched")
df_ndvi = spark.read.table(f"{silver_schema}.ndvi_metrics")
df_efficiency = spark.read.table(f"{gold_schema}.irrigation_efficiency")
df_harvest = spark.read.table(f"{bronze_schema}.harvest_records")
df_fields = spark.read.table(f"{bronze_schema}.fields")

print(f"📊 Enriched:    {df_enriched.count()}")
print(f"📊 NDVI:        {df_ndvi.count()}")
print(f"📊 Efficiency:  {df_efficiency.count()}")
print(f"📊 Harvest:     {df_harvest.count()}")
print(f"📊 Fields:      {df_fields.count()}")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2: Feature 1-3 — Soil Sensor Aggregates
# ────────────────────────────────────────────────────────────────────────────
# Compute per-field soil statistics over the growing season.

df_soil_features = (
    df_enriched
    .groupBy("field_id")
    .agg(
        # Feature 1: Average soil moisture
        spark_round(avg("moisture_percent"), 2).alias("avg_soil_moisture"),
        # Feature 2: Soil moisture variability (std dev)
        spark_round(stddev("moisture_percent"), 2).alias("soil_moisture_std"),
        # Feature 3: Average pH level
        spark_round(avg("ph_level"), 2).alias("avg_ph_level"),
    )
)

df_soil_features.show(truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Feature 4-6 — Weather / GDD (⚠️ BUG: Fixed Base Temp!)
# ────────────────────────────────────────────────────────────────────────────
# GDD = max(0, ((T_max + T_min) / 2) - T_base)
#
# ⚠️ BUG: Uses a FIXED base temperature of 50°F for ALL crops!
# Wheat requires a 40°F base — using 50°F underestimates its GDD by
# ~10 degree-days per observation, leading to significant error.
#
# CORRECT base temperatures:
#   Corn     = 50°F (10°C)
#   Wheat    = 40°F (4.4°C)
#   Soybeans = 50°F (10°C)
#   Rice     = 50°F (10°C)

# First join field metadata to get crop_type
df_weather_with_crop = (
    df_enriched
    .join(
        broadcast(df_fields.select("field_id", "crop_type")),
        on="field_id",
        how="left"
    )
)

# ⚠️ BUG: Hardcoded base_temp = 50 for ALL crops
FIXED_BASE_TEMP_F = 50  # Should be crop-specific!

df_gdd = (
    df_weather_with_crop
    .withColumn("daily_gdd",
        greatest(
            lit(0),
            (col("weather_temp_max_c") * 9/5 + 32 + col("weather_temp_min_c") * 9/5 + 32) / 2
            - lit(FIXED_BASE_TEMP_F)  # ⚠️ BUG: Should use crop-specific base
        )
    )
)

# What the FIX should look like:
# .withColumn("base_temp_f",
#     when(col("crop_type") == "wheat", lit(40))
#     .when(col("crop_type") == "corn", lit(50))
#     .when(col("crop_type") == "soybeans", lit(50))
#     .when(col("crop_type") == "rice", lit(50))
#     .otherwise(lit(50))
# )
# .withColumn("daily_gdd",
#     greatest(lit(0),
#         (col("weather_temp_max_c") * 9/5 + 32 + col("weather_temp_min_c") * 9/5 + 32) / 2
#         - col("base_temp_f")
#     )
# )

df_weather_features = (
    df_gdd
    .groupBy("field_id")
    .agg(
        # Feature 4: Cumulative Growing Degree Days
        spark_round(spark_sum("daily_gdd"), 1).alias("cumulative_gdd"),
        # Feature 5: Average daily precipitation
        spark_round(avg("weather_precip_mm"), 2).alias("avg_daily_precip_mm"),
        # Feature 6: Total precipitation over season
        spark_round(spark_sum("weather_precip_mm"), 1).alias("total_precip_mm"),
    )
)

df_weather_features.show(truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: SQL GDD Calculation (Correct, Crop-Specific)
# ────────────────────────────────────────────────────────────────────────────

# ⚡ SQL APPROACH: Implement the correct SQL query yourself!
# No SQL hints are provided for this operation.
# Use the WHAT'S BROKEN section at the bottom and Databricks SQL docs for guidance.

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: Feature 7-9 — NDVI Vegetation Features
# ────────────────────────────────────────────────────────────────────────────

df_ndvi_features = (
    df_ndvi
    .groupBy("field_id")
    .agg(
        # Feature 7: Average NDVI over season
        spark_round(avg("computed_ndvi"), 4).alias("avg_ndvi"),
        # Feature 8: Peak NDVI (max vegetation health)
        spark_round(spark_max("computed_ndvi"), 4).alias("peak_ndvi"),
        # Feature 9: NDVI variability (coefficient of variation)
        spark_round(
            stddev("computed_ndvi") / avg("computed_ndvi"), 4
        ).alias("ndvi_cv"),
    )
)

df_ndvi_features.show(truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 6: Feature 10-12 — Irrigation & Field Features
# ────────────────────────────────────────────────────────────────────────────

# Feature 10: Water use efficiency (from Gold table)
df_irrigation_features = (
    df_efficiency
    .select(
        col("field_id"),
        col("water_use_efficiency").alias("wue"),              # Feature 10
        col("water_per_acre").alias("water_per_acre"),         # Feature 11
    )
)

# Feature 12: Field acreage (from reference)
df_field_features = (
    df_fields
    .select(
        col("field_id"),
        col("acreage"),             # Feature 12
        col("crop_type"),
        col("soil_type"),
    )
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 7: Assemble Feature Table (12 Features)
# ────────────────────────────────────────────────────────────────────────────
# Join all feature groups on field_id.

df_features = (
    df_field_features
    # Soil features
    .join(df_soil_features, on="field_id", how="left")
    # Weather features
    .join(df_weather_features, on="field_id", how="left")
    # NDVI features
    .join(df_ndvi_features, on="field_id", how="left")
    # Irrigation features
    .join(df_irrigation_features, on="field_id", how="left")
    # Add yield (target variable)
    .join(
        df_harvest.select("field_id", "yield_kg", "season", "quality_grade"),
        on="field_id",
        how="left"
    )
    # Fill NULLs with 0 for features (models can't handle NULLs)
    .fillna(0, subset=[
        "avg_soil_moisture", "soil_moisture_std", "avg_ph_level",
        "cumulative_gdd", "avg_daily_precip_mm", "total_precip_mm",
        "avg_ndvi", "peak_ndvi", "ndvi_cv",
        "wue", "water_per_acre",
    ])
    .withColumn("_feature_timestamp", current_timestamp())
)

print(f"📊 Feature table: {df_features.count()} rows, {len(df_features.columns)} columns")
df_features.show(20, truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 8: Write to Gold Table
# ────────────────────────────────────────────────────────────────────────────

(
    df_features
    .write
    .mode("overwrite")
    .option("overwriteSchema", "true")
    .saveAsTable(f"{gold_schema}.yield_prediction_features")
)

print(f"✅ Gold table: {gold_schema}.yield_prediction_features")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 9: Register in Feature Store
# ────────────────────────────────────────────────────────────────────────────
# The Feature Store enables feature reuse across models and online serving.

from databricks.feature_engineering import FeatureEngineeringClient

fe = FeatureEngineeringClient()

# Create or update the feature table
fe.create_table(
    name=f"{gold_schema}.yield_prediction_features_fs",
    primary_keys=["field_id"],
    timestamp_keys=["_feature_timestamp"],
    df=df_features.drop("yield_kg", "season", "quality_grade"),  # Exclude labels
    description="Yield prediction features: soil sensors, weather/GDD, NDVI, irrigation efficiency"
)

print("✅ Feature Store table registered")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 10: Validation — 12 Distinct Features
# ────────────────────────────────────────────────────────────────────────────

feature_cols = [
    "avg_soil_moisture",       # 1
    "soil_moisture_std",       # 2
    "avg_ph_level",            # 3
    "cumulative_gdd",          # 4
    "avg_daily_precip_mm",     # 5
    "total_precip_mm",         # 6
    "avg_ndvi",                # 7
    "peak_ndvi",               # 8
    "ndvi_cv",                 # 9
    "wue",                     # 10
    "water_per_acre",          # 11
    "acreage",                 # 12
]

print(f"📊 Feature count: {len(feature_cols)}")
assert len(feature_cols) >= 12, f"Need 12+ features, got {len(feature_cols)}"

# Check for any all-zero features (useless)
for fc in feature_cols:
    non_zero = df_features.filter(col(fc) != 0).count()
    total = df_features.count()
    pct = non_zero / total * 100 if total > 0 else 0
    status = "✅" if pct > 10 else "⚠️"
    print(f"  {status} {fc}: {pct:.0f}% non-zero")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 11: SQL Feature Summary
# ────────────────────────────────────────────────────────────────────────────

spark.sql(f"""
    SELECT
        crop_type,
        COUNT(*) AS field_count,
        ROUND(AVG(cumulative_gdd), 0) AS avg_gdd,
        ROUND(AVG(avg_ndvi), 3) AS avg_ndvi,
        ROUND(AVG(wue), 3) AS avg_wue,
        ROUND(AVG(yield_kg), 0) AS avg_yield_kg
    FROM {gold_schema}.yield_prediction_features
    GROUP BY crop_type
    ORDER BY avg_yield_kg DESC
""").show(truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: BROKEN — Fixed GDD Base Temperature
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   Growing Degree Days (GDD) uses a hardcoded base temperature of 50°F
#   for ALL crops. Wheat requires a 40°F base. This underestimates wheat
#   GDD by ~10 degree-days per observation, producing the wrong cumulative
#   GDD feature and degrading yield prediction accuracy for wheat fields.
#
# TO FIX:
#   Replace the fixed FIXED_BASE_TEMP_F = 50 with a crop-specific lookup:
#     .withColumn("base_temp_f",
#         when(col("crop_type") == "wheat", lit(40))
#         .otherwise(lit(50))
#     )
#   Then use col("base_temp_f") instead of lit(FIXED_BASE_TEMP_F).
#
# DOMAIN KNOWLEDGE — GDD BASE TEMPERATURES:
#   Corn:     50°F (10.0°C) — most common, often the default
#   Wheat:    40°F (4.4°C)  — winter wheat tolerates cold
#   Soybeans: 50°F (10.0°C)
#   Rice:     50°F (10.0°C)
#   Cotton:   60°F (15.6°C) — tropical crop, higher base
#
# FEATURES CREATED (12):
#   Soil:     avg_soil_moisture, soil_moisture_std, avg_ph_level
#   Weather:  cumulative_gdd, avg_daily_precip_mm, total_precip_mm
#   NDVI:     avg_ndvi, peak_ndvi, ndvi_cv
#   Water:    wue, water_per_acre
#   Field:    acreage
#
# CONCEPTS LEARNED:
#   1. GDD formula and crop-specific base temperatures
#   2. Multi-source feature assembly from Bronze/Silver/Gold
#   3. Feature Store API (FeatureEngineeringClient)
#   4. fillna() for ML-ready data (no NULLs)
#   5. Feature validation and quality checks
#
# MISSION COMPLETE: All 5 notebooks processed!
# ────────────────────────────────────────────────────────────────────────────
