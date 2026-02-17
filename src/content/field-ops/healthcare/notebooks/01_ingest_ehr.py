# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 01_ingest_ehr.py
# MISSION:  Healthcare — Patient 360 Data Platform
# STATUS:   BROKEN — Missing schema evolution handling
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Ingest Electronic Health Record (EHR) JSON data into Bronze layer.
#   The EHR data has schema drift — different source systems contribute
#   records with varying schemas. The code must handle this gracefully.
#
# WHAT YOU'LL LEARN:
#   ✅ JSON ingestion with schema evolution (mergeSchema)
#   ✅ PySpark: spark.read.json() with multiLine option
#   ✅ SQL: read_files() with rescuedDataColumn for schema safety
#   ✅ Delta Lake schema evolution with mergeSchema option
#   ✅ Handling nested JSON structures (StructType)
#   ✅ Data lineage tracking with _metadata columns
#
# INPUT:
#   Volume: /Volumes/{catalog}/{schema_prefix}_bronze/raw_files/ehr_records.json
#
# OUTPUT:
#   Table: {catalog}.{schema_prefix}_bronze.ehr_records
#
# HINTS:
#   - The BUG is that write does NOT include mergeSchema option
#   - When re-run with evolved schema, it fails with schema mismatch error
#   - FIX: Add .option("mergeSchema", "true") to the write operation
#
# DOCUMENTATION:
#   - Schema evolution: https://docs.databricks.com/en/delta/update-schema.html
#   - JSON source:      https://docs.databricks.com/en/query/formats/json.html
#   - mergeSchema:      https://docs.databricks.com/en/delta/update-schema.html#enable-schema-evolution
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
silver_schema = f"{catalog}.{schema_prefix}_silver"
gold_schema   = f"{catalog}.{schema_prefix}_gold"

volume_path = f"/Volumes/{catalog}/{schema_prefix}_bronze/raw_files"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Explore EHR Data Structure
# ────────────────────────────────────────────────────────────────────────────

raw_text = dbutils.fs.head(f"{volume_path}/ehr_records.json", 3000)
print(raw_text)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2: Read EHR JSON with PySpark
# ────────────────────────────────────────────────────────────────────────────
# EHR data often has nested structures (patient -> demographics, vitals, etc.)
# Use schema inference for initial exploration, then lock down the schema.

from pyspark.sql.functions import (
    col, current_timestamp, input_file_name, explode, to_date, to_timestamp
)

# Read JSON with schema inference to discover structure
df_ehr = (
    spark.read
    .format("json")
    .option("multiLine", "false")  # NDJSON format
    .option("mode", "PERMISSIVE")  # Don't fail on bad records
    .option("columnNameOfCorruptRecord", "_corrupt_record")
    .load(f"{volume_path}/ehr_records.json")
)

print(f"📊 EHR records: {df_ehr.count()}")
df_ehr.printSchema()
display(df_ehr.limit(10))

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: SQL read_files() with Rescued Data Column
# ────────────────────────────────────────────────────────────────────────────
# The rescuedDataColumn captures any fields that don't match the schema,
# ensuring NO data is lost even when the schema evolves.

df_ehr_sql = spark.sql(f"""
    SELECT *
    FROM read_files(
        '{volume_path}/ehr_records.json',
        format => 'json',
        rescuedDataColumn => '_rescued_data'
    )
""")

display(df_ehr_sql.limit(5))

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: Flatten Nested Structures
# ────────────────────────────────────────────────────────────────────────────
# EHR data often has nested JSON. Flatten it for easier downstream use.

df_ehr_flat = (
    df_ehr
    .withColumn("_ingested_at", current_timestamp())
    .withColumn("_source_file", input_file_name())
)

display(df_ehr_flat.limit(10))

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: Write to Bronze — ⚠️ BUG: Missing mergeSchema
# ────────────────────────────────────────────────────────────────────────────
# In healthcare, EHR systems evolve their schemas frequently — new fields
# are added for regulatory compliance, new lab test types, etc.
#
# ⚠️ BUG: The write below does NOT handle schema evolution.
# When re-run with data that has new columns, it will FAIL with:
#   "AnalysisException: A schema mismatch detected when writing to Delta table"
#
# FIX: Add .option("mergeSchema", "true") to allow new columns.

(
    df_ehr_flat
    .write
    .mode("overwrite")                  # Overwrite for initial load
    # .option("mergeSchema", "true")    # ⚠️ BUG: This line is missing!
    .saveAsTable(f"{bronze_schema}.ehr_records")
)

print(f"✅ Bronze EHR table created: {bronze_schema}.ehr_records")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 6: Ingest Supporting Data Files
# ────────────────────────────────────────────────────────────────────────────

# Lab results
df_labs = (
    spark.read.format("csv")
    .option("header", "true").option("inferSchema", "true")
    .load(f"{volume_path}/lab_results.csv")
    .withColumn("_ingested_at", current_timestamp())
)
df_labs.write.mode("overwrite").saveAsTable(f"{bronze_schema}.lab_results")
print(f"✅ lab_results: {df_labs.count()} rows")

# Appointments
df_appts = (
    spark.read.format("csv")
    .option("header", "true").option("inferSchema", "true")
    .load(f"{volume_path}/appointments.csv")
    .withColumn("_ingested_at", current_timestamp())
)
df_appts.write.mode("overwrite").saveAsTable(f"{bronze_schema}.appointments")
print(f"✅ appointments: {df_appts.count()} rows")

# Insurance claims
df_claims = (
    spark.read.format("csv")
    .option("header", "true").option("inferSchema", "true")
    .load(f"{volume_path}/insurance_claims.csv")
    .withColumn("_ingested_at", current_timestamp())
)
df_claims.write.mode("overwrite").saveAsTable(f"{bronze_schema}.insurance_claims")
print(f"✅ insurance_claims: {df_claims.count()} rows")

# Reference data: ICD-10 and LOINC codes
for ref_file in ["icd10_codes.csv", "loinc_codes.csv"]:
    table_name = ref_file.replace(".csv", "")
    df_ref = (
        spark.read.format("csv")
        .option("header", "true").option("inferSchema", "true")
        .load(f"{volume_path}/{ref_file}")
    )
    df_ref.write.mode("overwrite").saveAsTable(f"{bronze_schema}.{table_name}")
    print(f"✅ {table_name}: {df_ref.count()} rows")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: BROKEN — FIX REQUIRED
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   Schema evolution is not enabled on the Delta write. When the EHR source
#   system adds new columns (which happens frequently in healthcare),
#   the pipeline will fail with a schema mismatch error.
#
# TO FIX:
#   Add .option("mergeSchema", "true") to the write in Section 5.
#
# CONCEPTS LEARNED:
#   1. JSON ingestion with PERMISSIVE mode for bad records
#   2. rescuedDataColumn to capture schema-mismatched data
#   3. Schema evolution with mergeSchema option
#   4. Flattening nested JSON structures
#   5. Multiple data source ingestion into Bronze
#
# NEXT → 02_standardize_codes.py — Map ICD-10/LOINC codes
# ────────────────────────────────────────────────────────────────────────────
