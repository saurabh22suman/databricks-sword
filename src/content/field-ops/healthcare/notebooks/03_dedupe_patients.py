# Databricks notebook source
# MAGIC %md
# MAGIC # 03 - Deduplicate Patients
# MAGIC **Objective:** Identify duplicate patient records using fuzzy matching
# MAGIC **Issue:** BROKEN - merge logic incorrect
# MAGIC **Hint:** Use soundex(last_name) + date_of_birth for matching

# COMMAND ----------

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, soundex, md5, concat
spark = SparkSession.builder.getOrCreate()

# Read EHR records
ehr = spark.table("{catalog}.{schema_prefix}_bronze.ehr_records")

# BROKEN: This dedupes by exact patient_id only - misses name variations
patients = ehr.dropDuplicates(["patient_id"])

# FIX: Use phonetic matching + DOB
# patients = ehr.withColumn("patient_key", 
#     md5(concat(soundex(col("last_name")), col("date_of_birth")))
# )
# patients = patients.dropDuplicates(["patient_key"])

patients.write.mode("overwrite").saveAsTable("{catalog}.{schema_prefix}_silver.patients")
