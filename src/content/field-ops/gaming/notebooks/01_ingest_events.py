# Databricks notebook source
# MAGIC %md
# MAGIC # 01 - Ingest Player Events
# MAGIC **Objective:** Load player event stream into Bronze
# MAGIC **Issue:** Creates duplicate events - needs deduplication logic

# COMMAND ----------

from pyspark.sql import SparkSession
spark = SparkSession.builder.getOrCreate()

# Read JSON events
df = spark.read.json("/Volumes/default/{schema_prefix}_bronze/data/player_events.json")

# BROKEN: Creates duplicates
df.write.mode("append").saveAsTable("{catalog}.{schema_prefix}_bronze.player_events")

# FIX: Add deduplication
