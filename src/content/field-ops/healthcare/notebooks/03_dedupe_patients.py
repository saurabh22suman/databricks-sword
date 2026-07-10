# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 03_dedupe_patients.py
# MISSION:  Healthcare — Patient 360 Data Platform
# STATUS:   BROKEN — Uses exact match only, misses name variations
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Identify and merge duplicate patient records. In healthcare, the same
#   patient often exists in multiple systems with slight name variations
#   (e.g., "John Smith" vs "Jon Smith" vs "JOHN SMITH JR"). Proper
#   deduplication requires FUZZY matching, not just exact matches.
#
# WHAT YOU'LL LEARN:
#   ✅ SOUNDEX() for phonetic matching (SQL + PySpark)
#   ✅ LEVENSHTEIN() for string distance
#   ✅ LOWER() / UPPER() / TRIM() for text normalization
#   ✅ MERGE INTO for SCD Type 1 updates
#   ✅ Complex join conditions with multiple match criteria
#   ✅ Master Patient Index (MPI) patterns
#
# INPUT:
#   Table: {catalog}.{schema_prefix}_silver.ehr_standardized
#
# OUTPUT:
#   Table: {catalog}.{schema_prefix}_silver.patients (deduplicated)
#
# HINTS:
#   - The BUG: Only deduplicates on exact patient_id match
#   - MISS: Doesn't catch "Jon Smith" / "John Smith" (same person)
#   - FIX: Add SOUNDEX on last_name + DOB matching for fuzzy dedup
#   - SOUNDEX("Smith") = SOUNDEX("Smyth") → both return "S530"
#
# DOCUMENTATION:
#   - SOUNDEX:     https://docs.databricks.com/en/sql/language-manual/functions/soundex.html
#   - LEVENSHTEIN: https://docs.databricks.com/en/sql/language-manual/functions/levenshtein.html
#   - MERGE INTO:  https://docs.databricks.com/en/delta/merge.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
silver_schema = f"{catalog}.{schema_prefix}_silver"
gold_schema   = f"{catalog}.{schema_prefix}_gold"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Examine Patient Data
# ────────────────────────────────────────────────────────────────────────────

df_ehr = spark.read.table(f"{silver_schema}.ehr_standardized")
print(f"📊 Total EHR records: {df_ehr.count()}")

