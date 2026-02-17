# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 02_feature_engineering.py
# MISSION:  FinTech — Fraud Detection Pipeline
# STATUS:   BROKEN — Window frame bug (rowsBetween vs rangeBetween)
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Calculate transaction velocity features for fraud detection:
#   - velocity_1h:  Number of transactions per account in the last 1 hour
#   - velocity_24h: Number of transactions per account in the last 24 hours
#   - velocity_7d:  Number of transactions per account in the last 7 days
#   - avg_amount_24h: Average transaction amount in the last 24 hours
#
# WHAT YOU'LL LEARN:
#   ✅ Window functions with time-based ranges (rangeBetween vs rowsBetween)
#   ✅ PySpark Window specification with seconds()
#   ✅ SQL RANGE BETWEEN INTERVAL for time windows
#   ✅ Feature engineering for fraud detection
#   ✅ Silver layer pattern — enrichment of Bronze
#
# ⚠️ KNOWN BUG:
#   The PySpark window uses `rowsBetween` instead of `rangeBetween`.
#   - rowsBetween: Counts by row position (wrong — not time-aware!)
#   - rangeBetween: Counts by actual time range (correct for velocity)
#
# INPUT:
#   - {catalog}.{schema_prefix}_bronze.transactions
#
# OUTPUT:
#   - {catalog}.{schema_prefix}_silver.transaction_features
#     + velocity_1h, velocity_24h, velocity_7d, avg_amount_24h
#
# DOCUMENTATION:
#   - Window:       https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.Window.html
#   - rangeBetween: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.Window.rangeBetween.html
#   - SQL RANGE:    https://docs.databricks.com/en/sql/language-manual/sql-ref-window-functions.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
silver_schema = f"{catalog}.{schema_prefix}_silver"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Load Bronze Transactions
# ────────────────────────────────────────────────────────────────────────────

df_txn = spark.read.table(f"{bronze_schema}.transactions")

print(f"📊 Bronze transactions: {df_txn.count()}")
display(df_txn.select("transaction_id", "account_id", "event_ts", "amount").limit(5))

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2: Define Window Specifications
# ────────────────────────────────────────────────────────────────────────────
# For time-based velocity features, we need to count transactions within
# a sliding time window for each account.
#
# ⚠️ BUG: We're using `rowsBetween` which counts by row number,
# NOT by actual time elapsed. Two transactions 1 second apart and
# two transactions 23 hours apart would be treated identically!
#
# The FIX is to use `rangeBetween` with seconds-based boundaries:
#   .rangeBetween(-3600, 0)    for 1 hour (3600 seconds)
#   .rangeBetween(-86400, 0)   for 24 hours (86400 seconds)
#   .rangeBetween(-604800, 0)  for 7 days (604800 seconds)

from pyspark.sql.window import Window
from pyspark.sql.functions import (
    col, count, avg, unix_timestamp, round as spark_round,
    current_timestamp
)

# Convert timestamp to seconds for range-based windowing
df_txn_ts = df_txn.withColumn("event_ts_seconds", unix_timestamp("event_ts"))

# ⚠️ BUG: rowsBetween counts ROWS, not TIME! This is wrong for velocity.
# FIX: Change rowsBetween to rangeBetween on all three windows.

window_1h = (
    Window
    .partitionBy("account_id")
    .orderBy("event_ts_seconds")
    .rowsBetween(-3600, 0)      # ⚠️ BUG: should be rangeBetween
)

window_24h = (
    Window
    .partitionBy("account_id")
    .orderBy("event_ts_seconds")
    .rowsBetween(-86400, 0)     # ⚠️ BUG: should be rangeBetween
)

