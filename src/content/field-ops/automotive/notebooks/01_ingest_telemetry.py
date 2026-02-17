# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 01_ingest_telemetry.py
# MISSION:  Automotive — IoT Predictive Maintenance
# STATUS:   BROKEN — Timestamp string NOT parsed to TimestampType
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Ingest 50,000 vehicle telemetry readings from JSON, flatten nested
#   tire pressure structs, and create proper timestamp columns for
#   downstream time-series analysis.
#
# WHAT YOU'LL LEARN:
#   ✅ JSON ingestion with nested structs (tire_pressure_psi.fl, .fr, .rl, .rr)
#   ✅ to_timestamp() for ISO-8601 parsing
#   ✅ Flattening nested JSON with col("struct.field")
#   ✅ SQL read_files() with schemaHints for nested JSON
#   ✅ Reference table loading (vehicles, DTC codes, service records)
#
# ⚠️ KNOWN BUG:
#   The timestamp column is left as a STRING! It needs to be parsed to
#   TimestampType using to_timestamp() for window functions to work.
#
# INPUT:
#   - /Volumes/{catalog}/{schema_prefix}_bronze/raw_data/vehicle_telemetry.json
#   - /Volumes/{catalog}/{schema_prefix}_bronze/raw_data/vehicles.csv
#   - /Volumes/{catalog}/{schema_prefix}_bronze/raw_data/dtc_codes.csv
#   - /Volumes/{catalog}/{schema_prefix}_bronze/raw_data/service_records.csv
#
# OUTPUT:
#   - {catalog}.{schema_prefix}_bronze.vehicle_telemetry
#   - {catalog}.{schema_prefix}_bronze.vehicles
#   - {catalog}.{schema_prefix}_bronze.dtc_codes
#   - {catalog}.{schema_prefix}_bronze.service_records
#
# DOCUMENTATION:
#   - to_timestamp:  https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.to_timestamp.html
#   - Nested JSON:   https://docs.databricks.com/en/optimizations/semi-structured.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
volume_path   = f"/Volumes/{catalog}/{schema_prefix}_bronze/raw_data"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Ingest Vehicle Telemetry (JSON) — PySpark
# ────────────────────────────────────────────────────────────────────────────
# Telemetry arrives as JSON Lines with a nested struct for tire pressure:
#   "tire_pressure_psi": {"fl": 33, "fr": 33, "rl": 36, "rr": 35}
#
# We flatten this to individual columns for analysis.

from pyspark.sql.types import (
    StructType, StructField, StringType, IntegerType, DoubleType, FloatType
)
from pyspark.sql.functions import (
    col, to_timestamp, current_timestamp, input_file_name
)

df_telemetry_raw = spark.read.json(f"{volume_path}/vehicle_telemetry.json")

print(f"📊 Raw telemetry readings: {df_telemetry_raw.count()}")
print("\n📋 Schema (note the nested tire_pressure_psi):")
df_telemetry_raw.printSchema()

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2: Flatten Nested Structs + Parse Timestamps
# ────────────────────────────────────────────────────────────────────────────
# The tire_pressure_psi field is a struct with 4 sub-fields.
# We flatten it to: tire_fl_psi, tire_fr_psi, tire_rl_psi, tire_rr_psi
#
# ⚠️ BUG: The timestamp column remains as STRING! Look carefully at
# the code below — `timestamp` is selected as-is without parsing.

df_telemetry = (
    df_telemetry_raw
    .select(
        col("reading_id"),
        col("vehicle_id"),
        col("timestamp"),                  # ⚠️ BUG: Still a STRING, not parsed!
        col("engine_rpm").cast("int"),
        col("speed_mph").cast("int"),
        col("throttle_position").cast("double"),
        col("engine_temp_f").cast("int"),
        col("oil_pressure_psi").cast("int"),
        col("battery_voltage").cast("double"),
        col("fuel_level_pct").cast("int"),
        # Flatten the nested struct
        col("tire_pressure_psi.fl").alias("tire_fl_psi").cast("int"),
        col("tire_pressure_psi.fr").alias("tire_fr_psi").cast("int"),
        col("tire_pressure_psi.rl").alias("tire_rl_psi").cast("int"),
        col("tire_pressure_psi.rr").alias("tire_rr_psi").cast("int"),
        col("latitude").cast("double"),
        col("longitude").cast("double"),
    )
    .withColumn("_ingested_at", current_timestamp())
    .withColumn("_source_file", input_file_name())
)

