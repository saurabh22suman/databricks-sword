# Databricks notebook source
# MAGIC %md
# MAGIC # 02 - Standardize Medical Codes
# MAGIC **Objective:** Map ICD-10 and LOINC codes to FHIR standard
# MAGIC **Issue:** Working notebook - loads reference data

# COMMAND ----------

from pyspark.sql import SparkSession
spark = SparkSession.builder.getOrCreate()

# Load reference tables
icd10_ref = spark.read.csv("/Volumes/default/{schema_prefix}_bronze/data/icd10_codes.csv", header=True)
loinc_ref = spark.read.csv("/Volumes/default/{schema_prefix}_bronze/data/loinc_codes.csv", header=True)

# Save to Silver
icd10_ref.write.mode("overwrite").saveAsTable("{catalog}.{schema_prefix}_silver.icd10_fhir_mapping")
loinc_ref.write.mode("overwrite").saveAsTable("{catalog}.{schema_prefix}_silver.loinc_fhir_mapping")
