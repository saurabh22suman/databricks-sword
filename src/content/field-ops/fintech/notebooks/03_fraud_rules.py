# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 03_fraud_rules.py
# MISSION:  FinTech — Fraud Detection Pipeline
# STATUS:   PARTIAL — Only 1 of 4 fraud rules implemented
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Implement a rule-based fraud detection engine that flags suspicious
#   transactions using four rules:
#     Rule 1: High velocity — >10 transactions in 1 hour (already done)
#     Rule 2: Large amount — single transaction > $5,000
#     Rule 3: Geo anomaly — transactions >500 km apart in <1 hour
#     Rule 4: High-risk merchant — transaction at a high-risk merchant
#                                  on a high-risk account
#
# WHAT YOU'LL LEARN:
#   ✅ CASE WHEN for multi-rule scoring (SQL + PySpark)
#   ✅ Haversine formula for geo-distance calculation
#   ✅ LAG() for comparing consecutive transactions
#   ✅ Multiple boolean columns for rule flags
#   ✅ Composite risk scoring
#
# INPUT:
#   - {catalog}.{schema_prefix}_silver.transaction_features
#   - {catalog}.{schema_prefix}_bronze.merchants
#   - {catalog}.{schema_prefix}_bronze.accounts
#
# OUTPUT:
#   - {catalog}.{schema_prefix}_silver.fraud_scored
#     + rule_velocity, rule_amount, rule_geo, rule_merchant, fraud_score
#
# DOCUMENTATION:
#   - CASE:    https://docs.databricks.com/en/sql/language-manual/functions/case.html
#   - LAG:     https://docs.databricks.com/en/sql/language-manual/functions/lag.html
#   - radians: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.radians.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
silver_schema = f"{catalog}.{schema_prefix}_silver"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Load Feature Data
# ────────────────────────────────────────────────────────────────────────────

df_features = spark.read.table(f"{silver_schema}.transaction_features")
df_merchants = spark.read.table(f"{bronze_schema}.merchants")

print(f"📊 Features: {df_features.count()} rows")
print(f"📊 Merchants: {df_merchants.count()} rows")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2: Rule 1 — High Velocity (IMPLEMENTED)
# ────────────────────────────────────────────────────────────────────────────
# Flag transactions where the account has >10 transactions in 1 hour.
# The velocity_1h feature was calculated in the previous notebook.

from pyspark.sql.functions import (
    col, when, lit, lag, radians, sin, cos, sqrt, atan2,
    abs as spark_abs, unix_timestamp, round as spark_round,
    current_timestamp, broadcast
)
from pyspark.sql.window import Window

df_scored = df_features.withColumn(
    "rule_velocity",
    when(col("velocity_1h") > 10, True).otherwise(False)
)

velocity_flags = df_scored.filter(col("rule_velocity")).count()
print(f"🚩 Rule 1 (Velocity): {velocity_flags} flagged")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Rule 2 — Large Amount
# ────────────────────────────────────────────────────────────────────────────
# TODO: Implement this rule!
# Flag transactions where amount > $5,000.
#
# HINT (PySpark):
#   .withColumn("rule_amount",
#       when(col("amount") > 5000, True).otherwise(False)
#   )
#
# HINT (SQL):
#   CASE WHEN amount > 5000 THEN true ELSE false END AS rule_amount

