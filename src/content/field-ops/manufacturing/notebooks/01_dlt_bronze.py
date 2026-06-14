# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 01_dlt_bronze.py
# MISSION:  Manufacturing — Smart Factory Quality Platform
# STATUS:   BROKEN — dp.expect_or_fail should be dp.expect_or_drop
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Implement a Spark Declarative Pipelines (SDP, formerly Delta Live Tables)
#   bronze ingestion pipeline for semiconductor manufacturing sensor data.
#   This notebook is designed to run inside an SDP pipeline, NOT as an
#   interactive notebook.
#
# WHAT YOU'LL LEARN:
#   ✅ SDP pipeline basics: @dp.table, dp.read, dp.read_stream
#   ✅ SDP expectations for data quality (dp.expect, dp.expect_or_drop)
#   ✅ Auto Loader with cloudFiles for streaming ingestion
#   ✅ Schema hints for JSON parsing
#   ✅ SDP vs traditional batch — declarative pipelines
#
# ⚠️ KNOWN BUG:
#   dp.expect_or_fail causes the ENTIRE pipeline to abort when a single
#   bad record is found. For sensor data with occasional corrupt readings,
#   dp.expect_or_drop is the correct strategy — drop bad rows, not fail.
#
# SDP CONCEPTS:
#   @dp.table()               — Defines a materialized Delta table in the pipeline
#   dp.expect(name, expr)     — Soft check: log violations, keep rows
#   dp.expect_or_drop(name, expr) — Medium: drop violating rows
#   dp.expect_or_fail(name, expr) — Hard: abort pipeline on violation
#
# DOCUMENTATION:
#   - SDP Python: https://docs.databricks.com/en/dlt/python-ref.html
#   - Expectations: https://docs.databricks.com/en/dlt/expectations.html
#   - Auto Loader: https://docs.databricks.com/en/ingestion/auto-loader/index.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SDP Pipeline Configuration
# ────────────────────────────────────────────────────────────────────────────
# NOTE: This notebook runs inside an SDP pipeline. The `dp` module is
# imported below. spark is pre-loaded. Do NOT import pyspark.sql.SparkSession.

from pyspark import pipelines as dp
from pyspark.sql.functions import (
    col, to_timestamp, current_timestamp, input_file_name, expr
)

catalog = spark.conf.get("catalog_name", "main")
schema_prefix = spark.conf.get("schema_prefix", "dbsword_manufacturing")
volume_path = f"/Volumes/{catalog}/{schema_prefix}_bronze/raw_data"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# BRONZE TABLE 1: Raw Sensor Readings (Streaming with Auto Loader)
# ────────────────────────────────────────────────────────────────────────────
# Auto Loader (cloudFiles) incrementally ingests new files as they arrive.
# Schema is inferred on first read and evolves automatically.
#
# ⚠️ BUG: dp.expect_or_fail will crash the pipeline on any NULL value.
# Manufacturing sensors frequently produce corrupt readings (1-2% of data).
# The correct strategy is dp.expect_or_drop — discard bad rows silently.

