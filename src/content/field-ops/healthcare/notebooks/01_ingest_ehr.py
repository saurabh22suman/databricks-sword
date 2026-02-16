# Databricks notebook source
# MAGIC %md
# MAGIC # 01 - Ingest EHR Records
# MAGIC **Objective:** Load EHR JSON records into Bronze layer
# MAGIC **Issue:** Schema mismatches cause failures - BROKEN
# MAGIC **Hint:** Enable schema evolution with mergeSchema option

# COMMAND ----------

from pyspark.sql import SparkSession
spark = SparkSession.builder.getOrCreate()

# Read EHR JSON records
# BROKEN: This fails when schema changes between batches
df = spark.read.json("/Volumes/default/{schema_prefix}_bronze/data/ehr_records.json")

# BROKEN: No schema evolution - fails on schema drift
df.write.mode("append").saveAsTable("{catalog}.{schema_prefix}_bronze.ehr_records")

# FIX: Enable schema evolution
# df.write.mode("append") \
#   .option("mergeSchema", "true") \
#   .saveAsTable("{catalog}.{schema_prefix}_bronze.ehr_records")
