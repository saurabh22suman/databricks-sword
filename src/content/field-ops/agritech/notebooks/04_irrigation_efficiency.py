# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 04_irrigation_efficiency.py
# MISSION:  AgriTech — Precision Agriculture Data Platform
# STATUS:   BROKEN — Per-event water calc instead of weekly aggregate
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Calculate irrigation water use efficiency (WUE) metrics per field.
#   WUE measures how effectively applied water translates to crop yield.
#   This notebook aggregates irrigation logs, joins with yield data,
#   and computes efficiency KPIs at the field-crop level.
#
# WHAT YOU'LL LEARN:
#   ✅ Time-window aggregations (weekly vs per-event)
#   ✅ date_trunc() for grouping by week/month
#   ✅ Multiple aggregation levels in one pipeline
#   ✅ Joining time-series data at different granularities
#   ✅ Domain-specific KPIs (WUE = yield / water_applied)
#
# ⚠️ KNOWN BUG:
#   Water efficiency is calculated PER IRRIGATION EVENT instead of
#   aggregated at the WEEKLY level first. This produces misleading
#   efficiency numbers because a single irrigation event's water_used
#   is tiny compared to total yield (which is a season aggregate).
#   FIX: Aggregate irrigation to weekly totals with date_trunc(),
#        then compute efficiency on the weekly aggregates.
#
# DATA:
#   - irrigation_logs.csv (5K rows): field_id, start_time, duration_min,
#     water_used_liters, method (drip|sprinkler|flood), trigger_type
#   - harvest_records.csv (500 rows): field_id, crop, harvest_date,
#     yield_kg, quality_grade, season
#   - fields.csv (200 rows): field_id, crop_type, acreage
#
# INPUT:
#   - /Volumes/.../irrigation_logs.csv
#   - /Volumes/.../harvest_records.csv
#   - {catalog}.{schema_prefix}_bronze.fields
#
# OUTPUT:
#   - {catalog}.{schema_prefix}_silver.irrigation_weekly
#   - {catalog}.{schema_prefix}_gold.irrigation_efficiency
#
# DOCUMENTATION:
#   - date_trunc:  https://docs.databricks.com/en/sql/language-manual/functions/date_trunc.html
#   - Aggregation: https://docs.databricks.com/en/sql/language-manual/sql-ref-functions-builtin.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
silver_schema = f"{catalog}.{schema_prefix}_silver"
gold_schema   = f"{catalog}.{schema_prefix}_gold"
volume_path   = f"/Volumes/{catalog}/{schema_prefix}_bronze/raw_data"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Load Irrigation Logs and Harvest Records
# ────────────────────────────────────────────────────────────────────────────

from pyspark.sql.functions import (
    col, to_timestamp, to_date, date_trunc, sum as spark_sum,
    avg, count, round as spark_round, when, lit,
    current_timestamp, broadcast, min as spark_min, max as spark_max
)

# Load irrigation logs
df_irrigation = (
    spark.read.option("header", "true").option("inferSchema", "true")
    .csv(f"{volume_path}/irrigation_logs.csv")
    .withColumn("start_ts", to_timestamp(col("start_time")))
    .withColumn("irrigation_date", to_date(col("start_ts")))
)
df_irrigation.write.mode("overwrite").saveAsTable(f"{bronze_schema}.irrigation_logs")

# Load harvest records
df_harvest = (
    spark.read.option("header", "true").option("inferSchema", "true")
    .csv(f"{volume_path}/harvest_records.csv")
    .withColumn("harvest_dt", to_date(col("harvest_date")))
)
df_harvest.write.mode("overwrite").saveAsTable(f"{bronze_schema}.harvest_records")

# Load fields reference
df_fields = spark.read.table(f"{bronze_schema}.fields")

print(f"📊 Irrigation events: {df_irrigation.count()}")
print(f"📊 Harvest records:   {df_harvest.count()}")
print(f"📊 Fields:            {df_fields.count()}")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2: Irrigation Method Analysis
# ────────────────────────────────────────────────────────────────────────────
# Understand the distribution of irrigation methods and water usage.

