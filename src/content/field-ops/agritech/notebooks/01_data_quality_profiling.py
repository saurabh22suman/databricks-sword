# Databricks notebook source
# MAGIC %md
# MAGIC # Data Quality Profiling with Great Expectations
# MAGIC Validate soil sensor data quality before ingestion to Silver layer

# COMMAND ----------
from great_expectations.dataset import SparkDFDataset
from pyspark.sql import functions as F

# COMMAND ----------
# Read bronze soil sensor data
sensors_df = spark.read.table("agritech_bronze.soil_sensors")

# COMMAND ----------
# BROKEN: Great Expectations suite is too strict - fails on valid edge cases
# Expected: Use reasonable ranges that allow for natural variation
# Current: Expectations are too narrow, causing false failures

ge_dataset = SparkDFDataset(sensors_df)

# ❌ TOO STRICT: pH range should be 4.0-9.0 (not 6.0-8.0)
# Sandy/acidic soils can be pH 4.5-5.5, alkaline soils 8.0-8.5
ge_dataset.expect_column_values_to_be_between("ph", min_value=6.0, max_value=8.0)  

# ❌ TOO STRICT: Soil moisture should allow 0-100% (not 10-90%)
# Dry/sandy soil can be 5%, saturated soil can be 95%
ge_dataset.expect_column_values_to_be_between("soil_moisture_pct", min_value=10.0, max_value=90.0)

# ✅ CORRECT: Nitrogen range
ge_dataset.expect_column_values_to_be_between("nitrogen_ppm", min_value=0, max_value=200)

# ✅ CORRECT: Temperature range
ge_dataset.expect_column_values_to_be_between("soil_temp_c", min_value=-10, max_value=50)

# COMMAND ----------
# Validate and get results
validation_results = ge_dataset.validate()

if not validation_results.success:
    print("❌ Data quality check FAILED")
    print(validation_results)
    # Current behavior: Blocks pipeline even for edge cases
else:
    print("✅ Data quality check PASSED")

# COMMAND ----------
# MAGIC %md
# MAGIC ## Expected Fix
# MAGIC ```python
# MAGIC # Use realistic ranges that account for soil variability
# MAGIC ge_dataset.expect_column_values_to_be_between("ph", min_value=4.0, max_value=9.0)  # ✅ Wider range
# MAGIC ge_dataset.expect_column_values_to_be_between("soil_moisture_pct", min_value=0, max_value=100)  # ✅ Full range
# MAGIC ```
