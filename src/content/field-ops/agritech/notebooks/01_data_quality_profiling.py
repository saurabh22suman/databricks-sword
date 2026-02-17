# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 01_data_quality_profiling.py
# MISSION:  AgriTech — Precision Agriculture Data Platform
# STATUS:   BROKEN — Validation ranges too strict (pH 6-8, should be 4-9)
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Profile soil sensor data quality and implement validation rules.
#   15% of sensor readings have data quality issues: out-of-range pH,
#   GPS drift, missing timestamps, extreme moisture values.
#
# WHAT YOU'LL LEARN:
#   ✅ Data profiling with summary statistics
#   ✅ Data quality rules with CASE WHEN / when()
#   ✅ Validation ranges for agricultural sensors
#   ✅ Quarantine pattern: separate clean vs dirty data
#   ✅ Data quality dashboards and metrics
#
# ⚠️ KNOWN BUG:
#   pH validation range is 6.0–8.0 (too strict for agriculture).
#   Correct range: 4.0–9.0 (acidic blueberries at 4.5, alkaline soils at 8.5).
#   The strict range falsely rejects ~30% of valid readings.
#
# SENSOR DATA QUALITY REFERENCE:
#   pH:         4.0 – 9.0   (soil pH, not blood pH!)
#   Moisture:   0 – 100%    (volumetric water content)
#   Temp:       -10 – 50°C  (soil temperature range)
#   N/P/K ppm:  0 – 500     (macro nutrient levels)
#   EC:         0 – 5 dS/m  (electrical conductivity - salinity)
#
# INPUT:
#   - /Volumes/{catalog}/{schema_prefix}_bronze/raw_data/soil_sensors.json
#   - /Volumes/{catalog}/{schema_prefix}_bronze/raw_data/fields.csv
#
# OUTPUT:
#   - {catalog}.{schema_prefix}_bronze.soil_sensors (all data)
#   - {catalog}.{schema_prefix}_silver.soil_sensors_clean (validated data)
#   - {catalog}.{schema_prefix}_bronze.soil_sensors_quarantine (bad data)
#
# DOCUMENTATION:
#   - describe(): https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.describe.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
silver_schema = f"{catalog}.{schema_prefix}_silver"
volume_path   = f"/Volumes/{catalog}/{schema_prefix}_bronze/raw_data"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Ingest Raw Sensor Data
# ────────────────────────────────────────────────────────────────────────────

from pyspark.sql.functions import (
    col, when, count, sum as spark_sum, avg, min as spark_min,
    max as spark_max, round as spark_round, current_timestamp,
    to_timestamp, lit, percentile_approx
)