window_7d = (
    Window
    .partitionBy("account_id")
    .orderBy("event_ts_seconds")
    .rowsBetween(-604800, 0)    # ⚠️ BUG: should be rangeBetween
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Calculate Velocity Features (PySpark)
# ────────────────────────────────────────────────────────────────────────────

df_features = (
    df_txn_ts
    .withColumn("velocity_1h", count("*").over(window_1h))
    .withColumn("velocity_24h", count("*").over(window_24h))
    .withColumn("velocity_7d", count("*").over(window_7d))
    .withColumn("avg_amount_24h", spark_round(avg("amount").over(window_24h), 2))
    .withColumn("_enriched_at", current_timestamp())
    .drop("event_ts_seconds")  # Drop helper column
)

# Preview features for a single account
sample_account = df_features.select("account_id").first()["account_id"]
display(
    df_features
    .filter(col("account_id") == sample_account)
    .select("transaction_id", "event_ts", "amount",
            "velocity_1h", "velocity_24h", "velocity_7d", "avg_amount_24h")
    .orderBy("event_ts")
    .limit(10)
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: SQL Equivalent — Window with RANGE BETWEEN
# ────────────────────────────────────────────────────────────────────────────
# SQL syntax for time-based windows is more readable using INTERVAL.
# NOTE: This SQL version uses RANGE BETWEEN correctly — compare it to
# the PySpark version above to spot the bug!

# ⚡ SQL APPROACH: Implement the correct SQL query yourself!
# No SQL hints are provided for this operation.
# Use the WHAT'S BROKEN section at the bottom and Databricks SQL docs for guidance.

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: Enrich with Account Risk Score
# ────────────────────────────────────────────────────────────────────────────
# Join the velocity features with account-level risk scores to add
# context for downstream fraud rules.

from pyspark.sql.functions import broadcast

df_accounts = spark.read.table(f"{bronze_schema}.accounts")

df_enriched = (
    df_features
    .join(
        broadcast(df_accounts.select("account_id", "account_type", "risk_score")),
        on="account_id",
        how="left"
    )
)

print(f"📊 Enriched features: {df_enriched.count()} rows")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 6: Write Silver Feature Table
# ────────────────────────────────────────────────────────────────────────────

(
    df_enriched
    .write
    .mode("overwrite")
    .option("overwriteSchema", "true")
    .saveAsTable(f"{silver_schema}.transaction_features")
)

print(f"✅ Silver table: {silver_schema}.transaction_features")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 7: Feature Distribution Check
# ────────────────────────────────────────────────────────────────────────────

display(spark.sql(f"""
    SELECT
        ROUND(AVG(velocity_1h), 2) AS avg_velocity_1h,
        ROUND(AVG(velocity_24h), 2) AS avg_velocity_24h,
        ROUND(AVG(velocity_7d), 2) AS avg_velocity_7d,
        MAX(velocity_1h) AS max_velocity_1h,
        MAX(velocity_24h) AS max_velocity_24h,
        PERCENTILE(velocity_24h, 0.99) AS p99_velocity_24h,
        COUNT(CASE WHEN velocity_1h > 10 THEN 1 END) AS high_velocity_count
    FROM {silver_schema}.transaction_features
"""))

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: BROKEN — FIX REQUIRED
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   Window uses `rowsBetween` instead of `rangeBetween`.
#   - rowsBetween(-3600, 0) = "3600 rows before current row"  ← WRONG
#   - rangeBetween(-3600, 0) = "3600 seconds before current row" ← CORRECT
#
# TO FIX:
#   Replace all three `.rowsBetween(...)` calls with `.rangeBetween(...)`:
#     window_1h:  .rangeBetween(-3600, 0)
#     window_24h: .rangeBetween(-86400, 0)
#     window_7d:  .rangeBetween(-604800, 0)
#
# WHY THIS MATTERS:
#   With rowsBetween, velocity_1h could include transactions from weeks ago
#   (if they happen to be within 3600 rows). This leads to false positives
#   and false negatives in fraud detection.
#
# CONCEPTS LEARNED:
#   1. rowsBetween vs rangeBetween — critical difference
#   2. unix_timestamp() for second-level ordering
#   3. Window partitioning for per-account features
#   4. broadcast() for efficient small-table joins
#   5. Feature engineering for ML/rule-based systems
#
# NEXT: Run 03_fraud_rules.py to implement fraud detection rules
# ────────────────────────────────────────────────────────────────────────────
