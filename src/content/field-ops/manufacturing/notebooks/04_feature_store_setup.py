# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 04_feature_store_setup.py
# MISSION:  Manufacturing — Smart Factory Quality Platform
# STATUS:   BROKEN — Missing primary_keys in Feature Store registration
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Register production metrics as a Feature Store table for ML defect
#   prediction. The Feature Store enables:
#   - Point-in-time correct training data
#   - Feature sharing across teams
#   - Automated feature freshness monitoring
#
# WHAT YOU'LL LEARN:
#   ✅ Databricks Feature Store API (create_table, write_table)
#   ✅ Feature engineering for manufacturing ML
#   ✅ Primary keys and timestamp keys for point-in-time lookups
#   ✅ Delta Lake Time Travel (VERSION AS OF, TIMESTAMP AS OF)
#   ✅ Feature table vs regular Delta table
#
# ⚠️ KNOWN BUG:
#   The Feature Store create_table() call is missing the primary_keys
#   parameter, which is REQUIRED. Without it, the table cannot be
#   registered as a feature table.
#
# FEATURE STORE CONCEPTS:
#   - Primary Key: Uniquely identifies each feature row (e.g., batch_id)
#   - Timestamp Key: Enables point-in-time lookups for training data
#   - Offline Store: Delta table backing the features
#   - Online Store: Low-latency serving for real-time inference
#
# DOCUMENTATION:
#   - Feature Store: https://docs.databricks.com/en/machine-learning/feature-store/index.html
#   - Time Travel:   https://docs.databricks.com/en/delta/history.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = spark.conf.get("catalog_name", "main")
schema_prefix = spark.conf.get("schema_prefix", "dbsword_manufacturing")

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
silver_schema = f"{catalog}.{schema_prefix}_silver"
gold_schema   = f"{catalog}.{schema_prefix}_gold"

feature_table_name = f"{catalog}.{schema_prefix}_gold.production_metrics_features"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Build Feature DataFrame
# ────────────────────────────────────────────────────────────────────────────
# Combine batch, sensor, and quality data into a feature-rich table
# for ML defect prediction.

from pyspark.sql.functions import (
    col, avg, stddev, count, sum as spark_sum, when,
    round as spark_round, to_timestamp, current_timestamp,
    max as spark_max, min as spark_min, lit
)

# Load source tables
df_batches = spark.read.table(f"{bronze_schema}.raw_production_batches")
df_sensors = spark.read.table(f"{silver_schema}.validated_sensor_readings")
df_quality = spark.read.table(f"{gold_schema}.batch_quality_summary")

# Aggregate sensor features per batch
df_sensor_features = (
    df_sensors
    .groupBy("batch_id")
    .pivot("sensor_type")
    .agg(
        spark_round(avg("value"), 4).alias("mean"),
        spark_round(stddev("value"), 4).alias("std"),
        spark_round(spark_max("value"), 4).alias("max"),
        spark_round(spark_min("value"), 4).alias("min"),
    )
)

print(f"📊 Sensor features: {df_sensor_features.count()} batches")
print(f"📊 Feature columns: {len(df_sensor_features.columns)}")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2: Build Final Feature Table
# ────────────────────────────────────────────────────────────────────────────

df_features = (
    df_batches
    .select("batch_id", "product_line", "product_type",
            "start_time", "produced_qty", "defect_qty")
    .join(df_sensor_features, "batch_id", "inner")
    .join(
        df_quality.select("batch_id", "defect_rate", "quality_grade",
                         "inspection_count", "spc_violations"),
        "batch_id", "left"
    )
    .withColumn("production_timestamp", col("start_time"))
    .withColumn("is_defective", when(col("defect_rate") > 3.0, 1).otherwise(0))
    .withColumn("_feature_created_at", current_timestamp())
    .drop("start_time")
)

