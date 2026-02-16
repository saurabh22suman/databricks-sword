# Databricks notebook source
# MAGIC %md
# MAGIC # DLT Gold Layer - Batch Quality Summary
# MAGIC Aggregate defect rates and quality metrics by production batch

# COMMAND ----------
import dlt
from pyspark.sql import functions as F

# COMMAND ----------
# Read production batches (static data)
@dlt.table(
    name="ref_production_batches",
    comment="Production batch metadata"
)
def ref_production_batches():
    return (
        spark.read
        .option("header", "true")
        .option("inferSchema", "true")
        .csv("/tmp/field_ops/data/production_batches.csv")
        .withColumn("start_time", F.to_timestamp("start_time"))
        .withColumn("end_time", F.to_timestamp("end_time"))
    )

# COMMAND ----------
# Read quality inspections
@dlt.table(
    name="ref_quality_inspections",
    comment="Quality inspection results"
)
def ref_quality_inspections():
    return (
        spark.read
        .option("header", "true")
        .option("inferSchema", "true")
        .csv("/tmp/field_ops/data/quality_inspections.csv")
        .withColumn("inspection_time", F.to_timestamp("inspection_time"))
    )

# COMMAND ----------
# BROKEN: Defect rate calculation is missing division - just sums defects
# Expected: (total_defects / total_units) to get rate
# Current: Only returns total_defects without calculating rate

@dlt.table(
    name="gold_batch_quality_summary",
    comment="Batch-level quality metrics and defect rates"
)
def gold_batch_quality_summary():
    # Aggregate defects by batch
    defects_by_batch = (
        dlt.read("ref_quality_inspections")
        .groupBy("batch_id")
        .agg(F.sum("defect_count").alias("total_defects"))
    )
    
    # Join with batch metadata
    # ❌ BROKEN: Missing defect rate calculation
    return (
        dlt.read("ref_production_batches")
        .join(defects_by_batch, "batch_id", "left")
        .select(
            "batch_id",
            "production_line",
            "total_units",
            F.coalesce("total_defects", F.lit(0)).alias("total_defects"),
            # Missing: .withColumn("defect_rate", F.col("total_defects") / F.col("total_units"))
        )
    )

# COMMAND ----------
# MAGIC %md
# MAGIC ## Expected Fix
# MAGIC ```python
# MAGIC # Add defect rate calculation
# MAGIC return (
# MAGIC     dlt.read("ref_production_batches")
# MAGIC     .join(defects_by_batch, "batch_id", "left")
# MAGIC     .withColumn("total_defects", F.coalesce("total_defects", F.lit(0)))
# MAGIC     .withColumn("defect_rate", F.col("total_defects") / F.col("total_units"))
# MAGIC     .select("batch_id", "production_line", "total_units", "total_defects", "defect_rate")
# MAGIC )
# MAGIC ```
