# Databricks notebook source
# MAGIC %md
# MAGIC # 04 - Patient 360 View
# MAGIC **Objective:** Create unified patient view with masked PII
# MAGIC **Issue:** PARTIAL - missing PII masking
# MAGIC **Hint:** Use regexp_replace for SSN masking: XXX-XX-NNNN

# COMMAND ----------

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, regexp_replace
spark = SparkSession.builder.getOrCreate()

# Read deduplicated patients
patients = spark.table("{catalog}.{schema_prefix}_silver.patients")
labs = spark.read.csv("/Volumes/default/{schema_prefix}_bronze/data/lab_results.csv", header=True)
claims = spark.read.csv("/Volumes/default/{schema_prefix}_bronze/data/insurance_claims.csv", header=True)

# Join all patient data
patient_360 = patients \
    .join(labs, "patient_id", "left") \
    .join(claims, "patient_id", "left")

# PARTIAL: Missing PII masking
patient_360.write.mode("overwrite").saveAsTable("{catalog}.{schema_prefix}_gold.patient_360")

# FIX: Add PII masking
# patient_360_masked = patient_360.withColumn(
#     "ssn", regexp_replace(col("ssn"), "^\\d{3}-\\d{2}", "XXX-XX")
# )
# patient_360_masked.write.mode("overwrite").saveAsTable("{catalog}.{schema_prefix}_gold.patient_360")