@dp.table(
    name="raw_sensor_readings",
    comment="Raw sensor data from production line IoT devices",
    table_properties={"quality": "bronze"},
)
def raw_sensor_readings():
    """
    Ingest sensor readings using Auto Loader (cloudFiles).
    Each JSON line represents a single sensor reading with:
    reading_id, sensor_id, batch_id, sensor_type, timestamp, value, unit
    """
    # ⚠️ BUG: should be dp.expect_or_drop (currently dp.expect_or_fail)
    dp.expect_or_fail("valid_reading_id", col("reading_id").isNotNull())
    dp.expect_or_fail("valid_value", col("value").isNotNull())
    dp.expect_or_fail("valid_timestamp", col("timestamp").isNotNull())
    return (
        spark.readStream
        .format("cloudFiles")
        .option("cloudFiles.format", "json")
        .option("cloudFiles.inferColumnTypes", "true")
        .option("cloudFiles.schemaLocation", f"{volume_path}/_schema/sensors")
        .load(f"{volume_path}/sensor_readings.json")
        .withColumn("timestamp_parsed",
            to_timestamp(col("timestamp"), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
        )
        .withColumn("_ingested_at", current_timestamp())
        .withColumn("_source_file", input_file_name())
    )

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# BRONZE TABLE 2: Production Batches
# ────────────────────────────────────────────────────────────────────────────

@dp.table(
    name="raw_production_batches",
    comment="Production batch records from MES system",
    table_properties={"quality": "bronze"},
)
def raw_production_batches():
    """Ingest production batch records."""
    dp.expect("valid_batch_id", col("batch_id").isNotNull())
    dp.expect("positive_qty", col("produced_qty") >= 0)
    return (
        spark.read
        .option("header", "true")
        .option("inferSchema", "true")
        .csv(f"{volume_path}/production_batches.csv")
        .withColumn("start_time",
            to_timestamp(col("start_time"), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
        )
        .withColumn("end_time",
            to_timestamp(col("end_time"), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
        )
        .withColumn("_ingested_at", current_timestamp())
    )

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# BRONZE TABLE 3: Quality Inspections
# ────────────────────────────────────────────────────────────────────────────

@dp.table(
    name="raw_quality_inspections",
    comment="Quality inspection results from QC team",
    table_properties={"quality": "bronze"},
)
def raw_quality_inspections():
    """Ingest quality inspection records."""
    dp.expect("valid_inspection", col("inspection_id").isNotNull())
    return (
        spark.read
        .option("header", "true")
        .option("inferSchema", "true")
        .csv(f"{volume_path}/quality_inspections.csv")
        .withColumn("inspection_time",
            to_timestamp(col("inspection_time"), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
        )
        .withColumn("_ingested_at", current_timestamp())
    )

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# BRONZE TABLE 4: Equipment Logs
# ────────────────────────────────────────────────────────────────────────────

@dp.table(
    name="raw_equipment_logs",
    comment="Equipment event logs from factory floor",
    table_properties={"quality": "bronze"},
)
def raw_equipment_logs():
    """Ingest equipment event logs."""
    dp.expect("valid_log", col("log_id").isNotNull())
    return (
        spark.read
        .option("header", "true")
        .option("inferSchema", "true")
        .csv(f"{volume_path}/equipment_logs.csv")
        .withColumn("timestamp",
            to_timestamp(col("timestamp"), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
        )
        .withColumn("_ingested_at", current_timestamp())
    )

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: BROKEN — Wrong SDP Expectation Strategy
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   dp.expect_or_fail on raw_sensor_readings causes the entire pipeline
#   to abort when any single NULL reading appears. Sensor data ALWAYS has
#   some corrupt readings (1-2%).
#
# TO FIX:
#   Change the three dp.expect_or_fail calls to dp.expect_or_drop:
#     dp.expect_or_drop("valid_reading_id", col("reading_id").isNotNull())
#     dp.expect_or_drop("valid_value", col("value").isNotNull())
#     dp.expect_or_drop("valid_timestamp", col("timestamp").isNotNull())
#
#   dp.expect_or_drop silently removes bad rows while keeping the
#   pipeline running. SDP tracks dropped row counts in the event log.
#
# SDP EXPECTATION STRATEGIES:
#   dp.expect(name, expr)         — Log violation, keep the row (for monitoring)
#   dp.expect_or_drop(name, expr) — Log + drop the row (for cleaning)
#   dp.expect_or_fail(name, expr) — Log + abort pipeline (for hard constraints)
#
# CONCEPTS LEARNED:
#   1. SDP pipeline definition with @dp.table
#   2. Data quality expectations (dp.expect variants)
#   3. Auto Loader (cloudFiles) for streaming ingestion
#   4. Bronze layer = raw data + metadata + timestamp parsing
#   5. When to use fail vs drop vs soft expectations
# ────────────────────────────────────────────────────────────────────────────
