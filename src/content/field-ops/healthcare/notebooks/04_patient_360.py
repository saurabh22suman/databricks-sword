# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 04_patient_360.py
# MISSION:  Healthcare — Patient 360 Data Platform
# STATUS:   PARTIAL — Missing PII masking (HIPAA compliance)
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Create a unified Patient 360 view by aggregating data from multiple
#   sources (EHR, labs, appointments, claims) into a single Gold table.
#   CRITICAL: SSN must be masked for HIPAA compliance.
#
# WHAT YOU'LL LEARN:
#   ✅ Multi-source aggregation for 360 views
#   ✅ PII masking with regexp_replace() and SQL MASK()
#   ✅ Complex SQL JOINs with aggregation
#   ✅ PySpark LEFT JOIN chaining
#   ✅ CASE WHEN for risk score calculation
#   ✅ Gold layer as business-ready analytics
#
# INPUT:
#   - {catalog}.{schema_prefix}_silver.patients
#   - {catalog}.{schema_prefix}_bronze.lab_results
#   - {catalog}.{schema_prefix}_bronze.appointments
#   - {catalog}.{schema_prefix}_bronze.insurance_claims
#
# OUTPUT:
#   - {catalog}.{schema_prefix}_gold.patient_360
#     Required columns: patient_id, name, dob, masked_ssn,
#                       total_visits, last_visit, risk_score
#
# HINTS:
#   - The SSN masking is MISSING — SSNs are written unmasked to Gold!
#   - FIX: Use regexp_replace(ssn, '\\d{3}-\\d{2}', 'XXX-XX') to mask
#   - Or SQL: CONCAT('XXX-XX-', RIGHT(ssn, 4)) to show last 4 only
#
# DOCUMENTATION:
#   - regexp_replace: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.regexp_replace.html
#   - SQL CONCAT:     https://docs.databricks.com/en/sql/language-manual/functions/concat.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
silver_schema = f"{catalog}.{schema_prefix}_silver"
gold_schema   = f"{catalog}.{schema_prefix}_gold"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Load All Data Sources
# ────────────────────────────────────────────────────────────────────────────

df_patients = spark.read.table(f"{silver_schema}.patients")
df_labs     = spark.read.table(f"{bronze_schema}.lab_results")
df_appts    = spark.read.table(f"{bronze_schema}.appointments")
df_claims   = spark.read.table(f"{bronze_schema}.insurance_claims")

print(f"📊 Patients:     {df_patients.count()}")
print(f"📊 Lab Results:  {df_labs.count()}")
print(f"📊 Appointments: {df_appts.count()}")
print(f"📊 Claims:       {df_claims.count()}")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2: Aggregate Visit Metrics per Patient
# ────────────────────────────────────────────────────────────────────────────

from pyspark.sql.functions import (
    col, count, max as spark_max, min as spark_min, avg,
    sum as spark_sum, datediff, current_date, when,
    round as spark_round, concat_ws, regexp_replace, lit,
    current_timestamp
)

# Appointment metrics
df_visit_metrics = (
    df_appts
    .groupBy("patient_id")
    .agg(
        count("*").alias("total_visits"),
        spark_max("appointment_date").alias("last_visit"),
        spark_min("appointment_date").alias("first_visit"),
        count(when(col("status") == "completed", True)).alias("completed_visits"),
        count(when(col("status") == "no_show", True)).alias("no_shows"),
    )
)

# Lab metrics
df_lab_metrics = (
    df_labs
    .groupBy("patient_id")
    .agg(
        count("*").alias("total_lab_tests"),
        count(when(col("result_flag") == "abnormal", True)).alias("abnormal_results"),
    )
)

