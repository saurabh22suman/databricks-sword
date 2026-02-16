# Databricks notebook source# Databricks notebook source









































# MAGIC ```# MAGIC @dlt.expect_or_drop("valid_sensor", "sensor_id IS NOT NULL")# MAGIC @dlt.expect_or_drop("valid_value", "value IS NOT NULL")# MAGIC @dlt.expect_or_drop("valid_timestamp", "timestamp IS NOT NULL")# MAGIC # Use @expect_or_drop to filter bad records without failing pipeline# MAGIC ```python# MAGIC ## Expected Fix# MAGIC %md# COMMAND ----------    )        .withColumn("timestamp_parsed", F.to_timestamp("timestamp"))        .withColumn("ingestion_timestamp", F.current_timestamp())        .load("/mnt/field-ops/manufacturing/sensors/")        .option("cloudFiles.schemaLocation", "/mnt/schemas/sensors")        .option("cloudFiles.format", "json")        .format("cloudFiles")        spark.readStream    return (def bronze_sensor_readings():@dlt.expect_or_fail("valid_value", "value IS NOT NULL")  # ❌ TOO STRICT@dlt.expect_or_fail("valid_timestamp", "timestamp IS NOT NULL")  # ❌ TOO STRICT)    comment="Raw sensor telemetry from production equipment"    name="bronze_sensor_readings",@dlt.table(# Current: Pipeline crashes on first constraint violation# Expected: Drop bad records, continue processing# This causes the entire pipeline to fail when bad records arrive# BROKEN: DLT expectation is too strict - using @expect_or_fail instead of @expect_or_drop# COMMAND ----------from pyspark.sql import functions as Fimport dlt# COMMAND ----------# MAGIC Ingest raw sensor data with DLT bronze pattern# MAGIC # DLT Bronze Layer - Manufacturing Sensors# MAGIC %md# MAGIC %md
# MAGIC # DLT Bronze Layer - Manufacturing Sensors
# MAGIC Ingest IoT sensor data streams into bronze layer with data quality expectations

# COMMAND ----------
import dlt
from pyspark.sql import functions as F

# COMMAND ----------
# MAGIC %md
# MAGIC ## Sensor Readings Stream

# COMMAND ----------
@dlt.table(
    name="bronze_sensor_readings",
    comment="Raw sensor telemetry from production lines"
)
# BROKEN: Using @expect_or_fail causes pipeline to fail on ANY bad record
# Should use @expect_or_drop to quarantine bad records instead
@dlt.expect_or_fail("valid_timestamp", "timestamp IS NOT NULL")  # ❌ TOO STRICT
@dlt.expect_or_fail("valid_sensor_id", "sensor_id IS NOT NULL")  # ❌ TOO STRICT
@dlt.expect_or_fail("valid_value", "value >= 0")  # ❌ TOO STRICT
def bronze_sensor_readings():
    return (
        spark.readStream
        .format("cloudFiles")
        .option("cloudFiles.format", "json")
        .option("cloudFiles.schemaLocation", "/mnt/checkpoints/schema/sensor_readings")
        .load("/mnt/field-ops/manufacturing/sensor_data/")
        .withColumn("ingest_timestamp", F.current_timestamp())
        .withColumn("timestamp_parsed", F.to_timestamp("timestamp", "yyyy-MM-dd'T'HH:mm:ss'Z'"))
    )

# COMMAND ----------
# MAGIC %md
# MAGIC ## Production Batches

# COMMAND ----------
@dlt.table(
    name="bronze_production_batches",
    comment="Production batch metadata"
)
def bronze_production_batches():
    return (
        spark.read
        .option("header", "true")
        .option("inferSchema", "true")
        .csv("/mnt/field-ops/manufacturing/production_batches.csv")
    )

# COMMAND ----------
# MAGIC %md
# MAGIC ## Quality Inspections

# COMMAND ----------
@dlt.table(
    name="bronze_quality_inspections",
    comment="Manual quality inspection results"
)
def bronze_quality_inspections():
    return (
        spark.read
        .option("header", "true")
        .option("inferSchema", "true")
        .csv("/mnt/field-ops/manufacturing/quality_inspections.csv")
    )

# COMMAND ----------
# MAGIC %md
# MAGIC ## Expected Fix
# MAGIC ```python
# MAGIC # Use @expect_or_drop to quarantine bad records, not fail entire pipeline
# MAGIC @dlt.expect_or_drop("valid_timestamp", "timestamp IS NOT NULL")
# MAGIC @dlt.expect_or_drop("valid_sensor_id", "sensor_id IS NOT NULL")
# MAGIC @dlt.expect_or_drop("valid_value", "value >= 0")
# MAGIC ```
