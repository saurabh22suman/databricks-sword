# Databricks notebook source
# MAGIC %md
# MAGIC # 03 - Fraud Rules Engine
# MAGIC **Objective:** Apply fraud detection rules
# MAGIC **Issue:** PARTIAL - missing rules
# MAGIC **Hint:** Add velocity, amount, and geo-distance rules

# COMMAND ----------

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, when, lit
spark = SparkSession.builder.getOrCreate()

# Read features
features = spark.table("{catalog}.{schema_prefix}_silver.transaction_features")

# PARTIAL: Only one rule implemented
fraud_score = features.withColumn("risk_score",
    when(col("amount") > 5000, lit(100)).otherwise(lit(0))
)

# MISSING RULES:
# - High velocity (velocity_1h > 10): +50 points
# - Large geo distance from home: +75 points
# - Unusual merchant category: +25 points

fraud_score.write.mode("overwrite").saveAsTable("{catalog}.{schema_prefix}_silver.fraud_scores")