# Claims metrics
df_claims_metrics = (
    df_claims
    .groupBy("patient_id")
    .agg(
        count("*").alias("total_claims"),
        spark_sum("claim_amount").alias("total_claim_amount"),
        avg("claim_amount").alias("avg_claim_amount"),
    )
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Build Patient 360 View
# ────────────────────────────────────────────────────────────────────────────
# Join all metrics with the patient master record.
# Always use LEFT JOINs so patients without visits/labs/claims are kept.

df_patient_360 = (
    df_patients
    .join(df_visit_metrics, "patient_id", "left")
    .join(df_lab_metrics, "patient_id", "left")
    .join(df_claims_metrics, "patient_id", "left")
    .fillna(0, subset=["total_visits", "total_lab_tests", "total_claims",
                        "no_shows", "abnormal_results"])
)

display(df_patient_360.limit(10))

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: Calculate Risk Score
# ────────────────────────────────────────────────────────────────────────────
# A simple risk scoring model based on multiple factors.
# In production, this would be an ML model — here we use rule-based scoring.

df_patient_360_scored = (
    df_patient_360
    .withColumn(
        "days_since_last_visit",
        when(col("last_visit").isNotNull(),
             datediff(current_date(), col("last_visit"))
        ).otherwise(365)
    )
    .withColumn(
        "risk_score",
        spark_round(
            (when(col("no_shows") > 3, 25).otherwise(col("no_shows") * 5))
            + (when(col("abnormal_results") > 5, 30).otherwise(col("abnormal_results") * 5))
            + (when(col("days_since_last_visit") > 180, 20)
               .when(col("days_since_last_visit") > 90, 10)
               .otherwise(0))
            + (when(col("total_claims") > 10, 15).otherwise(0)),
            1
        )
    )
    .withColumn(
        "risk_level",
        when(col("risk_score") >= 60, "HIGH")
        .when(col("risk_score") >= 30, "MEDIUM")
        .otherwise("LOW")
    )
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: PII Masking — ⚠️ BUG: SSN NOT MASKED!
# ────────────────────────────────────────────────────────────────────────────
# HIPAA requires that SSN is masked in analytics tables.
# The Gold table should NEVER contain raw SSNs.
#
# ⚠️ BUG: The line below does NOT mask the SSN — it just renames it.
# The SSN is written in plain text to the Gold table!
#
# FIX OPTIONS:
# PySpark: regexp_replace(col("ssn"), "\\d{3}-\\d{2}", "XXX-XX")
# SQL:     CONCAT('XXX-XX-', RIGHT(ssn, 4))

df_patient_360_final = (
    df_patient_360_scored
    .withColumn("masked_ssn", col("ssn"))   # ⚠️ BUG: Not actually masking!
    .withColumn("full_name", concat_ws(" ", "first_name", "last_name"))
    .withColumn("_created_at", current_timestamp())
    .select(
        "patient_id",
        "full_name",
        "date_of_birth",
        "masked_ssn",           # ⚠️ Contains raw SSN — FIX THIS!
        "gender",
        "total_visits",
        "last_visit",
        "first_visit",
        "completed_visits",
        "no_shows",
        "total_lab_tests",
        "abnormal_results",
        "total_claims",
        "total_claim_amount",
        "risk_score",
        "risk_level",
        "_created_at",
    )
)

display(df_patient_360_final.limit(10))

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 6: Write Gold Patient 360 Table
# ────────────────────────────────────────────────────────────────────────────

(
    df_patient_360_final
    .write
    .mode("overwrite")
    .option("overwriteSchema", "true")
    .saveAsTable(f"{gold_schema}.patient_360")
)

print(f"✅ Gold table: {gold_schema}.patient_360")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 7: SQL Equivalent — Complete Patient 360 in One Query
# ────────────────────────────────────────────────────────────────────────────
# This is how you'd build the same thing as a pure SQL query — common
# when creating Databricks SQL dashboards.

# ⚡ SQL APPROACH: Implement the correct SQL query yourself!
# No SQL hints are provided for this operation.
# Use the WHAT'S BROKEN section at the bottom and Databricks SQL docs for guidance.

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 8: Validation
# ────────────────────────────────────────────────────────────────────────────

# Check 1: SSN is masked (should show XXX-XX-XXXX pattern)
ssn_check = spark.sql(f"""
    SELECT COUNT(*) AS unmasked_ssns
    FROM {gold_schema}.patient_360
    WHERE masked_ssn NOT RLIKE '^XXX-XX-[0-9]{{4}}$'
      AND masked_ssn IS NOT NULL
""")
unmasked = ssn_check.collect()[0]["unmasked_ssns"]
print(f"{'✅' if unmasked == 0 else '❌'} SSN Masking: {unmasked} unmasked SSNs found")

# Check 2: All patients have records
pat_count = spark.read.table(f"{gold_schema}.patient_360").count()
print(f"✅ Patient 360 table has {pat_count} patients")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: PARTIAL — FIX REQUIRED
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   SSN masking is not implemented — raw SSNs are written to Gold!
#
# TO FIX:
#   Replace: .withColumn("masked_ssn", col("ssn"))
#   With:    .withColumn("masked_ssn", regexp_replace(col("ssn"), "\\d{3}-\\d{2}", "XXX-XX"))
#   Or:      .withColumn("masked_ssn", concat(lit("XXX-XX-"), col("ssn").substr(-4, 4)))
#
# CONCEPTS LEARNED:
#   1. Multi-source aggregation for 360-degree views
#   2. LEFT JOIN chaining for comprehensive data
#   3. PII masking with regexp_replace() and SQL CONCAT
#   4. CASE WHEN for rule-based risk scoring
#   5. HIPAA compliance patterns in data engineering
#
# MISSION COMPLETE when SSN masking validation passes! 🏆
# ────────────────────────────────────────────────────────────────────────────
