# Databricks notebook source
# MAGIC %md
# MAGIC # Feature Store Setup
# MAGIC Register production metrics features for ML defect prediction

# COMMAND ----------
from databricks import feature_store
from pyspark.sql import functions as F

# COMMAND ----------
fs = feature_store.FeatureStoreClient()

# COMMAND ----------
# Read batch quality summary
batch_quality_df = spark.read.table("manufacturing_gold.batch_quality_summary")

# COMMAND ----------
# Read SPC metrics and aggregate by equipment
equipment_features_df = (
    spark.read.table("manufacturing_silver.spc_metrics")
    .groupBy("equipment_id")
    .agg(
        F.avg("rolling_mean").alias("avg_metric_value"),
        F.avg("rolling_stddev").alias("avg_metric_stddev"),
        F.sum(F.when(F.col("out_of_control"), 1).otherwise(0)).alias("total_spc_violations"),
        F.max("timestamp_parsed").alias("last_updated")
    )
)

# COMMAND ----------
# BROKEN: Feature Store registration missing required parameters
# Expected: Must specify primary_keys and timestamp_keys
# Current: Uses create_table without keys - causes lookup failures

# ❌ BROKEN: Missing primary_keys and timestamp_keys
fs.create_table(
    name="feature_store.production_metrics_features",
    df=batch_quality_df,
    description="Production batch quality metrics for defect prediction"
    # Missing: primary_keys=["batch_id"]
    # Missing: timestamp_keys=["production_timestamp"]
)

# COMMAND ----------
# MAGIC %md
# MAGIC ## Expected Fix
# MAGIC ```python
# MAGIC # Correct Feature Store registration with keys
# MAGIC fs.create_table(
# MAGIC     name="feature_store.production_metrics_features",
# MAGIC     primary_keys=["batch_id"],
# MAGIC     timestamp_keys=["end_time"],
# MAGIC     df=batch_quality_df,
# MAGIC     description="Production batch quality metrics for defect prediction"
# MAGIC )
# MAGIC 
# MAGIC # Register equipment features
# MAGIC fs.create_table(
# MAGIC     name="feature_store.equipment_health_features",
# MAGIC     primary_keys=["equipment_id"],
# MAGIC     timestamp_keys=["last_updated"],
# MAGIC     df=equipment_features_df,
# MAGIC     description="Equipment health metrics from SPC analysis"
# MAGIC )
# MAGIC ```
