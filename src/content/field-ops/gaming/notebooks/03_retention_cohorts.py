# Databricks notebook source
# MAGIC %md
# MAGIC # 03 - Retention Cohorts
# MAGIC **Objective:** Build 7-day retention cohorts
# MAGIC **Issue:** EMPTY - implement cohort analysis

# COMMAND ----------

from pyspark.sql import SparkSession
spark = SparkSession.builder.getOrCreate()

# TODO: Implement cohort analysis
# Group by install_date (cohort)
# Track Day 1, 3, 7 retention
# Save to Gold layer
