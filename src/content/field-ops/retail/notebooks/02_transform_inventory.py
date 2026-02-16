# Databricks notebook source
# MAGIC %md
# MAGIC # 02 - Transform Inventory
# MAGIC 
# MAGIC **Objective:** Clean and deduplicate inventory data
# MAGIC 
# MAGIC **Current Issue:** Duplicates in inventory_levels are not being removed
# MAGIC 
# MAGIC **Hint:** Use QUALIFY with ROW_NUMBER() to keep only the latest record per SKU

# COMMAND ----------

# TODO: Fix the deduplication logic

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, row_number
from pyspark.sql.window import Window

spark = SparkSession.builder.getOrCreate()

# Read inventory data
df = spark.read.csv("/Volumes/default/{schema_prefix}_bronze/data/inventory_levels.csv", header=True)

# BROKEN: This doesn't remove duplicates
df.write.mode("overwrite").saveAsTable("{catalog}.{schema_prefix}_silver.inventory")

# FIX: Use window function to dedupe
# window = Window.partitionBy("sku").orderBy(col("last_updated").desc())
# df_deduped = df.withColumn("rn", row_number().over(window)).filter(col("rn") == 1).drop("rn")
# df_deduped.write.mode("overwrite").saveAsTable("{catalog}.{schema_prefix}_silver.inventory")
