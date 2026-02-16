# Databricks notebook source
# MAGIC %md
# MAGIC # 02 - Feature Engineering
# MAGIC **Objective:** Calculate transaction velocity features
# MAGIC **Issue:** BROKEN - velocity calculation uses wrong window
# MAGIC **Hint:** Use RANGE BETWEEN for time-based windows

# COMMAND ----------

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, count, sum as _sum
from pyspark.sql.window import Window
spark = SparkSession.builder.getOrCreate()

# Read transactions
txns = spark.table("{catalog}.{schema_prefix}_bronze.transactions")

# BROKEN: Using ROWS instead of RANGE - counts rows not time window
window_1h = Window.partitionBy("account_id").orderBy("timestamp").rowsBetween(-3600, 0)

# Wrong: This counts rows, not transactions in last hour
features = txns.withColumn("velocity_1h", count("*").over(window_1h))

# FIX: Use RANGE BETWEEN with seconds
# window_1h = Window.partitionBy("account_id").orderBy(col("timestamp").cast("long")) \
#     .rangeBetween(-3600, 0)  # 3600 seconds = 1 hour
# features = txns.withColumn("velocity_1h", count("*").over(window_1h))

features.write.mode("overwrite").saveAsTable("{catalog}.{schema_prefix}_silver.transaction_features")