print(f"📊 Feature table shape: {df_features.count()} rows × {len(df_features.columns)} cols")
df_features.show(5, truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Register with Feature Store (⚠️ BUG: Missing primary_keys)
# ────────────────────────────────────────────────────────────────────────────
# The Feature Store requires primary_keys to uniquely identify rows
# and optional timestamp_keys for point-in-time feature lookups.
#
# ⚠️ BUG: primary_keys parameter is missing from create_table()!
# Without primary_keys, the table CANNOT be registered as a feature table.

from databricks.feature_engineering import FeatureEngineeringClient

fe = FeatureEngineeringClient()

# ⚠️ BUG: Missing primary_keys and timestamp_keys parameters!
# This call will fail because primary_keys is REQUIRED.
try:
    fe.create_table(
        name=feature_table_name,
        # primary_keys=["batch_id"],                       # ⚠️ MISSING!
        # timestamp_keys=["production_timestamp"],          # ⚠️ MISSING!
        df=df_features,
        description="Production metrics features for defect prediction ML model",
    )
    print(f"✅ Feature table created: {feature_table_name}")
except Exception as e:
    print(f"❌ Feature table creation failed: {e}")
    print("   HINT: primary_keys parameter is required!")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: Write Features (for updates after initial registration)
# ────────────────────────────────────────────────────────────────────────────
# After the table is created, use write_table() for incremental updates.

# fe.write_table(
#     name=feature_table_name,
#     df=df_features,
#     mode="merge",   # Upsert based on primary_keys
# )

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: Delta Time Travel — Point-in-Time Feature Lookup
# ────────────────────────────────────────────────────────────────────────────
# Delta Lake Time Travel allows querying historical versions of the table.
# This is critical for ML: training data must reflect the features
# AS THEY WERE at the time of the event, not the current values.

# Version-based time travel
# df_v0 = spark.read.format("delta").option("versionAsOf", 0).table(feature_table_name)

# Timestamp-based time travel
# df_yesterday = spark.read.format("delta").option("timestampAsOf", "2026-01-15").table(feature_table_name)

# SQL equivalent:
# SELECT * FROM {feature_table_name} VERSION AS OF 0
# SELECT * FROM {feature_table_name} TIMESTAMP AS OF '2026-01-15'

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 6: Feature Lookup for Training Data
# ────────────────────────────────────────────────────────────────────────────
# When building an ML training dataset, use FeatureLookup to automatically
# join features with labels by primary key.

# from databricks.feature_engineering import FeatureLookup
#
# training_labels = spark.read.table(f"{gold_schema}.batch_quality_summary") \
#     .select("batch_id", "quality_grade")
#
# training_set = fe.create_training_set(
#     df=training_labels,
#     feature_lookups=[
#         FeatureLookup(
#             table_name=feature_table_name,
#             lookup_key=["batch_id"],
#             timestamp_lookup_key="production_timestamp",
#         )
#     ],
#     label="quality_grade",
# )
#
# df_training = training_set.load_df()
# display(df_training.limit(10))

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 7: Validation
# ────────────────────────────────────────────────────────────────────────────

try:
    count = spark.read.table(feature_table_name).count()
    print(f"{'✅' if count > 0 else '❌'} Feature table has {count} rows")
except Exception as e:
    print(f"❌ Feature table not accessible: {e}")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: BROKEN — Missing primary_keys
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   fe.create_table() is missing the required primary_keys parameter.
#   Cannot register as a feature table without a primary key.
#
# TO FIX:
#   Add primary_keys and timestamp_keys to the create_table() call:
#     fe.create_table(
#         name=feature_table_name,
#         primary_keys=["batch_id"],                     # ← ADD THIS
#         timestamp_keys=["production_timestamp"],        # ← ADD THIS
#         df=df_features,
#         description="...",
#     )
#
# CONCEPTS LEARNED:
#   1. Databricks Feature Store: create_table, write_table
#   2. Primary keys for unique row identification
#   3. Timestamp keys for point-in-time lookups
#   4. Delta Time Travel: VERSION AS OF, TIMESTAMP AS OF
#   5. FeatureLookup for ML training set creation
#   6. pivot() for wide feature engineering
#
# MISSION COMPLETE when Feature Store validation passes! 🏆
# ────────────────────────────────────────────────────────────────────────────
