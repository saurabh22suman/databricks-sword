# Databricks notebook source
# MAGIC %md
# MAGIC # Auto Loader - Cell Tower Metrics Ingestion
# MAGIC Stream cell tower telemetry using Auto Loader with schema evolution

# COMMAND ----------
from pyspark.sql import functions as F

# COMMAND ----------
# BROKEN: Auto Loader schema evolution is disabled
# Expected: cloudFiles.schemaEvolutionMode = 'addNewColumns' for flexibility
# Current: No schema evolution - fails when new metrics are added

cell_tower_stream = (
    spark.readStream
    .format("cloudFiles")
    .option("cloudFiles.format", "json")
    .option("cloudFiles.schemaLocation", "/mnt/schemas/cell_tower_metrics")
    # ❌ MISSING: .option("cloudFiles.schemaEvolutionMode", "addNewColumns")
    .load("/mnt/field-ops/telecom/cell_tower_metrics/")
)

# COMMAND ----------
# Add processing timestamp
bronze_df = (
    cell_tower_stream
    .withColumn("ingest_timestamp", F.current_timestamp())
    .withColumn("date", F.to_date("timestamp"))
)

# COMMAND ----------
# BROKEN: Missing partitionBy for efficient queries
# Expected: Partition by date for time-based filtering
# Current: No partitioning - causes full table scans

(
    bronze_df.writeStream
    .format("delta")
    .outputMode("append")
    .option("checkpointLocation", "/mnt/checkpoints/telecom_bronze")
    # ❌ MISSING: .partitionBy("date")
    .trigger(processingTime="1 minute")
    .toTable("telecom_bronze.cell_tower_metrics")
)

# COMMAND ----------
# MAGIC %md
# MAGIC ## Expected Fix
# MAGIC ```python
# MAGIC # Enable schema evolution
# MAGIC .option("cloudFiles.schemaEvolutionMode", "addNewColumns")
# MAGIC 
# MAGIC # Add partitioning for query performance
# MAGIC .partitionBy("date")
# MAGIC ```
