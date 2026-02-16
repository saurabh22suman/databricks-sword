# Databricks notebook source
# MAGIC %md
# MAGIC # 01 - Ingest Sales Transactions
# MAGIC 
# MAGIC **Objective:** Load raw sales data into Bronze layer
# MAGIC 
# MAGIC **Current Issue:** Duplicate transactions are being created
# MAGIC 
# MAGIC **Hint:** Use MERGE instead of simple INSERT to handle duplicates

# COMMAND ----------

# TODO: Fix the ingestion logic to handle duplicates
# Currently using INSERT which creates duplicates on re-runs

from pyspark.sql import SparkSession
spark = SparkSession.builder.getOrCreate()

# Read the CSV file (this path will be set dynamically)
df = spark.read.csv("/Volumes/default/{schema_prefix}_bronze/data/sales_transactions.csv", header=True)

# BROKEN: This creates duplicates on every run
df.write.mode("append").saveAsTable("{catalog}.{schema_prefix}_bronze.sales_transactions")

# FIX: Use MERGE statement instead
# df.createOrReplaceTempView("temp_sales")
# spark.sql("""
#   MERGE INTO {catalog}.{schema_prefix}_bronze.sales_transactions AS target
#   USING temp_sales AS source
#   ON target.transaction_id = source.transaction_id
#   WHEN NOT MATCHED THEN INSERT *
# """)
