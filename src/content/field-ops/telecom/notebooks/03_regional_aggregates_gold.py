# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 03_regional_aggregates_gold.py
# MISSION:  Telecom — Network Operations Analytics Platform
# STATUS:   BROKEN — Missing timezone conversion (UTC → local)
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Build Gold-layer regional performance aggregations for executive
#   dashboards. All timestamps must be converted from UTC to the
#   appropriate regional timezone for business reporting.
#
# WHAT YOU'LL LEARN:
#   ✅ Timezone conversion: from_utc_timestamp() / AT TIME ZONE
#   ✅ Gold layer aggregation patterns for dashboards
#   ✅ GROUP BY with multiple dimensions
#   ✅ SLA compliance scoring
#   ✅ Complaint correlation with network metrics
#
# ⚠️ KNOWN BUG:
#   All timestamps remain in UTC! Dashboard users in different regions
#   see metrics aligned to UTC midnight, not their local midnight.
#   FIX: Use from_utc_timestamp() or SQL AT TIME ZONE.
#
# TIMEZONE MAPPING:
#   US-EAST:    America/New_York (UTC-5)
#   US-SOUTH:   America/Chicago  (UTC-6)
#   US-MIDWEST: America/Chicago  (UTC-6)
#   US-WEST:    America/Los_Angeles (UTC-8)
#
# INPUT:
#   - {catalog}.{schema_prefix}_silver.network_kpis
#   - {catalog}.{schema_prefix}_bronze.customer_complaints
#
# OUTPUT:
#   - {catalog}.{schema_prefix}_gold.regional_performance
#
# DOCUMENTATION:
#   - from_utc_timestamp: https://docs.databricks.com/en/sql/language-manual/functions/from_utc_timestamp.html
#   - AT TIME ZONE:       https://docs.databricks.com/en/sql/language-manual/functions/at-time-zone.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
silver_schema = f"{catalog}.{schema_prefix}_silver"
gold_schema   = f"{catalog}.{schema_prefix}_gold"

# SLA Thresholds
SLA_LATENCY_MS = 50       # Max acceptable latency
SLA_PACKET_LOSS_PCT = 2.0  # Max acceptable packet loss
SLA_UPTIME_PCT = 99.9      # Min acceptable uptime

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Load Silver KPIs
# ────────────────────────────────────────────────────────────────────────────

from pyspark.sql.functions import (
    col, avg, count, sum as spark_sum, round as spark_round,
    when, from_utc_timestamp, current_timestamp, date_trunc,
    countDistinct, broadcast, to_date
)

df_kpis = spark.read.table(f"{silver_schema}.network_kpis")
print(f"📊 Silver KPI records: {df_kpis.count()}")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2: Timezone Conversion (⚠️ BUG: NOT APPLIED!)
# ────────────────────────────────────────────────────────────────────────────
# Dashboard users expect timestamps in their local timezone.
# The event_ts is in UTC and needs to be converted per region.
#
# ⚠️ BUG: The timezone conversion is commented out!
# Timestamps remain in UTC, causing 11pm Tuesday metrics to show
# on Wednesday for US-WEST users (UTC-8).

TIMEZONE_MAP = {
    "US-EAST": "America/New_York",
    "US-SOUTH": "America/Chicago",
    "US-MIDWEST": "America/Chicago",
    "US-WEST": "America/Los_Angeles",
}