df_sensors = (
    spark.read.json(f"{volume_path}/soil_sensors.json")
    .withColumn("event_ts",
        to_timestamp(col("timestamp"), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
    )
    .withColumn("_ingested_at", current_timestamp())
)

df_sensors.write.mode("overwrite").saveAsTable(f"{bronze_schema}.soil_sensors")
print(f"📊 Raw sensor readings: {df_sensors.count()}")

# Ingest fields reference
df_fields = (
    spark.read.option("header", "true").option("inferSchema", "true")
    .csv(f"{volume_path}/fields.csv")
    .withColumn("_ingested_at", current_timestamp())
)
df_fields.write.mode("overwrite").saveAsTable(f"{bronze_schema}.fields")
print(f"📊 Fields: {df_fields.count()}")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2: Data Profiling — Summary Statistics
# ────────────────────────────────────────────────────────────────────────────
# Before setting validation rules, profile the data to understand distributions.

display(
    df_sensors
    .select("moisture_percent", "temperature_c", "ph_level",
            "nitrogen_ppm", "phosphorus_ppm", "potassium_ppm",
            "electrical_conductivity")
    .describe()
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Percentile Analysis
# ────────────────────────────────────────────────────────────────────────────
# Look at p1, p5, p95, p99 to find the natural range of values.
# Data outside p1-p99 is likely noise or sensor malfunction.

display(spark.sql(f"""
    SELECT
        PERCENTILE(ph_level, 0.01) AS ph_p01,
        PERCENTILE(ph_level, 0.05) AS ph_p05,
        PERCENTILE(ph_level, 0.50) AS ph_p50,
        PERCENTILE(ph_level, 0.95) AS ph_p95,
        PERCENTILE(ph_level, 0.99) AS ph_p99,
        PERCENTILE(moisture_percent, 0.01) AS moisture_p01,
        PERCENTILE(moisture_percent, 0.99) AS moisture_p99,
        PERCENTILE(temperature_c, 0.01) AS temp_p01,
        PERCENTILE(temperature_c, 0.99) AS temp_p99
    FROM {bronze_schema}.soil_sensors
"""))

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: Apply Validation Rules (⚠️ BUG: pH Range Too Strict!)
# ────────────────────────────────────────────────────────────────────────────
# Flag each reading with quality checks.
#
# ⚠️ BUG: pH range 6.0-8.0 is for neutral soils only!
# Many crops thrive in acidic soil (blueberries pH 4.5, potatoes pH 5.0)
# or moderately alkaline soil (asparagus pH 8.0-8.5).
# The correct agricultural range is 4.0-9.0.

df_validated = (
    df_sensors
    .withColumn("qc_timestamp",
        when(col("event_ts").isNull(), "FAIL").otherwise("PASS")
    )
    .withColumn("qc_moisture",
        when((col("moisture_percent") >= 0) & (col("moisture_percent") <= 100), "PASS")
        .otherwise("FAIL")
    )
    .withColumn("qc_temperature",
        when((col("temperature_c") >= -10) & (col("temperature_c") <= 50), "PASS")
        .otherwise("FAIL")
    )
    .withColumn("qc_ph",
        # ⚠️ BUG: Range 6.0-8.0 is WAY too strict for agriculture!
        # Rejects acidic soils (pH 4-6) and alkaline soils (pH 8-9)
        when((col("ph_level") >= 6.0) & (col("ph_level") <= 8.0), "PASS")  # ⚠️ BUG!
        .otherwise("FAIL")
        # FIX: when((col("ph_level") >= 4.0) & (col("ph_level") <= 9.0), "PASS")
    )
    .withColumn("qc_nitrogen",
        when((col("nitrogen_ppm") >= 0) & (col("nitrogen_ppm") <= 500), "PASS")
        .otherwise("FAIL")
    )
    .withColumn("qc_ec",
        when((col("electrical_conductivity") >= 0) & (col("electrical_conductivity") <= 5), "PASS")
        .otherwise("FAIL")
    )
    .withColumn(
        "is_valid",
        (col("qc_timestamp") == "PASS") &
        (col("qc_moisture") == "PASS") &
        (col("qc_temperature") == "PASS") &
        (col("qc_ph") == "PASS") &
        (col("qc_nitrogen") == "PASS") &
        (col("qc_ec") == "PASS")
    )
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: Data Quality Summary
# ────────────────────────────────────────────────────────────────────────────

total = df_validated.count()
valid = df_validated.filter(col("is_valid")).count()
invalid = total - valid

print(f"📊 Data Quality Report:")
print(f"   Total readings:   {total}")
print(f"   Valid readings:   {valid} ({100*valid/total:.1f}%)")
print(f"   Invalid readings: {invalid} ({100*invalid/total:.1f}%)")
print(f"   ⚠️ If >30% fail, the pH range is probably too strict!")

# Per-check failure breakdown
display(spark.sql(f"""
    SELECT
        SUM(CASE WHEN qc_timestamp = 'FAIL' THEN 1 ELSE 0 END) AS timestamp_failures,
        SUM(CASE WHEN qc_moisture = 'FAIL' THEN 1 ELSE 0 END) AS moisture_failures,
        SUM(CASE WHEN qc_temperature = 'FAIL' THEN 1 ELSE 0 END) AS temperature_failures,
        SUM(CASE WHEN qc_ph = 'FAIL' THEN 1 ELSE 0 END) AS ph_failures,
        SUM(CASE WHEN qc_nitrogen = 'FAIL' THEN 1 ELSE 0 END) AS nitrogen_failures,
        SUM(CASE WHEN qc_ec = 'FAIL' THEN 1 ELSE 0 END) AS ec_failures
    FROM {bronze_schema}.soil_sensors_validated
"""))

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 6: Split into Clean + Quarantine
# ────────────────────────────────────────────────────────────────────────────
# Clean data → Silver for downstream analysis
# Bad data → Quarantine for investigation + re-processing

# Save validated with QC columns
df_validated.write.mode("overwrite").saveAsTable(f"{bronze_schema}.soil_sensors_validated")

# Clean data → Silver
(
    df_validated
    .filter(col("is_valid"))
    .drop("qc_timestamp", "qc_moisture", "qc_temperature", "qc_ph",
          "qc_nitrogen", "qc_ec", "is_valid")
    .write.mode("overwrite").saveAsTable(f"{silver_schema}.soil_sensors_clean")
)
print(f"✅ Silver clean: {silver_schema}.soil_sensors_clean")

# Quarantine → Bronze for investigation
(
    df_validated
    .filter(~col("is_valid"))
    .write.mode("overwrite").saveAsTable(f"{bronze_schema}.soil_sensors_quarantine")
)
print(f"⚠️ Quarantine: {bronze_schema}.soil_sensors_quarantine")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: BROKEN — pH Validation Too Strict
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   pH validation range is 6.0–8.0 (neutral only).
#   Agricultural soils range from pH 4.0 (blueberries) to 9.0 (alkaline).
#   The strict range falsely rejects 30%+ of valid readings.
#
# TO FIX:
#   Change: when((col("ph_level") >= 6.0) & (col("ph_level") <= 8.0), "PASS")
#   To:     when((col("ph_level") >= 4.0) & (col("ph_level") <= 9.0), "PASS")
#
# CONCEPTS LEARNED:
#   1. Data profiling with describe() and PERCENTILE
#   2. Validation rules with when() / CASE WHEN
#   3. Quarantine pattern: clean vs bad data separation
#   4. Domain-specific validation ranges
#   5. Data quality dashboards with per-check breakdowns
#
# NEXT: Run 02_multi_source_enrichment.py to join sensor + weather + satellite
# ────────────────────────────────────────────────────────────────────────────
