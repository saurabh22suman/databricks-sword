# Databricks notebook source
# MAGIC %md
# MAGIC # 01 - Ingest Transactions
# MAGIC **Objective:** Load transaction stream into Bronze
# MAGIC **Issue:** Working - ingests properly with timestamp parsing

# COMMAND ----------

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, to_timestamp
spark = SparkSession.builder.getOrCreate()

# Read transactions
df = spark.read.json("/Volumes/default/{schema_prefix}_bronze/data/transactions.json")

# Parse timestamp
df = df.withColumn("timestamp", to_timestamp(col("timestamp")))

# Write to Bronze
df.write.mode("overwrite").saveAsTable("{catalog}.{schema_prefix}_bronze.transactions")