# Check for variations in patient names
spark.sql(f"""
    SELECT
        patient_id,
        first_name,
        last_name,
        date_of_birth,
        ssn,
        COUNT(*) as record_count
    FROM {silver_schema}.ehr_standardized
    GROUP BY patient_id, first_name, last_name, date_of_birth, ssn
    ORDER BY last_name, first_name
    LIMIT 30
""").show(truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2A: Extract Unique Patients — PySpark (BUGGY: exact match only)
# ────────────────────────────────────────────────────────────────────────────
#
# ⚠️ BUG: This only deduplicates on exact patient_id, but the SAME patient
# can appear with different IDs from different source systems.
# For example: sys1_P001 = sys2_P451 = "John Smith, DOB 1985-03-15"
#
# It misses fuzzy matches like:
#   - "Jon Smith" vs "John Smith" (typo in first name)
#   - "SMITH" vs "Smith" (case difference)
#   - Different patient_ids for the same person from different source systems

from pyspark.sql.functions import (
    col, soundex, lower, trim, levenshtein, first, count,
    current_timestamp, row_number, desc
)
from pyspark.sql.window import Window

# This dedup only catches exact matches — NOT good enough for healthcare!
df_patients_exact = (
    df_ehr
    .select("patient_id", "first_name", "last_name", "date_of_birth", "ssn", "gender")
    .dropDuplicates(["patient_id"])  # ⚠️ BUG: Only deduplicates on exact patient_id
)

print(f"📊 Unique patients (exact match): {df_patients_exact.count()}")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2B: How to FIX — Add Fuzzy Matching with SOUNDEX
# ────────────────────────────────────────────────────────────────────────────
# SOUNDEX converts a name to a phonetic code:
#   SOUNDEX("Smith") → "S530"
#   SOUNDEX("Smyth") → "S530"  (same!)
#   SOUNDEX("John")  → "J500"
#   SOUNDEX("Jon")   → "J500"  (same!)
#
# Match on: SOUNDEX(last_name) + date_of_birth → fuzzy identity match

# Step 1: Normalize names and compute SOUNDEX codes
df_patients_normalized = (
    df_ehr
    .select("patient_id", "first_name", "last_name", "date_of_birth", "ssn", "gender")
    .withColumn("first_name_clean", trim(lower(col("first_name"))))
    .withColumn("last_name_clean", trim(lower(col("last_name"))))
    .withColumn("last_name_soundex", soundex("last_name_clean"))
    .withColumn("first_name_soundex", soundex("first_name_clean"))
)

df_patients_normalized.select(
    "first_name", "first_name_soundex", "last_name", "last_name_soundex", "date_of_birth"
).show(20, truncate=False)

# COMMAND ----------

# Step 2: Group by SOUNDEX(last_name) + DOB to find potential matches
# This creates "match groups" — patients who sound alike and share DOB

fuzzy_window = (
    Window
    .partitionBy("last_name_soundex", "date_of_birth")
    .orderBy("patient_id")  # Deterministic: keep first patient_id
)

df_patients_deduped = (
    df_patients_normalized
    .withColumn("row_num", row_number().over(fuzzy_window))
    .filter(col("row_num") == 1)  # Keep one record per match group
    .drop("row_num", "first_name_clean", "last_name_clean",
          "last_name_soundex", "first_name_soundex")
)

print(f"📊 Before fuzzy dedup: {df_patients_normalized.count()}")
print(f"📊 After fuzzy dedup:  {df_patients_deduped.count()}")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: SQL Equivalent — SOUNDEX + LEVENSHTEIN dedup
# ────────────────────────────────────────────────────────────────────────────
# SQL approach using CTE + window function:

df_patients_sql = spark.sql(f"""
    WITH normalized AS (
        SELECT DISTINCT
            patient_id,
            first_name,
            last_name,
            date_of_birth,
            ssn,
            gender,
            SOUNDEX(LOWER(TRIM(last_name))) AS soundex_last,
            SOUNDEX(LOWER(TRIM(first_name))) AS soundex_first,
            LOWER(TRIM(last_name)) AS clean_last,
            LOWER(TRIM(first_name)) AS clean_first
        FROM {silver_schema}.ehr_standardized
    ),
    ranked AS (
        SELECT *,
            ROW_NUMBER() OVER (
                PARTITION BY soundex_last, date_of_birth
                ORDER BY patient_id
            ) AS rn
        FROM normalized
    )
    SELECT
        patient_id, first_name, last_name, date_of_birth, ssn, gender
    FROM ranked
    WHERE rn = 1
""")

print(f"📊 SQL fuzzy dedup result: {df_patients_sql.count()} unique patients")
df_patients_sql.show(10, truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: Write Silver Patients Table
# ────────────────────────────────────────────────────────────────────────────

(
    df_patients_deduped
    .withColumn("_updated_at", current_timestamp())
    .write
    .mode("overwrite")
    .option("overwriteSchema", "true")
    .saveAsTable(f"{silver_schema}.patients")
)

print(f"✅ Silver patients table: {silver_schema}.patients")

# Verify uniqueness
dup_check = spark.sql(f"""
    SELECT patient_id, COUNT(*) cnt
    FROM {silver_schema}.patients
    GROUP BY patient_id
    HAVING cnt > 1
""")
print(f"🔍 Duplicate patient_ids: {dup_check.count()}")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: BROKEN — FIX REQUIRED
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   Section 2A only deduplicates on exact patient_id — misses fuzzy matches.
#
# TO FIX:
#   Replace dropDuplicates(["patient_id"]) with SOUNDEX-based fuzzy matching
#   as shown in Section 2B. Consider also adding LEVENSHTEIN distance
#   check for additional precision.
#
# CONCEPTS LEARNED:
#   1. SOUNDEX() for phonetic name matching
#   2. LEVENSHTEIN() for string distance measurement
#   3. Text normalization (LOWER, TRIM) before matching
#   4. ROW_NUMBER() with complex PARTITION BY for dedup
#   5. Master Patient Index (MPI) deduplication pattern
#
# NEXT → 04_patient_360.py — Build unified patient view with PII masking
# ────────────────────────────────────────────────────────────────────────────
