# Databricks notebook source
# MAGIC %md
# MAGIC # 04 - Alert Generation
# MAGIC **Objective:** Generate fraud alerts for high-risk transactions
# MAGIC **Issue:** EMPTY - implement alert logic
# MAGIC **Hint:** Filter risk_score > 75 and enrich with account/merchant data

# COMMAND ----------

from pyspark.sql import SparkSession
spark = SparkSession.builder.getOrCreate()

# TODO: Implement alert generation
# 1. Read fraud_scores from Silver
# 2. Filter for high-risk transactions (risk_score > 75)
# 3. Join with accounts and merchants for context
# 4. Add alert_timestamp and alert_id
# 5. Write to Gold fraud_alerts table

# fraud_scores = spark.table("{catalog}.{schema_prefix}_silver.fraud_scores")
# accounts = spark.read.csv("/Volumes/default/{schema_prefix}_bronze/data/accounts.csv", header=True)
# merchants = spark.read.csv("/Volumes/default/{schema_prefix}_bronze/data/merchants.csv", header=True)

# alerts = fraud_scores.filter(col("risk_score") > 75) \
#     .join(accounts, "account_id") \
#     .join(merchants, "merchant_id") \
#     .withColumn("alert_id", expr("uuid()")) \
#     .withColumn("alert_timestamp", current_timestamp())

# alerts.write.mode("overwrite").saveAsTable("{catalog}.{schema_prefix}_gold.fraud_alerts")