df_scored = df_scored.withColumn(
    "rule_amount",
    lit(False)  # ⚠️ STUB: Always False — implement the actual rule!
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: Rule 3 — Geo Anomaly (Impossible Travel)
# ────────────────────────────────────────────────────────────────────────────
# Flag when two consecutive transactions from the same account are
# more than 500 km apart but less than 1 hour difference.
#
# The haversine formula calculates the great-circle distance between
# two points on Earth given their latitude and longitude:
#
#   a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
#   c = 2 × atan2(√a, √(1−a))
#   distance = R × c   where R = 6371 km
#
# TODO: Implement this rule!
#
# HINT: Use LAG() to get the previous transaction's coordinates,
#       then apply haversine formula:
#
#   account_window = Window.partitionBy("account_id").orderBy("event_ts")
#
#   .withColumn("prev_lat", lag("latitude").over(account_window))
#   .withColumn("prev_lon", lag("longitude").over(account_window))
#   .withColumn("prev_ts", lag("event_ts").over(account_window))
#   .withColumn("geo_dist_km", haversine(lat, lon, prev_lat, prev_lon))
#   .withColumn("time_diff_hrs",
#       (unix_timestamp("event_ts") - unix_timestamp("prev_ts")) / 3600
#   )
#   .withColumn("rule_geo",
#       when((col("geo_dist_km") > 500) & (col("time_diff_hrs") < 1), True)
#       .otherwise(False)
#   )

df_scored = df_scored.withColumn(
    "rule_geo",
    lit(False)  # ⚠️ STUB: Always False — implement the actual rule!
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: Rule 4 — High-Risk Merchant + High-Risk Account
# ────────────────────────────────────────────────────────────────────────────
# Flag when a high-risk merchant transaction comes from an account
# with risk_score > 70.
#
# TODO: Implement this rule!
#
# HINT:
#   1. Join with merchants table to get merchant risk_level
#   2. Check: merchant risk_level = 'high' AND account risk_score > 70
#
# PySpark:
#   df_scored = (
#       df_scored
#       .join(
#           broadcast(df_merchants.select("merchant_id", "risk_level")
#                     .withColumnRenamed("risk_level", "merchant_risk")),
#           on="merchant_id", how="left"
#       )
#       .withColumn("rule_merchant",
#           when((col("merchant_risk") == "high") & (col("risk_score") > 70), True)
#           .otherwise(False)
#       )
#   )
#
# SQL:
#   CASE WHEN m.risk_level = 'high' AND t.risk_score > 70
#        THEN true ELSE false END AS rule_merchant

df_scored = df_scored.withColumn(
    "rule_merchant",
    lit(False)  # ⚠️ STUB: Always False — implement the actual rule!
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 6: Calculate Composite Fraud Score
# ────────────────────────────────────────────────────────────────────────────
# Each rule contributes points to a total fraud score:
#   Rule 1 (velocity):  30 points
#   Rule 2 (amount):    20 points
#   Rule 3 (geo):       35 points (impossible travel is a strong signal)
#   Rule 4 (merchant):  15 points
# Total max: 100 points

df_final = (
    df_scored
    .withColumn(
        "fraud_score",
        (when(col("rule_velocity"), 30).otherwise(0)
         + when(col("rule_amount"), 20).otherwise(0)
         + when(col("rule_geo"), 35).otherwise(0)
         + when(col("rule_merchant"), 15).otherwise(0))
    )
    .withColumn("_scored_at", current_timestamp())
)

display(
    df_final
    .filter(col("fraud_score") > 0)
    .select("transaction_id", "account_id", "amount",
            "rule_velocity", "rule_amount", "rule_geo", "rule_merchant",
            "fraud_score")
    .orderBy(col("fraud_score").desc())
    .limit(20)
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 7: SQL Equivalent — All Four Rules in One Query
# ────────────────────────────────────────────────────────────────────────────

# ⚡ SQL APPROACH: Implement the correct SQL query yourself!
# No SQL hints are provided for this operation.
# Use the WHAT'S BROKEN section at the bottom and Databricks SQL docs for guidance.

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 8: Write Silver Fraud-Scored Table
# ────────────────────────────────────────────────────────────────────────────

(
    df_final
    .write
    .mode("overwrite")
    .option("overwriteSchema", "true")
    .saveAsTable(f"{silver_schema}.fraud_scored")
)

print(f"✅ Silver table: {silver_schema}.fraud_scored")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: PARTIAL — 3 Rules Missing
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S DONE:
#   ✓ Rule 1: Velocity check (velocity_1h > 10)
#   ✓ Composite fraud score calculation
#   ✓ Silver output table
#
# WHAT'S MISSING — YOU IMPLEMENT:
#   Rule 2: Large amount check (amount > 5000)
#   Rule 3: Geo anomaly with haversine formula
#   Rule 4: High-risk merchant × high-risk account join
#
# CONCEPTS LEARNED:
#   1. Rule-based fraud detection with weighted scoring
#   2. CASE WHEN for multi-condition flagging
#   3. LAG() for comparing consecutive events
#   4. Haversine formula for geo-distance
#   5. broadcast() for small reference table joins
#
# NEXT: Run 04_alert_generation.py after implementing all rules
# ────────────────────────────────────────────────────────────────────────────
