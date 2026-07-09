# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 01_ingest_abstracts.py
# MISSION:  medtech-research — Medical Research Discovery
# STATUS:   BROKEN — Year filter uses > instead of >=
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Ingest 100 PubMed abstracts to the Bronze layer of the medtech-research
#   medallion architecture. Bronze holds raw, immutable data — no
#   transformations, no filtering beyond validation.
#
# WHAT YOU'LL LEARN:
#   ✅ Reading JSON from a Unity Catalog Volume
#   ✅ Parsing nested arrays (authors, keywords) with PySpark
#   ✅ Writing to Bronze Delta tables with proper schema enforcement
#   ✅ Multi-line JSON parsing with spark.read.json()
#
# ⚠️ KNOWN BUG:
#   The year filter on line ~85 uses `year > 2020` instead of `year >= 2020`.
#   This excludes 2020 papers from Bronze. The validation query expects
#   `year >= 2020` to find at least 80 records, but with `>` you only get
#   papers from 2021-2026 (~60-70 records).
#
# FEATURE STORE / DELTA CONCEPTS:
#   - Bronze layer: raw, immutable, append-only
#   - JSON schema enforcement with `spark.read.json()` infers the schema
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = spark.conf.get("catalog_name", "main")
schema_prefix = spark.conf.get("schema_prefix", "dbsword_medtech")

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
raw_volume_path = f"/Volumes/{catalog}/{schema_prefix}_bronze/raw_data"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Verify data file is in the raw_data Volume
# ────────────────────────────────────────────────────────────────────────────

import os
files = dbutils.fs.ls(raw_volume_path)
json_files = [f.path for f in files if f.path.endswith(".json")]
print(f"📁 Found {len(json_files)} JSON file(s) in {raw_volume_path}")
assert len(json_files) > 0, "No JSON files found — check that the bundle's data/ folder was synced"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2: Read raw abstracts
# ────────────────────────────────────────────────────────────────────────────

raw_path = json_files[0]
df_raw = spark.read.option("multiline", "true").json(raw_path)
print(f"📊 Total records read: {df_raw.count()}")
print(f"📊 Columns: {df_raw.columns}")
df_raw.show(3, truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Filter to recent papers (≥ 2020)
# ────────────────────────────────────────────────────────────────────────────
# Only keep abstracts from 2020 onwards — the FDA review only cares about
# recent literature (last 5 years of research).
#
# ⚠️ BUG: This filter uses `>` instead of `>=` — it excludes 2020 papers!
# The validation expects `year >= 2020` to find 80+ records, but with `>`
# you only get papers from 2021-2026 (around 60-70).

from pyspark.sql.functions import col

df_filtered = df_raw.filter(col("year") > 2020)  # ⚠️ BUG: should be >=

print(f"📊 Records after year filter: {df_filtered.count()}")
print(f"   (Expected: 80 with `year >= 2020`, but only ~60-70 with `year > 2020`)")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: Write to Bronze Delta table
# ────────────────────────────────────────────────────────────────────────────

bronze_table = f"{bronze_schema}.papers_raw"

# Write with mergeSchema to handle nested fields like authors[], keywords[]
(df_filtered.write
    .format("delta")
    .mode("overwrite")
    .option("mergeSchema", "true")
    .saveAsTable(bronze_table))

print(f"✅ Wrote {df_filtered.count()} records to {bronze_table}")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: Validation
# ────────────────────────────────────────────────────────────────────────────

count = spark.read.table(bronze_table).count()
print(f"{'✅' if count >= 80 else '❌'} Bronze has {count} records (expected >= 80)")
if count < 80:
    print("   HINT: The year filter on the 'Filter to recent papers' section")
    print("          uses `>` which excludes 2020 papers. Use `>=` instead.")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: BROKEN — Year filter operator
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   df_raw.filter(col("year") > 2020) excludes 2020 papers.
#
# TO FIX:
#   Change `>` to `>=`:
#     df_filtered = df_raw.filter(col("year") >= 2020)
#
# CONCEPTS LEARNED:
#   1. Reading JSON from UC Volumes with spark.read.json()
#   2. Parsing nested arrays (authors, keywords) — Spark infers the schema
#   3. Bronze layer pattern: raw, immutable, append-only
#   4. Write with mergeSchema to handle evolving nested fields
#
# MISSION COMPLETE when Bronze validation passes (count >= 80)! 🏆
# ────────────────────────────────────────────────────────────────────────────