# The timestamp is still a string — this will cause errors in
# downstream window functions that ORDER BY timestamp!
print(f"⚠️ timestamp column type: {df_telemetry.schema['timestamp'].dataType}")
display(df_telemetry.select("reading_id", "vehicle_id", "timestamp", "engine_temp_f").limit(5))

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: SQL Alternative — read_files() with Nested JSON
# ────────────────────────────────────────────────────────────────────────────
# SQL approach to ingest & flatten in one query.
# NOTE: This version CORRECTLY parses the timestamp! Compare with above.

# ⚡ SQL APPROACH: Implement the correct SQL query yourself!
# No SQL hints are provided for this operation.
# Use the WHAT'S BROKEN section at the bottom and Databricks SQL docs for guidance.

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: Write Bronze Telemetry Table
# ────────────────────────────────────────────────────────────────────────────

df_telemetry.write.mode("overwrite").saveAsTable(f"{bronze_schema}.vehicle_telemetry")
print(f"✅ Bronze table: {bronze_schema}.vehicle_telemetry")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: Ingest Reference Tables
# ────────────────────────────────────────────────────────────────────────────

# --- Vehicles ---
df_vehicles = (
    spark.read.option("header", "true").option("inferSchema", "true")
    .csv(f"{volume_path}/vehicles.csv")
    .withColumn("_ingested_at", current_timestamp())
)
df_vehicles.write.mode("overwrite").saveAsTable(f"{bronze_schema}.vehicles")
print(f"✅ Vehicles: {df_vehicles.count()} → {bronze_schema}.vehicles")

# --- DTC Codes (Diagnostic Trouble Codes) ---
df_dtc = (
    spark.read.option("header", "true").option("inferSchema", "true")
    .csv(f"{volume_path}/dtc_codes.csv")
    .withColumn("_ingested_at", current_timestamp())
)
df_dtc.write.mode("overwrite").saveAsTable(f"{bronze_schema}.dtc_codes")
print(f"✅ DTC Codes: {df_dtc.count()} → {bronze_schema}.dtc_codes")

# --- Service Records ---
df_service = (
    spark.read.option("header", "true").option("inferSchema", "true")
    .csv(f"{volume_path}/service_records.csv")
    .withColumn("_ingested_at", current_timestamp())
)
df_service.write.mode("overwrite").saveAsTable(f"{bronze_schema}.service_records")
print(f"✅ Service Records: {df_service.count()} → {bronze_schema}.service_records")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 6: Data Quality Summary
# ────────────────────────────────────────────────────────────────────────────

display(spark.sql(f"""
    SELECT
        COUNT(*) AS total_readings,
        COUNT(DISTINCT vehicle_id) AS unique_vehicles,
        SUM(CASE WHEN timestamp IS NULL THEN 1 ELSE 0 END) AS null_timestamps,
        AVG(engine_temp_f) AS avg_engine_temp,
        AVG(oil_pressure_psi) AS avg_oil_pressure,
        AVG(battery_voltage) AS avg_battery_voltage,
        SUM(CASE WHEN engine_temp_f > 220 THEN 1 ELSE 0 END) AS high_temp_readings,
        SUM(CASE WHEN oil_pressure_psi < 20 THEN 1 ELSE 0 END) AS low_oil_readings,
        SUM(CASE WHEN battery_voltage < 12 THEN 1 ELSE 0 END) AS low_battery_readings
    FROM {bronze_schema}.vehicle_telemetry
"""))

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: BROKEN — Timestamp Not Parsed
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   The `timestamp` column is a STRING, not a TimestampType.
#   Downstream window functions (ORDER BY timestamp) will sort
#   lexicographically instead of chronologically!
#
# TO FIX:
#   Add this line after selecting columns:
#     .withColumn("timestamp",
#         to_timestamp(col("timestamp"), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
#     )
#
# CONCEPTS LEARNED:
#   1. JSON ingestion with nested struct flattening
#   2. col("struct.field") syntax for nested access
#   3. to_timestamp() for ISO-8601 parsing
#   4. read_files() SQL TVF as alternative
#   5. Data quality checks on IoT telemetry
#
# NEXT: Run 02_anomaly_detection.py to detect vehicle anomalies
# ────────────────────────────────────────────────────────────────────────────
