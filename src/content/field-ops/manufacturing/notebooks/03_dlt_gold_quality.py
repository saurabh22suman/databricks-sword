# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 03_dlt_gold_quality.py
# MISSION:  Manufacturing — Smart Factory Quality Platform
# STATUS:   BROKEN — Defect rate division is missing
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Build a Gold DLT layer that aggregates batch quality metrics into a
#   summary table used by quality engineers and dashboards.
#   Key metric: defect_rate = (defect_qty / produced_qty) * 100
#
# WHAT YOU'LL LEARN:
#   ✅ DLT Gold layer: business-ready aggregations
#   ✅ Multi-source joins in DLT (batches + inspections + SPC)
#   ✅ KPI calculation: OEE, defect rate, yield
#   ✅ SQL CASE WHEN for categorical scoring
#   ✅ DLT expectations on derived metrics
#
# ⚠️ KNOWN BUG:
#   The defect_rate calculation is missing the division — it just uses
#   defect_qty directly as the percentage, which gives wildly wrong values.
#   defect_rate = defect_qty  ← WRONG (should be defect_qty/produced_qty * 100)
#
# MANUFACTURING KPIs:
#   Defect Rate = (defects / total produced) × 100
#   Yield = ((total produced - defects) / total produced) × 100
#   OEE = Availability × Performance × Quality
#
# DOCUMENTATION:
#   - DLT Python: https://docs.databricks.com/en/delta-live-tables/python-ref.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

import dlt
from pyspark.sql.functions import (
    col, avg, sum as spark_sum, count, round as spark_round,
    when, current_timestamp, lit, coalesce
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# GOLD TABLE 1: Batch Quality Summary
# ────────────────────────────────────────────────────────────────────────────
# Join production batches with inspection results to produce a single
# quality summary per batch.
#
# ⚠️ BUG: defect_rate = defect_qty (should be defect_qty/produced_qty * 100)

@dlt.table(
    name="batch_quality_summary",
    comment="Batch-level quality metrics: defect rate, yield, inspection results",
    table_properties={"quality": "gold"},
)
@dlt.expect("positive_defect_rate", "defect_rate >= 0")
@dlt.expect("rate_under_100", "defect_rate <= 100")
def batch_quality_summary():
    """
    Aggregate production and inspection data per batch.
    Expected defect rate: ~3.2% (industry baseline for this plant).
    """
    df_batches = dlt.read("raw_production_batches")

    # Aggregate inspections per batch
    df_inspections = (
        dlt.read("raw_quality_inspections")
        .groupBy("batch_id")
        .agg(
            count("*").alias("inspection_count"),
            spark_sum("defects_found").alias("total_inspection_defects"),
            spark_sum(when(col("passed") == "Y", 1).otherwise(0)).alias("passed_inspections"),
        )
    )

    # Get SPC anomaly counts per batch
    df_spc = (
        dlt.read("spc_metrics")
        .groupBy("batch_id")
        .agg(
            avg("mean_value").alias("avg_sensor_mean"),
            count(when(col("out_of_control_count") > 0, True)).alias("spc_violations"),
        )
    )

    return (
        df_batches
        .join(df_inspections, "batch_id", "left")
        .join(df_spc, "batch_id", "left")
        .withColumn(
            "defect_rate",
            # ⚠️ BUG: Missing division! This is just the raw count, not a percentage.
            spark_round(col("defect_qty").cast("double"), 2)           # ⚠️ WRONG!
            # FIX: spark_round((col("defect_qty") / col("produced_qty")) * 100, 2)
        )
        .withColumn(
            "yield_pct",
            spark_round(
                ((col("produced_qty") - col("defect_qty")) / col("produced_qty")) * 100,
                2
            )
        )
        .withColumn(
            "quality_grade",
            when(col("defect_rate") < 1.0, "A")
            .when(col("defect_rate") < 3.0, "B")
            .when(col("defect_rate") < 5.0, "C")
            .otherwise("D")
        )
        .withColumn("_calculated_at", current_timestamp())
        .select(
            "batch_id",
            "product_line",
            "product_type",
            "start_time",
            "end_time",
            "target_qty",
            "produced_qty",
            "defect_qty",
            "defect_rate",
            "yield_pct",
            "quality_grade",
            coalesce("inspection_count", lit(0)).alias("inspection_count"),
            coalesce("total_inspection_defects", lit(0)).alias("total_inspection_defects"),
            coalesce("passed_inspections", lit(0)).alias("passed_inspections"),
            coalesce("spc_violations", lit(0)).alias("spc_violations"),
            "_calculated_at",
        )
    )

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# GOLD TABLE 2: Product Line Summary
# ────────────────────────────────────────────────────────────────────────────
# Aggregate quality across all batches for each product line.
# Used for management dashboards and trend analysis.

@dlt.table(
    name="product_line_quality",
    comment="Quality metrics aggregated by product line",
    table_properties={"quality": "gold"},
)
def product_line_quality():
    """Per-line quality rollup for executive dashboards."""
    return (
        dlt.read("batch_quality_summary")
        .groupBy("product_line", "product_type")
        .agg(
            count("*").alias("total_batches"),
            spark_sum("produced_qty").alias("total_produced"),
            spark_sum("defect_qty").alias("total_defects"),
            spark_round(avg("defect_rate"), 2).alias("avg_defect_rate"),
            spark_round(avg("yield_pct"), 2).alias("avg_yield_pct"),
            spark_sum(when(col("quality_grade") == "A", 1).otherwise(0)).alias("grade_a_batches"),
            spark_sum(when(col("quality_grade") == "D", 1).otherwise(0)).alias("grade_d_batches"),
        )
        .withColumn("_calculated_at", current_timestamp())
    )

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SQL Equivalent — Non-DLT Batch Quality (for reference)
# ────────────────────────────────────────────────────────────────────────────

# ⚡ SQL APPROACH: Implement the correct SQL query yourself!
# No SQL hints are provided for this operation.
# Use the WHAT'S BROKEN section at the bottom and Databricks SQL docs for guidance.

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: BROKEN — Defect Rate Not Calculated
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   defect_rate = defect_qty (raw count, ranges 0-50+)
#   Should be: defect_rate = (defect_qty / produced_qty) * 100 (percentage)
#
#   Example: batch with 500 produced, 16 defects:
#     Current (wrong): defect_rate = 16
#     Correct:         defect_rate = 3.2%
#
# TO FIX:
#   Replace: spark_round(col("defect_qty").cast("double"), 2)
#   With:    spark_round((col("defect_qty") / col("produced_qty")) * 100, 2)
#
# This also fixes quality_grade — grades are based on defect_rate thresholds
# that assume percentages, not raw counts.
#
# CONCEPTS LEARNED:
#   1. DLT Gold layer: business-ready aggregations
#   2. Multi-table joins in DLT with dlt.read()
#   3. Manufacturing KPIs: defect rate, yield, quality grade
#   4. DLT expectations on derived columns
#   5. coalesce() for handling missing aggregations
# ────────────────────────────────────────────────────────────────────────────
