# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 02_dlt_silver_spc.py
# MISSION:  Manufacturing — Smart Factory Quality Platform
# STATUS:   BROKEN — UCL/LCL use 2-sigma instead of 3-sigma
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Build a Silver DLT layer that calculates Statistical Process Control
#   (SPC) metrics for each sensor type per batch. Control limits tell
#   engineers when a process is drifting out of specification.
#
# WHAT YOU'LL LEARN:
#   ✅ SPC fundamentals: X-bar, UCL, LCL, sigma, process capability
#   ✅ DLT Silver layer: reading from Bronze DLT tables
#   ✅ Window aggregations in DLT
#   ✅ 3-sigma rule for control limits (99.73% coverage)
#   ✅ Pivot patterns for sensor type comparison
#
# ⚠️ KNOWN BUG:
#   Control limits use 2×σ instead of 3×σ:
#     UCL = mean + 2*stddev   ← WRONG (catches only 95.45%)
#     LCL = mean - 2*stddev   ← WRONG
#   Industry standard SPC uses 3-SIGMA:
#     UCL = mean + 3*stddev   ← CORRECT (catches 99.73%)
#     LCL = mean - 3*stddev   ← CORRECT
#
# SPC BACKGROUND:
#   Statistical Process Control uses control charts to monitor process
#   stability. A process is "in control" when all data points fall
#   within ±3σ of the mean. Points outside 3-sigma trigger alerts.
#
#   2-sigma: 95.45% — too many false positives (4.55% false alarm rate)
#   3-sigma: 99.73% — industry standard (0.27% false alarm rate)
#   6-sigma: 99.99966% — Six Sigma quality (3.4 DPMO)
#
# DOCUMENTATION:
#   - DLT Python: https://docs.databricks.com/en/delta-live-tables/python-ref.html
#   - stddev:     https://docs.databricks.com/en/sql/language-manual/functions/stddev.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

import dlt
from pyspark.sql.functions import (
    col, avg, stddev, min as spark_min, max as spark_max,
    count, round as spark_round, when, current_timestamp, lit
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SILVER TABLE 1: Validated Sensor Readings
# ────────────────────────────────────────────────────────────────────────────
# Read from Bronze DLT table, apply schema enforcement, and filter
# only readings with valid parsed timestamps.

@dlt.table(
    name="validated_sensor_readings",
    comment="Validated sensor readings with proper types and null filtering",
    table_properties={"quality": "silver"},
)
@dlt.expect_or_drop("has_timestamp", "timestamp_parsed IS NOT NULL")
@dlt.expect_or_drop("has_sensor_id", "sensor_id IS NOT NULL")
@dlt.expect_or_drop("positive_value", "value > 0")
def validated_sensor_readings():
    """Clean sensor readings — drop nulls and negative values."""
    return (
        dlt.read("raw_sensor_readings")
        .select(
            "reading_id",
            "sensor_id",
            "batch_id",
            "sensor_type",
            "timestamp_parsed",
            col("value").cast("double"),
            "unit",
            "_ingested_at",
        )
    )

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SILVER TABLE 2: SPC Metrics per Sensor Type per Batch
# ────────────────────────────────────────────────────────────────────────────
# Calculate control limits for each sensor_type within each batch.
#
# ⚠️ BUG: Uses 2×σ for control limits instead of 3×σ!
# This creates a 4.55% false alarm rate vs the standard 0.27%.

@dlt.table(
    name="spc_metrics",
    comment="Statistical Process Control metrics with UCL/LCL per sensor per batch",
    table_properties={"quality": "silver"},
)
def spc_metrics():
    """
    Calculate X-bar chart control limits for each sensor type per batch.

    Control Chart Formulas:
        Center Line (CL) = X̄ (mean of measurements)
        UCL = X̄ + 3σ (upper control limit — 3 sigma rule)
        LCL = X̄ - 3σ (lower control limit — 3 sigma rule)
    """
    return (
        dlt.read("validated_sensor_readings")
        .groupBy("batch_id", "sensor_type", "unit")
        .agg(
            count("*").alias("reading_count"),
            spark_round(avg("value"), 4).alias("mean_value"),
            spark_round(stddev("value"), 4).alias("std_value"),
            spark_round(spark_min("value"), 4).alias("min_value"),
            spark_round(spark_max("value"), 4).alias("max_value"),
        )
        .withColumn(
            "ucl",
            spark_round(col("mean_value") + 2 * col("std_value"), 4)  # ⚠️ BUG: 2σ, should be 3σ
        )
        .withColumn(
            "lcl",
            spark_round(col("mean_value") - 2 * col("std_value"), 4)  # ⚠️ BUG: 2σ, should be 3σ
        )
        .withColumn(
            "out_of_control_count",
            lit(0)  # Placeholder — would be calculated from individual readings
        )
        .withColumn("_calculated_at", current_timestamp())
    )

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SILVER TABLE 3: Sensor Anomalies (Points Outside Control Limits)
# ────────────────────────────────────────────────────────────────────────────
# Flag individual readings that fall outside the UCL/LCL boundaries.
# This is the core SPC "out of control" detection.

@dlt.table(
    name="sensor_anomalies",
    comment="Individual sensor readings that violate SPC control limits",
    table_properties={"quality": "silver"},
)
def sensor_anomalies():
    """Identify readings outside control limits by joining with SPC metrics."""
    df_readings = dlt.read("validated_sensor_readings")
    df_spc = dlt.read("spc_metrics")

    return (
        df_readings
        .join(
            df_spc.select("batch_id", "sensor_type", "ucl", "lcl", "mean_value"),
            on=["batch_id", "sensor_type"],
            how="inner"
        )
        .filter(
            (col("value") > col("ucl")) | (col("value") < col("lcl"))
        )
        .withColumn(
            "violation_type",
            when(col("value") > col("ucl"), "ABOVE_UCL")
            .otherwise("BELOW_LCL")
        )
        .withColumn(
            "deviation_from_mean",
            spark_round(col("value") - col("mean_value"), 4)
        )
        .withColumn("_detected_at", current_timestamp())
    )

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SQL Equivalent — SPC Metrics (Non-DLT)
# ────────────────────────────────────────────────────────────────────────────
# For interactive analysis, here's the equivalent SQL query:

# ⚡ SQL APPROACH: Implement the correct SQL query yourself!
# No SQL hints are provided for this operation.
# Use the WHAT'S BROKEN section at the bottom and Databricks SQL docs for guidance.

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: BROKEN — 2-Sigma Control Limits
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   UCL/LCL use 2×σ instead of the industry-standard 3×σ.
#   This means ~4.55% of readings are flagged as anomalies even when
#   the process is in-control — overwhelming operators with false alarms.
#
# TO FIX:
#   Change the multiplier from 2 to 3:
#     "ucl", col("mean_value") + 3 * col("std_value")
#     "lcl", col("mean_value") - 3 * col("std_value")
#
# SPC REFERENCE:
#   1-sigma: 68.27% coverage (31.73% false alarm rate)
#   2-sigma: 95.45% coverage (4.55% false alarm rate)  ← Current (wrong)
#   3-sigma: 99.73% coverage (0.27% false alarm rate)  ← Industry standard
#
# CONCEPTS LEARNED:
#   1. DLT Silver layer: reading from Bronze with dlt.read()
#   2. SPC X-bar chart: mean, UCL, LCL concepts
#   3. 3-sigma rule for control limits
#   4. DLT table chaining: Bronze → Silver → anomalies
#   5. groupBy aggregations with stddev()
# ────────────────────────────────────────────────────────────────────────────
