# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 04_alert_generation.py
# MISSION:  FinTech — Fraud Detection Pipeline
# STATUS:   EMPTY — Player implements fraud alert generation
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Generate fraud alerts from the scored transactions. Create a Gold
#   fraud_alerts table with prioritized, actionable alerts that include
#   all relevant context for investigators.
#
# WHAT YOU'LL LEARN:
#   ✅ Gold layer design — aggregated, business-ready data
#   ✅ Alert prioritization with tier levels
#   ✅ Enrichment joins (account, merchant details)
#   ✅ SQL UNION ALL for combining rule violations
#   ✅ SLA tracking (time since alert generation)
#
# INPUT:
#   - {catalog}.{schema_prefix}_silver.fraud_scored
#   - {catalog}.{schema_prefix}_bronze.accounts
#   - {catalog}.{schema_prefix}_bronze.merchants
#
# OUTPUT:
#   - {catalog}.{schema_prefix}_gold.fraud_alerts
#     Required columns: alert_id, transaction_id, account_id,
#                       risk_score, alert_tier, triggered_rules
#
# ALGORITHM:
#   1. Filter fraud_scored where fraud_score > 0
#   2. Determine alert_tier:
#      - CRITICAL: fraud_score >= 60
#      - HIGH:     fraud_score >= 30
#      - MEDIUM:   fraud_score >= 15
#      - LOW:      fraud_score > 0
#   3. Build triggered_rules string (e.g., "velocity,amount,geo")
#   4. Join with account and merchant for investigator context
#   5. Write to Gold with risk_score column (required for validation)
#
# DOCUMENTATION:
#   - concat_ws:     https://docs.databricks.com/en/sql/language-manual/functions/concat_ws.html
#   - monotonically_increasing_id: for generating unique alert IDs
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

silver_schema = f"{catalog}.{schema_prefix}_silver"
bronze_schema = f"{catalog}.{schema_prefix}_bronze"
gold_schema   = f"{catalog}.{schema_prefix}_gold"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Load Fraud-Scored Transactions
# ────────────────────────────────────────────────────────────────────────────

df_scored = spark.read.table(f"{silver_schema}.fraud_scored")
df_flagged = df_scored.filter(col("fraud_score") > 0)

print(f"📊 Total scored transactions: {df_scored.count()}")
print(f"🚩 Flagged transactions: {df_flagged.count()}")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2: Implement Alert Generation
# ────────────────────────────────────────────────────────────────────────────
# TODO: Build the fraud alerts table!
#
# STEP 1: Filter for transactions with fraud_score > 0
# STEP 2: Add alert_tier based on fraud_score thresholds
# STEP 3: Create triggered_rules (comma-separated list of triggered rules)
# STEP 4: Join with accounts and merchants for context
# STEP 5: Select final columns and write to Gold
#
# HINT (PySpark):
#
#   from pyspark.sql.functions import (
#       col, when, concat_ws, array, lit,
#       monotonically_increasing_id, current_timestamp
#   )
#
#   df_alerts = (
#       df_flagged
#       .withColumn("alert_tier",
#           when(col("fraud_score") >= 60, "CRITICAL")
#           .when(col("fraud_score") >= 30, "HIGH")
#           .when(col("fraud_score") >= 15, "MEDIUM")
#           .otherwise("LOW")
#       )
#       .withColumn("triggered_rules",
#           concat_ws(",",
#               when(col("rule_velocity"), lit("velocity")),
#               when(col("rule_amount"), lit("amount")),
#               when(col("rule_geo"), lit("geo")),
#               when(col("rule_merchant"), lit("merchant")),
#           )
#       )
#       .withColumn("alert_id",
#           concat(lit("ALERT-"), monotonically_increasing_id())
#       )
#       .withColumn("risk_score", col("fraud_score"))  # Alias for validation
#       .withColumn("created_at", current_timestamp())
#       .select(
#           "alert_id", "transaction_id", "account_id", "merchant_id",
#           "amount", "event_ts", "channel", "risk_score", "alert_tier",
#           "triggered_rules", "created_at"
#       )
#   )
#
# HINT (SQL):
#
#   CREATE OR REPLACE TABLE {gold_schema}.fraud_alerts AS
#   SELECT
#       CONCAT('ALERT-', ROW_NUMBER() OVER (ORDER BY fraud_score DESC)) AS alert_id,
#       transaction_id,
#       account_id,
#       merchant_id,
#       amount,
#       event_ts,
#       fraud_score AS risk_score,
#       CASE
#           WHEN fraud_score >= 60 THEN 'CRITICAL'
#           WHEN fraud_score >= 30 THEN 'HIGH'
#           WHEN fraud_score >= 15 THEN 'MEDIUM'
#           ELSE 'LOW'
#       END AS alert_tier,
#       CONCAT_WS(',',
#           CASE WHEN rule_velocity THEN 'velocity' END,
#           CASE WHEN rule_amount THEN 'amount' END,
#           CASE WHEN rule_geo THEN 'geo' END,
#           CASE WHEN rule_merchant THEN 'merchant' END
#       ) AS triggered_rules,
#       current_timestamp() AS created_at
#   FROM {silver_schema}.fraud_scored
#   WHERE fraud_score > 0
#   ORDER BY fraud_score DESC

