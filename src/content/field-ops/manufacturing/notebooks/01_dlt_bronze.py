# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 01_dlt_bronze.py
# MISSION:  Manufacturing — Smart Factory Quality Platform
# STATUS:   BROKEN — DLT @dlt.expect_or_fail should be @dlt.expect_or_drop
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Implement Delta Live Tables (DLT) bronze ingestion pipeline for
#   semiconductor manufacturing sensor data. This notebook is designed
#   to run as a DLT pipeline, NOT as an interactive notebook.
#
# WHAT YOU'LL LEARN:
#   ✅ DLT pipeline basics: @dlt.table, @dlt.view, dlt.read_stream
#   ✅ DLT expectations for data quality (@dlt.expect, @dlt.expect_or_drop)
#   ✅ Auto Loader with cloudFiles for streaming ingestion
#   ✅ Schema hints for JSON parsing
#   ✅ DLT vs traditional batch — declarative pipelines
#
# ⚠️ KNOWN BUG:
#   @dlt.expect_or_fail causes the ENTIRE pipeline to abort when a single
#   bad record is found. For sensor data with occasional corrupt readings,
#   @dlt.expect_or_drop is the correct strategy — drop bad rows, not fail.
#
# DLT CONCEPTS:
#   @dlt.table()         — Defines a materialized Delta table in the pipeline
#   @dlt.view()          — Defines a virtual view (not materialized)
#   @dlt.expect()        — Soft check: log violations, keep rows
#   @dlt.expect_or_drop() — Medium: drop violating rows
#   @dlt.expect_or_fail() — Hard: abort pipeline on violation
#
# DOCUMENTATION:
#   - DLT Python: https://docs.databricks.com/en/delta-live-tables/python-ref.html
#   - Expectations: https://docs.databricks.com/en/delta-live-tables/expectations.html
#   - Auto Loader: https://docs.databricks.com/en/ingestion/auto-loader/index.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# DLT Pipeline Configuration
# ────────────────────────────────────────────────────────────────────────────
# NOTE: This notebook runs inside a DLT pipeline. The `dlt` module is
# pre-loaded. spark is also pre-loaded. Do NOT import pyspark.sql.SparkSession.

import dlt
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
# ⚠️ BUG: @dlt.expect_or_fail will crash the pipeline on any NULL value.
# Manufacturing sensors frequently produce corrupt readings (1-2% of data).
# The correct strategy is @dlt.expect_or_drop — discard bad rows silently.

@dlt.table(
    name="raw_sensor_readings",
    comment="Raw sensor data from production line IoT devices",
    table_properties={"quality": "bronze"},
)
@dlt.expect_or_fail("valid_reading_id", "reading_id IS NOT NULL")  # ⚠️ BUG: should be @dlt.expect_or_drop
@dlt.expect_or_fail("valid_value", "value IS NOT NULL")            # ⚠️ BUG: should be @dlt.expect_or_drop
@dlt.expect_or_fail("valid_timestamp", "timestamp IS NOT NULL")    # ⚠️ BUG: should be @dlt.expect_or_drop
def raw_sensor_readings():
    """
    Ingest sensor readings using Auto Loader (cloudFiles).
    Each JSON line represents a single sensor reading with:
    reading_id, sensor_id, batch_id, sensor_type, timestamp, value, unit
    """
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

@dlt.table(
    name="raw_production_batches",
    comment="Production batch records from MES system",
    table_properties={"quality": "bronze"},
)
@dlt.expect("valid_batch_id", "batch_id IS NOT NULL")
@dlt.expect("positive_qty", "produced_qty >= 0")
def raw_production_batches():
    """Ingest production batch records."""
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

@dlt.table(
    name="raw_quality_inspections",
    comment="Quality inspection results from QC team",
    table_properties={"quality": "bronze"},
)
@dlt.expect("valid_inspection", "inspection_id IS NOT NULL")
def raw_quality_inspections():
    """Ingest quality inspection records."""
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

@dlt.table(
    name="raw_equipment_logs",
    comment="Equipment event logs from factory floor",
    table_properties={"quality": "bronze"},
)
@dlt.expect("valid_log", "log_id IS NOT NULL")
def raw_equipment_logs():
    """Ingest equipment event logs."""
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
# ✅ NOTEBOOK STATUS: BROKEN — Wrong DLT Expectation Strategy
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   @dlt.expect_or_fail on raw_sensor_readings causes the entire pipeline
#   to abort when any single NULL reading appears. Sensor data ALWAYS has
#   some corrupt readings (1-2%).
#
# TO FIX:
#   Change the three @dlt.expect_or_fail decorators to @dlt.expect_or_drop:
#     @dlt.expect_or_drop("valid_reading_id", "reading_id IS NOT NULL")
#     @dlt.expect_or_drop("valid_value", "value IS NOT NULL")
#     @dlt.expect_or_drop("valid_timestamp", "timestamp IS NOT NULL")
#
#   @dlt.expect_or_drop silently removes bad rows while keeping the
#   pipeline running. DLT tracks dropped row counts in the event log.
#
# DLT EXPECTATION STRATEGIES:
#   expect()           — Log violation, keep the row (for monitoring)
#   expect_or_drop()   — Log + drop the row (for cleaning)
#   expect_or_fail()   — Log + abort pipeline (for hard constraints)
#
# CONCEPTS LEARNED:
#   1. DLT pipeline definition with @dlt.table
#   2. Data quality expectations (@dlt.expect variants)
#   3. Auto Loader (cloudFiles) for streaming ingestion
#   4. Bronze layer = raw data + metadata + timestamp parsing
#   5. When to use fail vs drop vs soft expectations
# ────────────────────────────────────────────────────────────────────────────
