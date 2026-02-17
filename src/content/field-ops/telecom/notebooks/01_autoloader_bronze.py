# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 01_autoloader_bronze.py
# MISSION:  Telecom — Network Operations Analytics Platform
# STATUS:   PARTIAL — Auto Loader missing schemaEvolutionMode
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Implement Auto Loader ingestion for cell tower telemetry data.
#   Auto Loader incrementally processes new files as they arrive — ideal
#   for high-volume telecom data (2TB/day).
#
# WHAT YOU'LL LEARN:
#   ✅ Auto Loader (cloudFiles) for streaming file ingestion
#   ✅ Schema evolution with cloudFiles.schemaEvolutionMode
#   ✅ Schema inference vs explicit schema
#   ✅ Checkpoint-based incremental processing
#   ✅ partitionBy() for query performance (partition pruning)
#   ✅ Reference table loading (topology, complaints, weather)
#
# ⚠️ KNOWN BUG:
#   Schema evolution is NOT enabled. When new columns are added to
#   the JSON files (e.g., new sensors), Auto Loader silently drops them.
#   FIX: Add cloudFiles.schemaEvolutionMode = "addNewColumns"
#
# AUTO LOADER CONCEPTS:
#   - cloudFiles format: File-based streaming source
#   - Schema inference: Automatic schema detection on first load
#   - Schema evolution: Adapts to new columns in future files
#   - Checkpointing: Tracks which files have been processed
#   - Rescue data column: Captures data that doesn't match schema
#
# DOCUMENTATION:
#   - Auto Loader: https://docs.databricks.com/en/ingestion/auto-loader/index.html
#   - Schema Evolution: https://docs.databricks.com/en/ingestion/auto-loader/schema.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
volume_path   = f"/Volumes/{catalog}/{schema_prefix}_bronze/raw_data"
checkpoint_path = f"/Volumes/{catalog}/{schema_prefix}_bronze/_checkpoints"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Auto Loader — Streaming JSON Ingestion
# ────────────────────────────────────────────────────────────────────────────
# Auto Loader uses the cloudFiles format to incrementally process files.
# Unlike spark.read.json(), it only processes NEW files since the last run.
#
# ⚠️ BUG: cloudFiles.schemaEvolutionMode is NOT set!
# When the telemetry team adds new sensor fields to the JSON,
# Auto Loader will silently ignore them.

from pyspark.sql.functions import col, to_timestamp, current_timestamp, to_date

df_stream = (
    spark.readStream
    .format("cloudFiles")
    .option("cloudFiles.format", "json")
    .option("cloudFiles.inferColumnTypes", "true")
    .option("cloudFiles.schemaLocation", f"{checkpoint_path}/schema")
    # ⚠️ BUG: Missing schema evolution!
    # .option("cloudFiles.schemaEvolutionMode", "addNewColumns")  ← ADD THIS!
    .option("cloudFiles.rescuedDataColumn", "_rescued_data")
    .load(f"{volume_path}/cell_tower_metrics.json")
)

