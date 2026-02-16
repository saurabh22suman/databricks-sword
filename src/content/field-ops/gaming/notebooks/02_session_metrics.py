# Databricks notebook source
# MAGIC %md
# MAGIC # 02 - Session Metrics
# MAGIC **Objective:** Calculate session duration and metrics
# MAGIC **Issue:** Session duration calculation is broken (negative values)

# COMMAND ----------

from pyspark.sql import SparkSession
spark = SparkSession.builder.getOrCreate()

# BROKEN: Fix the session duration logic
# Hint: Use LAG() to get previous event timestamp per player
