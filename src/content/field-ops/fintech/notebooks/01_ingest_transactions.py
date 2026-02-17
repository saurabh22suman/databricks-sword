# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 01_ingest_transactions.py
# MISSION:  FinTech — Fraud Detection Pipeline
# STATUS:   WORKING — Reference implementation
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Ingest raw transaction JSON data from Volumes into a Bronze Delta table
#   with proper schema enforcement and timestamp parsing.
#
# WHAT YOU'LL LEARN:
#   ✅ JSON ingestion with explicit schema (PySpark + SQL read_files())
#   ✅ Timestamp parsing with to_timestamp() and ISO-8601 formats
#   ✅ MERGE INTO for idempotent Bronze loads
#   ✅ Data quality checks on raw data
#   ✅ Ingestion metadata columns (_ingested_at, _source_file)
#
# INPUT:
#   - /Volumes/{catalog}/{schema_prefix}_bronze/raw_data/transactions.json
#   - /Volumes/{catalog}/{schema_prefix}_bronze/raw_data/accounts.csv
#   - /Volumes/{catalog}/{schema_prefix}_bronze/raw_data/merchants.csv
#   - /Volumes/{catalog}/{schema_prefix}_bronze/raw_data/fraud_labels.csv
#
# OUTPUT:
#   - {catalog}.{schema_prefix}_bronze.transactions
#   - {catalog}.{schema_prefix}_bronze.accounts
#   - {catalog}.{schema_prefix}_bronze.merchants
#   - {catalog}.{schema_prefix}_bronze.fraud_labels
#
# DOCUMENTATION:
#   - read_files():    https://docs.databricks.com/en/sql/language-manual/functions/read_files.html
#   - to_timestamp():  https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.to_timestamp.html
#   - MERGE INTO:      https://docs.databricks.com/en/sql/language-manual/delta-merge-into.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
volume_path   = f"/Volumes/{catalog}/{schema_prefix}_bronze/raw_data"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Ingest Transactions (JSON) — PySpark API
# ────────────────────────────────────────────────────────────────────────────
# Transaction data arrives as JSON Lines (one JSON object per line).
# We define an explicit schema rather than relying on inference —
# schema inference scans the entire file and is expensive at scale.

from pyspark.sql.types import (
    StructType, StructField, StringType, DoubleType, TimestampType
)
from pyspark.sql.functions import (
    col, to_timestamp, current_timestamp, input_file_name, lit, when,
    count, sum as spark_sum
)

txn_schema = StructType([
    StructField("transaction_id", StringType(), False),
    StructField("account_id", StringType(), False),
    StructField("merchant_id", StringType(), True),
    StructField("transaction_type", StringType(), True),
    StructField("amount", DoubleType(), True),
    StructField("currency", StringType(), True),
    StructField("timestamp", StringType(), True),       # Raw ISO-8601 string
    StructField("channel", StringType(), True),
    StructField("latitude", DoubleType(), True),
    StructField("longitude", DoubleType(), True),
    StructField("device_id", StringType(), True),
    StructField("ip_address", StringType(), True),
    StructField("status", StringType(), True),
])

df_txn_raw = (
    spark.read
    .schema(txn_schema)
    .json(f"{volume_path}/transactions.json")
)

print(f"📊 Raw transactions loaded: {df_txn_raw.count()}")
display(df_txn_raw.limit(5))

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2: Parse Timestamps
# ────────────────────────────────────────────────────────────────────────────
# The raw timestamp field is ISO-8601: "2026-01-12T02:35:42.396Z"
# We must parse this to a proper TimestampType for window functions
# and time-based queries later in the pipeline.