display(
    df_irrigation
    .groupBy("method")
    .agg(
        count("*").alias("event_count"),
        spark_round(avg("water_used_liters"), 2).alias("avg_water_liters"),
        spark_round(avg("duration_minutes"), 2).alias("avg_duration_min"),
        spark_round(spark_sum("water_used_liters"), 0).alias("total_water_liters"),
    )
    .orderBy("method")
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Water Usage Aggregation (⚠️ BUG: Per-Event, Not Weekly!)
# ────────────────────────────────────────────────────────────────────────────
# ⚠️ BUG: This calculates water_use_efficiency per INDIVIDUAL event.
# Each irrigation event uses ~50-200L, while yield is a SEASONAL total
# (e.g., 5000 kg). Computing yield/water_per_event gives absurdly high
# efficiency numbers (e.g., 100+ kg/L instead of ~0.85 kg/L).
#
# FIX: First aggregate irrigation to WEEKLY totals using date_trunc(),
# then compute efficiency on those weekly aggregates.

# BUG: Per-event "efficiency" — meaningless metric!
df_per_event = (
    df_irrigation
    .withColumn("water_efficiency",
        col("water_used_liters") / col("duration_minutes")  # L/min per event
    )
)

# What we SHOULD do: weekly aggregation
# df_weekly = (
#     df_irrigation
#     .withColumn("week_start", date_trunc("week", col("irrigation_date")))
#     .groupBy("field_id", "week_start", "method")
#     .agg(
#         spark_sum("water_used_liters").alias("weekly_water_liters"),
#         spark_sum("duration_minutes").alias("weekly_duration_min"),
#         count("*").alias("irrigation_events"),
#     )
# )

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: SQL Weekly Aggregation (Correct Approach)
# ────────────────────────────────────────────────────────────────────────────

# ⚡ SQL APPROACH: Implement the correct SQL query yourself!
# No SQL hints are provided for this operation.
# Use the WHAT'S BROKEN section at the bottom and Databricks SQL docs for guidance.

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: Write Per-Event Data (Bug — Should Be Weekly)
# ────────────────────────────────────────────────────────────────────────────

(
    df_per_event
    .withColumn("_computed_at", current_timestamp())
    .write
    .mode("overwrite")
    .option("overwriteSchema", "true")
    .saveAsTable(f"{silver_schema}.irrigation_weekly")  # Misleading table name!
)

print(f"⚠️ Table written: {silver_schema}.irrigation_weekly")
print("⚠️ WARNING: Data is per-event, NOT weekly — table name is misleading!")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 6: Compute Water Use Efficiency (WUE)
# ────────────────────────────────────────────────────────────────────────────
# WUE = yield_kg / total_water_liters (over the season)
# A meaningful WUE metric REQUIRES:
#   1. Total water applied per field over the season (SUM of weekly totals)
#   2. Yield per field for that season (from harvest_records)

# Aggregate total water per field (season-level)
df_season_water = (
    df_irrigation
    .groupBy("field_id")
    .agg(
        spark_sum("water_used_liters").alias("total_water_liters"),
        spark_sum("duration_minutes").alias("total_irrigation_min"),
        count("*").alias("total_events"),
    )
)

# Join with harvest records for yield
df_efficiency = (
    df_season_water
    .join(
        df_harvest.select("field_id", "crop", "yield_kg", "season", "quality_grade"),
        on="field_id",
        how="inner"
    )
    .join(
        broadcast(df_fields.select("field_id", "crop_type", "acreage")),
        on="field_id",
        how="left"
    )
    .withColumn("water_use_efficiency",
        spark_round(col("yield_kg") / col("total_water_liters"), 4)
    )
    .withColumn("water_per_acre",
        spark_round(col("total_water_liters") / col("acreage"), 2)
    )
    .withColumn("yield_per_acre",
        spark_round(col("yield_kg") / col("acreage"), 2)
    )
)

display(df_efficiency.orderBy("water_use_efficiency"))

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 7: SQL Efficiency Calculation
# ────────────────────────────────────────────────────────────────────────────

# ⚡ SQL APPROACH: Implement the correct SQL query yourself!
# No SQL hints are provided for this operation.
# Use the WHAT'S BROKEN section at the bottom and Databricks SQL docs for guidance.

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 8: Write Gold Efficiency Table
# ────────────────────────────────────────────────────────────────────────────

(
    df_efficiency
    .withColumn("_computed_at", current_timestamp())
    .write
    .mode("overwrite")
    .option("overwriteSchema", "true")
    .saveAsTable(f"{gold_schema}.irrigation_efficiency")
)

print(f"✅ Gold table: {gold_schema}.irrigation_efficiency")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 9: Validation — Corn WUE ≈ 0.85 kg/L
# ────────────────────────────────────────────────────────────────────────────
# Water use efficiency for corn in irrigated agriculture should be
# approximately 0.8-1.0 kg/L. Significantly higher values indicate
# the per-event bug is still present.

df_corn_wue = spark.sql(f"""
    SELECT
        crop_type,
        COUNT(*) AS field_count,
        ROUND(AVG(water_use_efficiency), 4) AS avg_wue,
        ROUND(MIN(water_use_efficiency), 4) AS min_wue,
        ROUND(MAX(water_use_efficiency), 4) AS max_wue
    FROM {gold_schema}.irrigation_efficiency
    WHERE crop_type = 'corn' OR crop = 'corn'
    GROUP BY crop_type
""")

display(df_corn_wue)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: BROKEN — Per-Event Instead of Weekly Aggregation
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   The irrigation_weekly Silver table is NOT actually weekly — it stores
#   raw per-event data. The table name is misleading. Proper weekly
#   aggregation with date_trunc('week', ...) was never applied.
#
# TO FIX:
#   Replace the per-event write in Section 5 with:
#     df_weekly = (
#         df_irrigation
#         .withColumn("week_start", date_trunc("week", col("irrigation_date")))
#         .groupBy("field_id", "week_start", "method")
#         .agg(
#             spark_sum("water_used_liters").alias("weekly_water_liters"),
#             spark_sum("duration_minutes").alias("weekly_duration_min"),
#             count("*").alias("irrigation_events"),
#         )
#     )
#   Then write df_weekly instead of df_per_event.
#
# WHY IT MATTERS:
#   Per-event granularity makes trend analysis meaningless — daily
#   variations in irrigation timing create noise. Weekly aggregation
#   smooths this into actionable patterns for agronomists.
#
# CONCEPTS LEARNED:
#   1. date_trunc() for time-window grouping
#   2. Aggregation granularity matters for KPIs
#   3. WUE = yield / total_water_applied
#   4. Domain validation (corn WUE ≈ 0.85 kg/L)
#   5. CTE-based SQL aggregation pipelines
#
# NEXT: Run 05_yield_prediction_features.py for ML feature engineering
# ────────────────────────────────────────────────────────────────────────────