# ⚠️ BUG: This just copies event_ts without converting!
# The from_utc_timestamp() call is missing.
df_localized = (
    df_kpis
    .withColumn("local_ts", col("event_ts"))  # ⚠️ BUG: No timezone conversion!
    # FIX: Use from_utc_timestamp with the region-specific timezone:
    # .withColumn("local_ts",
    #     when(col("region") == "US-EAST", from_utc_timestamp(col("event_ts"), "America/New_York"))
    #     .when(col("region") == "US-SOUTH", from_utc_timestamp(col("event_ts"), "America/Chicago"))
    #     .when(col("region") == "US-MIDWEST", from_utc_timestamp(col("event_ts"), "America/Chicago"))
    #     .when(col("region") == "US-WEST", from_utc_timestamp(col("event_ts"), "America/Los_Angeles"))
    #     .otherwise(col("event_ts"))
    # )
    .withColumn("local_date", to_date(col("local_ts")))
    .withColumn("local_hour", date_trunc("hour", col("local_ts")))
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Regional Performance Aggregation
# ────────────────────────────────────────────────────────────────────────────
# Aggregate KPIs per region per day for dashboard consumption.

df_regional = (
    df_localized
    .groupBy("region", "local_date")
    .agg(
        countDistinct("tower_id").alias("active_towers"),
        spark_round(avg("avg_latency_ms"), 2).alias("region_avg_latency_ms"),
        spark_round(avg("avg_throughput_mbps"), 2).alias("region_avg_throughput_mbps"),
        spark_round(avg("avg_packet_loss"), 2).alias("region_avg_packet_loss"),
        spark_round(avg("capacity_utilization_pct"), 2).alias("region_avg_utilization"),
        count("*").alias("total_readings"),
        spark_sum(when(col("health_status") == "DEGRADED", 1).otherwise(0)).alias("degraded_count"),
        spark_sum(when(col("health_status") == "OVERLOADED", 1).otherwise(0)).alias("overloaded_count"),
    )
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: SLA Compliance Scoring
# ────────────────────────────────────────────────────────────────────────────

df_with_sla = (
    df_regional
    .withColumn(
        "latency_sla_met",
        when(col("region_avg_latency_ms") <= SLA_LATENCY_MS, True).otherwise(False)
    )
    .withColumn(
        "packet_loss_sla_met",
        when(col("region_avg_packet_loss") <= SLA_PACKET_LOSS_PCT, True).otherwise(False)
    )
    .withColumn(
        "healthy_pct",
        spark_round(
            ((col("total_readings") - col("degraded_count") - col("overloaded_count"))
             / col("total_readings")) * 100,
            2
        )
    )
    .withColumn(
        "overall_sla_status",
        when(
            (col("latency_sla_met")) & (col("packet_loss_sla_met")) & (col("healthy_pct") >= 99.0),
            "COMPLIANT"
        ).otherwise("VIOLATION")
    )
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: Enrich with Complaint Counts
# ────────────────────────────────────────────────────────────────────────────

df_complaints = spark.read.table(f"{bronze_schema}.customer_complaints")

df_complaint_agg = (
    df_complaints
    .join(
        broadcast(
            spark.read.table(f"{bronze_schema}.network_topology")
            .select("tower_id", "state")
        ),
        "tower_id", "left"
    )
    .withColumn(
        "region",
        when(col("state").isin("CA", "OR", "WA", "NV", "AZ", "UT", "CO", "NM"), "US-WEST")
        .when(col("state").isin("TX", "FL", "GA", "NC", "SC", "TN", "AL", "LA", "MS", "AR"), "US-SOUTH")
        .when(col("state").isin("NY", "NJ", "PA", "CT", "MA", "ME", "VT", "NH", "RI", "MD", "DE", "DC", "VA"), "US-EAST")
        .otherwise("US-MIDWEST")
    )
    .withColumn("complaint_date", to_date(col("created_at")))
    .groupBy("region", "complaint_date")
    .agg(
        count("*").alias("complaint_count"),
        spark_sum(when(col("priority") == "critical", 1).otherwise(0)).alias("critical_complaints"),
    )
)

df_final = (
    df_with_sla
    .join(
        df_complaint_agg,
        (df_with_sla["region"] == df_complaint_agg["region"])
        & (df_with_sla["local_date"] == df_complaint_agg["complaint_date"]),
        "left"
    )
    .drop(df_complaint_agg["region"])
    .drop("complaint_date")
    .fillna(0, subset=["complaint_count", "critical_complaints"])
    .withColumn("_created_at", current_timestamp())
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 6: SQL Equivalent — WITH TIMEZONE CONVERSION
# ────────────────────────────────────────────────────────────────────────────

# ⚡ SQL APPROACH: Implement the correct SQL query yourself!
# No SQL hints are provided for this operation.
# Use the WHAT'S BROKEN section at the bottom and Databricks SQL docs for guidance.

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 7: Write Gold Regional Performance
# ────────────────────────────────────────────────────────────────────────────

(
    df_final
    .write
    .mode("overwrite")
    .option("overwriteSchema", "true")
    .saveAsTable(f"{gold_schema}.regional_performance")
)

print(f"✅ Gold table: {gold_schema}.regional_performance")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 8: Validation
# ────────────────────────────────────────────────────────────────────────────

display(spark.sql(f"""
    SELECT
        region,
        COUNT(*) AS daily_records,
        ROUND(AVG(region_avg_latency_ms), 1) AS avg_latency,
        SUM(CASE WHEN overall_sla_status = 'VIOLATION' THEN 1 ELSE 0 END) AS sla_violations,
        SUM(complaint_count) AS total_complaints
    FROM {gold_schema}.regional_performance
    GROUP BY region
    ORDER BY region
"""))

distinct_regions = spark.sql(f"""
    SELECT COUNT(DISTINCT region) AS count
    FROM {gold_schema}.regional_performance
""").collect()[0]["count"]

print(f"{'✅' if distinct_regions == 4 else '❌'} Distinct regions: {distinct_regions} (expected 4)")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: BROKEN — Missing Timezone Conversion
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   local_ts = event_ts (still in UTC). Dashboard users see UTC dates,
#   not their local timezone dates. Metrics from 11pm ET appear on
#   the wrong calendar day.
#
# TO FIX:
#   Replace: .withColumn("local_ts", col("event_ts"))
#   With:    .withColumn("local_ts",
#               when(col("region") == "US-EAST",
#                    from_utc_timestamp(col("event_ts"), "America/New_York"))
#               .when(col("region") == "US-SOUTH",
#                    from_utc_timestamp(col("event_ts"), "America/Chicago"))
#               .when(col("region") == "US-MIDWEST",
#                    from_utc_timestamp(col("event_ts"), "America/Chicago"))
#               .when(col("region") == "US-WEST",
#                    from_utc_timestamp(col("event_ts"), "America/Los_Angeles"))
#               .otherwise(col("event_ts"))
#            )
#
# SQL ALTERNATIVE:
#   event_ts AT TIME ZONE 'America/New_York'
#
# CONCEPTS LEARNED:
#   1. from_utc_timestamp() for timezone conversion
#   2. SQL AT TIME ZONE syntax
#   3. Gold layer aggregation for dashboards
#   4. SLA compliance scoring with CASE WHEN
#   5. Complaint correlation with network metrics
#
# MISSION COMPLETE when all 4 regions appear with correct dates! 🏆
# ────────────────────────────────────────────────────────────────────────────