df_txn = (
    df_txn_raw
    .withColumn("event_ts", to_timestamp(col("timestamp"), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"))
    .withColumn("_ingested_at", current_timestamp())
    .withColumn("_source_file", input_file_name())
    .drop("timestamp")  # Drop the raw string, keep the parsed version
)

# Verify no nulls in parsed timestamp
null_ts = df_txn.filter(col("event_ts").isNull()).count()
print(f"{'✅' if null_ts == 0 else '⚠️'} Null timestamps after parsing: {null_ts}")

display(df_txn.select("transaction_id", "event_ts", "amount", "channel").limit(5))

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Write Bronze Transactions with MERGE INTO
# ────────────────────────────────────────────────────────────────────────────
# MERGE INTO ensures idempotent loads — if we re-run this notebook,
# existing transactions are updated rather than duplicated.

# First run: create the table
df_txn.write.mode("overwrite").saveAsTable(f"{bronze_schema}.transactions")

# For subsequent runs, you would use MERGE:
# from delta.tables import DeltaTable
#
# if DeltaTable.isDeltaTable(spark, f"{bronze_schema}.transactions"):
#     target = DeltaTable.forName(spark, f"{bronze_schema}.transactions")
#     (
#         target.alias("t")
#         .merge(df_txn.alias("s"), "t.transaction_id = s.transaction_id")
#         .whenMatchedUpdateAll()
#         .whenNotMatchedInsertAll()
#         .execute()
#     )

print(f"✅ Bronze table: {bronze_schema}.transactions")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: SQL Equivalent — read_files() TVF
# ────────────────────────────────────────────────────────────────────────────
# Databricks SQL users often prefer read_files() for ad-hoc ingestion.
# This is the SQL equivalent of Sections 1-3 above.

# ⚡ SQL APPROACH: Implement the correct SQL query yourself!
# No SQL hints are provided for this operation.
# Use the WHAT'S BROKEN section at the bottom and Databricks SQL docs for guidance.

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: Ingest Reference Tables (Accounts, Merchants, Fraud Labels)
# ────────────────────────────────────────────────────────────────────────────

# --- Accounts ---
df_accounts = (
    spark.read
    .option("header", "true")
    .option("inferSchema", "true")
    .csv(f"{volume_path}/accounts.csv")
    .withColumn("_ingested_at", current_timestamp())
)
df_accounts.write.mode("overwrite").saveAsTable(f"{bronze_schema}.accounts")
print(f"✅ Accounts: {df_accounts.count()} rows → {bronze_schema}.accounts")

# --- Merchants ---
df_merchants = (
    spark.read
    .option("header", "true")
    .option("inferSchema", "true")
    .csv(f"{volume_path}/merchants.csv")
    .withColumn("_ingested_at", current_timestamp())
)
df_merchants.write.mode("overwrite").saveAsTable(f"{bronze_schema}.merchants")
print(f"✅ Merchants: {df_merchants.count()} rows → {bronze_schema}.merchants")

# --- Fraud Labels (for model evaluation later) ---
df_labels = (
    spark.read
    .option("header", "true")
    .option("inferSchema", "true")
    .csv(f"{volume_path}/fraud_labels.csv")
    .withColumn("_ingested_at", current_timestamp())
)
df_labels.write.mode("overwrite").saveAsTable(f"{bronze_schema}.fraud_labels")
print(f"✅ Fraud Labels: {df_labels.count()} rows → {bronze_schema}.fraud_labels")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 6: Data Quality Summary
# ────────────────────────────────────────────────────────────────────────────

df_quality = spark.sql(f"""
    SELECT
        COUNT(*)                                     AS total_transactions,
        COUNT(DISTINCT account_id)                   AS unique_accounts,
        COUNT(DISTINCT merchant_id)                  AS unique_merchants,
        SUM(CASE WHEN amount < 0 THEN 1 ELSE 0 END) AS negative_amounts,
        SUM(CASE WHEN event_ts IS NULL THEN 1 ELSE 0 END) AS null_timestamps,
        MIN(event_ts) AS earliest_txn,
        MAX(event_ts) AS latest_txn
    FROM {bronze_schema}.transactions
""")

display(df_quality)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: WORKING — Reference Implementation
# ────────────────────────────────────────────────────────────────────────────
# WHAT WAS ACCOMPLISHED:
#   ✓ Ingested 20K transactions from JSON with explicit schema
#   ✓ Parsed ISO-8601 timestamps to TimestampType
#   ✓ Loaded accounts, merchants, and fraud labels to Bronze
#   ✓ Added ingestion metadata (_ingested_at, _source_file)
#
# CONCEPTS LEARNED:
#   1. spark.read.json() with explicit schema (faster than inference)
#   2. to_timestamp() for ISO-8601 date parsing
#   3. read_files() SQL TVF as an alternative to PySpark
#   4. MERGE INTO for idempotent loads
#   5. Data quality checks on ingested data
#
# NEXT: Run 02_feature_engineering.py to calculate velocity features
# ────────────────────────────────────────────────────────────────────────────
