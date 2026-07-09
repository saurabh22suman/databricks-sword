# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 02_standardize_codes.py
# MISSION:  Healthcare — Patient 360 Data Platform
# STATUS:   WORKING — Maps clinical codes to standard reference tables
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Standardize ICD-10 diagnosis codes and LOINC lab codes by joining
#   with reference tables. Demonstrates broadcast joins and SQL JOINs
#   for reference data enrichment — a core healthcare DE pattern.
#
# WHAT YOU'LL LEARN:
#   ✅ Broadcast join optimization for small reference tables
#   ✅ SQL JOIN with reference tables
#   ✅ PySpark broadcast() hint for small DataFrames
#   ✅ Handling missing/invalid codes with COALESCE
#   ✅ Creating reusable views for downstream notebooks
#
# INPUT:
#   - {catalog}.{schema_prefix}_bronze.ehr_records
#   - {catalog}.{schema_prefix}_bronze.lab_results
#   - {catalog}.{schema_prefix}_bronze.icd10_codes (reference)
#   - {catalog}.{schema_prefix}_bronze.loinc_codes (reference)
#
# OUTPUT:
#   - {catalog}.{schema_prefix}_silver.ehr_standardized
#   - {catalog}.{schema_prefix}_silver.lab_results_standardized
#
# DOCUMENTATION:
#   - Broadcast joins: https://docs.databricks.com/en/optimizations/broadcast-join.html
#   - COALESCE:        https://docs.databricks.com/en/sql/language-manual/functions/coalesce.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
silver_schema = f"{catalog}.{schema_prefix}_silver"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Load Reference Tables
# ────────────────────────────────────────────────────────────────────────────
# Reference tables (ICD-10 codes, LOINC codes) are small — perfect
# candidates for BROADCAST joins to avoid shuffling.

from pyspark import StorageLevel
from pyspark.sql.functions import broadcast, col, coalesce, lit, current_timestamp

# Small reference tables — cache them for repeated use
df_icd10 = spark.read.table(f"{bronze_schema}.icd10_codes").persist(StorageLevel.MEMORY_AND_DISK)
df_loinc = spark.read.table(f"{bronze_schema}.loinc_codes").persist(StorageLevel.MEMORY_AND_DISK)

print(f"📊 ICD-10 codes: {df_icd10.count()} (small → broadcast candidate)")
print(f"📊 LOINC codes:  {df_loinc.count()} (small → broadcast candidate)")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2A: Standardize EHR Diagnosis Codes — PySpark
# ────────────────────────────────────────────────────────────────────────────
# Use broadcast() hint to tell Spark to copy the small ICD-10 table
# to all executors instead of shuffling the large EHR table.

df_ehr = spark.read.table(f"{bronze_schema}.ehr_records")

df_ehr_standardized = (
    df_ehr
    .join(
        broadcast(df_icd10),               # Broadcast the small reference table
        df_ehr["diagnosis_code"] == df_icd10["code"],
        "left"                              # Keep all EHR records even if code not found
    )
    .withColumn(
        "diagnosis_description",
        coalesce(df_icd10["description"], lit("UNKNOWN CODE"))  # Handle missing codes
    )
    .withColumn(
        "diagnosis_category",
        coalesce(df_icd10["category"], lit("UNCATEGORIZED"))
    )
    .drop(df_icd10["code"])                 # Drop duplicate column from join
    .withColumn("_standardized_at", current_timestamp())
)

print(f"📊 Standardized EHR records: {df_ehr_standardized.count()}")

# Check for unmapped codes
unmapped = df_ehr_standardized.filter("diagnosis_description = 'UNKNOWN CODE'").count()
print(f"⚠️  Unmapped diagnosis codes: {unmapped}")

df_ehr_standardized.show(10, truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2B: SQL Equivalent — Broadcast Join with /*+ BROADCAST */
# ────────────────────────────────────────────────────────────────────────────
# SQL uses the /*+ BROADCAST(table) */ hint for the same optimization.

df_ehr_standardized_sql = spark.sql(f"""
    SELECT
        ehr.*,
        COALESCE(icd.description, 'UNKNOWN CODE') AS diagnosis_description,
        COALESCE(icd.category, 'UNCATEGORIZED')   AS diagnosis_category,
        current_timestamp() AS _standardized_at
    FROM {bronze_schema}.ehr_records ehr
    LEFT JOIN /*+ BROADCAST */ {bronze_schema}.icd10_codes icd
        ON ehr.diagnosis_code = icd.code
""")

df_ehr_standardized_sql.show(5, truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Standardize Lab Results with LOINC Codes
# ────────────────────────────────────────────────────────────────────────────

df_labs = spark.read.table(f"{bronze_schema}.lab_results")

df_labs_standardized = (
    df_labs
    .join(broadcast(df_loinc), df_labs["test_code"] == df_loinc["loinc_code"], "left")
    .withColumn("test_name_std", coalesce(df_loinc["test_name"], lit("NON-STANDARD TEST")))
    .withColumn("unit_std", coalesce(df_loinc["standard_unit"], df_labs["unit"]))
    .drop(df_loinc["loinc_code"])
    .withColumn("_standardized_at", current_timestamp())
)

df_labs_standardized.show(10, truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: Write Silver Tables
# ────────────────────────────────────────────────────────────────────────────

df_ehr_standardized.write.mode("overwrite").saveAsTable(f"{silver_schema}.ehr_standardized")
print(f"✅ {silver_schema}.ehr_standardized")

df_labs_standardized.write.mode("overwrite").saveAsTable(f"{silver_schema}.lab_results_standardized")
print(f"✅ {silver_schema}.lab_results_standardized")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK COMPLETE — Code Standardization Done
# ────────────────────────────────────────────────────────────────────────────
# CONCEPTS LEARNED:
#   1. broadcast() hint for optimizing small-table joins
#   2. SQL /*+ BROADCAST */ hint equivalent
#   3. COALESCE for handling unmapped/missing values
#   4. LEFT JOIN to preserve all records from the main table
#   5. Reference table pattern in healthcare data engineering
#
# NEXT → 03_dedupe_patients.py — Deduplicate patient records
# ────────────────────────────────────────────────────────────────────────────
