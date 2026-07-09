# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 01_ingest_events.py
# MISSION:  Gaming — Player Engagement Analytics
# STATUS:   WORKING (but creates duplicates on re-run — needs MERGE)
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Ingest raw player event stream (JSON) into Bronze Delta table.
#   The ingestion uses append mode, which creates duplicates on re-runs.
#   The player should add deduplication logic using MERGE INTO.
#
# WHAT YOU'LL LEARN:
#   ✅ Reading multi-line JSON with explicit schema
#   ✅ SQL: read_files() for JSON ingestion
#   ✅ Timestamp parsing (from epoch ms and ISO strings)
#   ✅ Why append mode causes duplicates and how MERGE fixes it
#   ✅ Delta Lake data dedup pattern with MERGE + dropDuplicates
#
# INPUT:
#   Volume: /Volumes/{catalog}/{schema_prefix}_bronze/raw_files/
#   Files:  player_events.json, players.csv, game_items.csv
#
# OUTPUT:
#   Tables: {catalog}.{schema_prefix}_bronze.player_events
#           {catalog}.{schema_prefix}_bronze.players
#           {catalog}.{schema_prefix}_bronze.game_items
#
# DOCUMENTATION:
#   - JSON data source:    https://docs.databricks.com/en/query/formats/json.html
#   - Delta MERGE dedup:   https://docs.databricks.com/en/delta/merge.html#data-deduplication-when-writing-into-delta-tables
#   - Timestamp functions: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.to_timestamp.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ────────────────────────────────────────────────────────────────────────────

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
silver_schema = f"{catalog}.{schema_prefix}_silver"
gold_schema   = f"{catalog}.{schema_prefix}_gold"

volume_path = f"/Volumes/{catalog}/{schema_prefix}_bronze/raw_files"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Explore the Raw JSON Data
# ────────────────────────────────────────────────────────────────────────────

print(dbutils.fs.ls(volume_path))

# COMMAND ----------

# Quick peek at raw JSON structure
raw_text = dbutils.fs.head(f"{volume_path}/player_events.json", 2000)
print(raw_text)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2A: Read JSON — PySpark DataFrame API
# ────────────────────────────────────────────────────────────────────────────
# JSON files can be single-line (one JSON object per line) or multi-line.
# Player events are typically newline-delimited JSON (NDJSON).

from pyspark.sql.types import (
    StructType, StructField, StringType, LongType, DoubleType, TimestampType
)

events_schema = StructType([
    StructField("event_id", StringType(), False),
    StructField("player_id", StringType(), False),
    StructField("event_type", StringType(), False),      # login, purchase, session_start, session_end, level_up
    StructField("event_timestamp", StringType(), True),   # ISO 8601 string
    StructField("session_id", StringType(), True),
    StructField("item_id", StringType(), True),
    StructField("amount", DoubleType(), True),            # Purchase amount
    StructField("currency", StringType(), True),
    StructField("platform", StringType(), True),          # ios, android, pc
    StructField("game_version", StringType(), True),
    StructField("level", LongType(), True),
])

df_events = (
    spark.read
    .format("json")
    .schema(events_schema)
    .load(f"{volume_path}/player_events.json")
)

print(f"✅ Loaded {df_events.count()} events via PySpark")
df_events.show(10, truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2B: Read JSON — SQL read_files() Approach
# ────────────────────────────────────────────────────────────────────────────

df_events_sql = spark.sql(f"""
    SELECT *
    FROM read_files(
        '{volume_path}/player_events.json',
        format => 'json'
    )
""")

print(f"✅ Loaded {df_events_sql.count()} events via SQL read_files()")
df_events_sql.show(5, truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Parse Timestamps and Add Metadata
# ────────────────────────────────────────────────────────────────────────────
# Always parse timestamp strings into proper TimestampType for time-based
# operations like windowing, ordering, and date arithmetic.

from pyspark.sql.functions import (
    to_timestamp, current_timestamp, input_file_name, col, to_date
)

df_events_parsed = (
    df_events
    .withColumn("event_ts", to_timestamp("event_timestamp"))  # Parse ISO 8601
    .withColumn("event_date", to_date("event_ts"))            # Extract date
    .withColumn("_ingested_at", current_timestamp())
    .withColumn("_source_file", input_file_name())
    .drop("event_timestamp")  # Drop raw string, keep parsed timestamp
)

df_events_parsed.show(10, truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: Write to Bronze with Dedup
# ────────────────────────────────────────────────────────────────────────────
# IMPORTANT: Using mode("append") naively creates duplicates when you
# re-run this notebook. Instead, use MERGE INTO with event_id as the key.

# First run: Create the table
(
    df_events_parsed
    .dropDuplicates(["event_id"])  # Dedup within the source batch
    .write
    .mode("overwrite")
    .option("overwriteSchema", "true")
    .saveAsTable(f"{bronze_schema}.player_events")
)

print(f"✅ Bronze player_events created: {df_events_parsed.count()} rows")

# COMMAND ----------

# For subsequent runs: Use MERGE for idempotent loading
spark.sql(f"""
    MERGE INTO {bronze_schema}.player_events AS target
    USING (
        SELECT DISTINCT *
        FROM read_files(
            '{volume_path}/player_events.json',
            format => 'json'
        )
    ) AS source
    ON target.event_id = source.event_id
    WHEN NOT MATCHED THEN INSERT *
""")

print("✅ MERGE complete — no duplicates even on re-runs")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: Ingest Supporting Data
# ────────────────────────────────────────────────────────────────────────────

# Players master data
df_players = (
    spark.read.format("csv")
    .option("header", "true")
    .option("inferSchema", "true")
    .load(f"{volume_path}/players.csv")
    .withColumn("_ingested_at", current_timestamp())
)
df_players.write.mode("overwrite").saveAsTable(f"{bronze_schema}.players")
print(f"✅ players: {df_players.count()} rows")

# Game items catalog
df_items = (
    spark.read.format("csv")
    .option("header", "true")
    .option("inferSchema", "true")
    .load(f"{volume_path}/game_items.csv")
    .withColumn("_ingested_at", current_timestamp())
)
df_items.write.mode("overwrite").saveAsTable(f"{bronze_schema}.game_items")
print(f"✅ game_items: {df_items.count()} rows")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 6: Verify Bronze Tables
# ────────────────────────────────────────────────────────────────────────────

# Check for duplicates in events
dup_check = spark.sql(f"""
    SELECT event_id, COUNT(*) as cnt
    FROM {bronze_schema}.player_events
    GROUP BY event_id
    HAVING cnt > 1
""")

dup_count = dup_check.count()
print(f"🔍 Duplicate event_ids: {dup_count}")
print(f"{'✅' if dup_count == 0 else '❌'} Deduplication {'working' if dup_count == 0 else 'FAILED'}")

# Event type distribution
spark.sql(f"""
    SELECT event_type, COUNT(*) as event_count
    FROM {bronze_schema}.player_events
    GROUP BY event_type
    ORDER BY event_count DESC
""").show(truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK COMPLETE — Bronze Layer Ready
# ────────────────────────────────────────────────────────────────────────────
# CONCEPTS LEARNED:
#   1. JSON ingestion with PySpark and SQL read_files()
#   2. Timestamp parsing with to_timestamp()
#   3. dropDuplicates() for in-batch dedup
#   4. MERGE INTO for cross-run idempotent ingestion
#   5. Delta Lake as Bronze storage with metadata columns
#
# NEXT → 02_session_metrics.py — Calculate session durations and metrics
# ────────────────────────────────────────────────────────────────────────────