# Parse timestamps and add partition column
df_enriched = (
    df_stream
    .withColumn("event_ts",
        to_timestamp(col("timestamp"), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
    )
    .withColumn("date", to_date(col("event_ts")))  # For partitioning
    .withColumn("_ingested_at", current_timestamp())
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2: Write Bronze Streaming Table (with partitioning)
# ────────────────────────────────────────────────────────────────────────────
# Partition by date for efficient time-range queries.
# Without partitioning, every query scans ALL data (30+ second dashboards).

(
    df_enriched
    .writeStream
    .format("delta")
    .option("checkpointLocation", f"{checkpoint_path}/cell_tower_metrics")
    .option("mergeSchema", "true")
    .outputMode("append")
    .partitionBy("date")
    .trigger(availableNow=True)  # Process all available files, then stop
    .toTable(f"{bronze_schema}.cell_tower_metrics")
)

print(f"✅ Auto Loader stream started → {bronze_schema}.cell_tower_metrics")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: SQL Alternative — read_files() for Batch Ingestion
# ────────────────────────────────────────────────────────────────────────────
# For one-time batch loads, read_files() is simpler than Auto Loader.
# Use Auto Loader when files arrive continuously; read_files() for ad-hoc.

# ⚡ SQL APPROACH: Implement the correct SQL query yourself!
# No SQL hints are provided for this operation.
# Use the WHAT'S BROKEN section at the bottom and Databricks SQL docs for guidance.

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: Ingest Reference Tables
# ────────────────────────────────────────────────────────────────────────────

# --- Network Topology ---
df_topology = (
    spark.read.option("header", "true").option("inferSchema", "true")
    .csv(f"{volume_path}/network_topology.csv")
    .withColumn("_ingested_at", current_timestamp())
)
df_topology.write.mode("overwrite").saveAsTable(f"{bronze_schema}.network_topology")
print(f"✅ Topology: {df_topology.count()} towers → {bronze_schema}.network_topology")

# --- Customer Complaints ---
df_complaints = (
    spark.read.option("header", "true").option("inferSchema", "true")
    .csv(f"{volume_path}/customer_complaints.csv")
    .withColumn("created_at",
        to_timestamp(col("created_at"), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
    )
    .withColumn("_ingested_at", current_timestamp())
)
df_complaints.write.mode("overwrite").saveAsTable(f"{bronze_schema}.customer_complaints")
print(f"✅ Complaints: {df_complaints.count()} → {bronze_schema}.customer_complaints")

# --- Weather Data ---
df_weather = (
    spark.read.option("header", "true").option("inferSchema", "true")
    .csv(f"{volume_path}/weather_data.csv")
    .withColumn("timestamp",
        to_timestamp(col("timestamp"), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
    )
    .withColumn("_ingested_at", current_timestamp())
)
df_weather.write.mode("overwrite").saveAsTable(f"{bronze_schema}.weather_data")
print(f"✅ Weather: {df_weather.count()} → {bronze_schema}.weather_data")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: Verify Auto Loader + Data Quality
# ────────────────────────────────────────────────────────────────────────────

display(spark.sql(f"""
    SELECT
        COUNT(*) AS total_metrics,
        COUNT(DISTINCT tower_id) AS unique_towers,
        COUNT(DISTINCT date) AS date_partitions,
        SUM(CASE WHEN event_ts IS NULL THEN 1 ELSE 0 END) AS null_timestamps,
        SUM(CASE WHEN _rescued_data IS NOT NULL THEN 1 ELSE 0 END) AS rescued_rows,
        MIN(event_ts) AS earliest_metric,
        MAX(event_ts) AS latest_metric
    FROM {bronze_schema}.cell_tower_metrics
"""))

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: PARTIAL — Schema Evolution Missing
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S MISSING:
#   cloudFiles.schemaEvolutionMode is not set. When new sensor fields
#   appear in future JSON files, they'll be silently dropped.
#
# TO FIX:
#   Add this option to the readStream:
#     .option("cloudFiles.schemaEvolutionMode", "addNewColumns")
#
# SCHEMA EVOLUTION MODES:
#   "addNewColumns" — Auto-add new fields (recommended for telemetry)
#   "rescue"        — Put unknown fields in _rescued_data column
#   "failOnNewColumns" — Fail the stream on unexpected columns
#   "none"          — Silently drop unknown columns (current behavior)
#
# CONCEPTS LEARNED:
#   1. Auto Loader (cloudFiles) for streaming file ingestion
#   2. Schema evolution for adapting to new data fields
#   3. _rescued_data column for capturing unknown fields
#   4. partitionBy("date") for time-range query optimization
#   5. trigger(availableNow=True) for batch-like one-time processing
#
# NEXT: Run 02_network_kpis_silver.py for KPI calculations
# ────────────────────────────────────────────────────────────────────────────