# ────────────────────────────────────────────────────────────────────────────
# YOUR CODE HERE ↓
# ────────────────────────────────────────────────────────────────────────────

from pyspark.sql.functions import col  # noqa: E402

# Placeholder: Write your implementation below


# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Enrich Alerts with Account & Merchant Context
# ────────────────────────────────────────────────────────────────────────────
# After generating alerts, join with reference tables so investigators
# have full context without additional lookups.
#
# TODO: Join your df_alerts with:
#   - accounts (account_type, balance, credit_limit)
#   - merchants (merchant_name, category, country, risk_level)
#
# HINT:
#   df_accounts = spark.read.table(f"{bronze_schema}.accounts")
#   df_merchants = spark.read.table(f"{bronze_schema}.merchants")
#
#   df_enriched_alerts = (
#       df_alerts
#       .join(broadcast(df_accounts.select(...)), "account_id", "left")
#       .join(broadcast(df_merchants.select(...)), "merchant_id", "left")
#   )


# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: Write Gold Alerts Table
# ────────────────────────────────────────────────────────────────────────────
# 
# TODO: Write your fraud alerts to the Gold table.
#
# HINT:
#   df_enriched_alerts.write.mode("overwrite").saveAsTable(
#       f"{gold_schema}.fraud_alerts"
#   )
#   print(f"✅ Gold table: {gold_schema}.fraud_alerts")


# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: Alert Summary Dashboard
# ────────────────────────────────────────────────────────────────────────────
# Uncomment after implementing the Gold table:

# ⚡ SQL APPROACH: Implement the correct SQL query yourself!
# No SQL hints are provided for this operation.
# Use the WHAT'S BROKEN section at the bottom and Databricks SQL docs for guidance.

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 6: Validation
# ────────────────────────────────────────────────────────────────────────────

try:
    alert_count = spark.sql(f"""
        SELECT COUNT(*) as count
        FROM {gold_schema}.fraud_alerts
        WHERE risk_score > 0
    """).collect()[0]["count"]
    print(f"{'✅' if alert_count >= 1 else '❌'} Gold alerts: {alert_count} with risk_score > 0")
except Exception as e:
    print(f"❌ Gold table not yet created: {e}")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: EMPTY — Full Implementation Required
# ────────────────────────────────────────────────────────────────────────────
# YOUR TASKS:
#   1. Filter scored transactions where fraud_score > 0
#   2. Assign alert_tier (CRITICAL/HIGH/MEDIUM/LOW)
#   3. Build triggered_rules string from boolean columns
#   4. Generate unique alert_id per row
#   5. Join with accounts + merchants for context
#   6. Write to Gold fraud_alerts table
#
# CONCEPTS LEARNED:
#   1. Gold layer = aggregated, business-ready tables
#   2. concat_ws() for building delimiter-separated strings
#   3. CASE WHEN for tier classification
#   4. Enrichment joins for complete alert context
#   5. monotonically_increasing_id() for generating IDs
#
# MISSION COMPLETE when validation passes! 🏆
# ────────────────────────────────────────────────────────────────────────────
