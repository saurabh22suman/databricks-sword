# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 02_network_kpis_silver.py
# MISSION:  Telecom — Network Operations Analytics Platform
# STATUS:   BROKEN — Window partitioned by region only, not region+tower_id
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Calculate network KPIs (latency, throughput, packet loss) for each
#   tower using rolling window functions. Enrich with topology data to
#   add region/state context for dashboard queries.
#
# WHAT YOU'LL LEARN:
#   ✅ Window functions with PARTITION BY (region, tower_id)
#   ✅ Rolling averages for time-series KPIs
#   ✅ broadcast() joins for topology enrichment
#   ✅ Z-ORDER optimization for multi-column queries
#   ✅ SQL WINDOW clause for reusable window definitions
#
# ⚠️ KNOWN BUG:
#   Window functions partition by region ONLY — they should partition
#   by (region, tower_id). This causes KPIs to average across ALL towers
#   in a region instead of per-tower, producing meaningless averages.
#
# INPUT:
#   - {catalog}.{schema_prefix}_bronze.cell_tower_metrics
#   - {catalog}.{schema_prefix}_bronze.network_topology
#
# OUTPUT:
#   - {catalog}.{schema_prefix}_silver.network_kpis
#
# DOCUMENTATION:
#   - Window:  https://docs.databricks.com/en/sql/language-manual/sql-ref-window-functions.html
#   - OPTIMIZE: https://docs.databricks.com/en/sql/language-manual/delta-optimize.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
silver_schema = f"{catalog}.{schema_prefix}_silver"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Load & Enrich with Topology
# ────────────────────────────────────────────────────────────────────────────
# Join tower metrics with topology to add geographic context.
# Topology is small (500 rows) — perfect for broadcast join.

from pyspark.sql.functions import (
    col, avg, count, round as spark_round, broadcast,
    current_timestamp, when, percentile_approx
)
from pyspark.sql.window import Window

df_metrics = spark.read.table(f"{bronze_schema}.cell_tower_metrics")
df_topology = spark.read.table(f"{bronze_schema}.network_topology")

# Add region mapping based on state
df_topology_with_region = (
    df_topology
    .withColumn(
        "region",
        when(col("state").isin("CA", "OR", "WA", "NV", "AZ", "UT", "CO", "NM"), "US-WEST")
        .when(col("state").isin("TX", "FL", "GA", "NC", "SC", "TN", "AL", "LA", "MS", "AR"), "US-SOUTH")
        .when(col("state").isin("NY", "NJ", "PA", "CT", "MA", "ME", "VT", "NH", "RI", "MD", "DE", "DC", "VA"), "US-EAST")
        .otherwise("US-MIDWEST")
    )
)

df_enriched = (
    df_metrics
    .join(
        broadcast(df_topology_with_region.select(
            "tower_id", "city", "state", "region", "tower_type",
            "technology", "capacity_mbps"
        )),
        on="tower_id",
        how="left"
    )
)

print(f"📊 Enriched metrics: {df_enriched.count()} rows")
display(df_enriched.select("tower_id", "region", "latency_ms", "throughput_mbps").limit(5))

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2: Define Window Specifications (⚠️ BUG: Wrong Partition!)
# ────────────────────────────────────────────────────────────────────────────
# We need per-tower rolling KPIs. The window MUST partition by both
# region AND tower_id to calculate metrics per individual tower.
#
# ⚠️ BUG: Partitioning by region only! This averages all towers in
# a region together, producing meaningless metrics like:
#   "Average latency for US-WEST = 65ms" (meaningless across 100+ towers)
# Instead of:
#   "TOWER00014 avg latency = 45ms, TOWER00025 avg latency = 82ms"

# ⚠️ BUG: Missing tower_id in partition — averages all towers in region!
tower_window = (
    Window
    .partitionBy("region")          # ⚠️ BUG: should be .partitionBy("region", "tower_id")
    .orderBy("event_ts")
    .rowsBetween(-23, 0)            # Last 24 readings (roughly 24 hours if hourly)
)

# This one is also missing tower_id
tower_window_1h = (
    Window
    .partitionBy("region")          # ⚠️ BUG: should be .partitionBy("region", "tower_id")
    .orderBy("event_ts")
    .rowsBetween(-0, 0)             # Current reading only (for snapshot KPIs)
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Calculate Rolling KPIs (PySpark)
# ────────────────────────────────────────────────────────────────────────────

df_kpis = (
    df_enriched
    .withColumn("avg_latency_ms",
        spark_round(avg("latency_ms").over(tower_window), 2)
    )
    .withColumn("avg_throughput_mbps",
        spark_round(avg("throughput_mbps").over(tower_window), 2)
    )
    .withColumn("avg_packet_loss",
        spark_round(avg("packet_loss_percent").over(tower_window), 2)
    )
    .withColumn("avg_connections",
        spark_round(avg("active_connections").over(tower_window), 0)
    )
    .withColumn("capacity_utilization_pct",
        spark_round(
            (col("throughput_mbps") / col("capacity_mbps")) * 100,
            2
        )
    )
    .withColumn(
        "health_status",
        when(col("avg_latency_ms") > 100, "DEGRADED")
        .when(col("avg_packet_loss") > 3.0, "DEGRADED")
        .when(col("capacity_utilization_pct") > 90, "OVERLOADED")
        .otherwise("HEALTHY")
    )
    .withColumn("_calculated_at", current_timestamp())
)

display(
    df_kpis
    .select("tower_id", "region", "avg_latency_ms", "avg_throughput_mbps",
            "avg_packet_loss", "health_status")
    .limit(20)
)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: SQL Equivalent — Window with Correct Partition
# ────────────────────────────────────────────────────────────────────────────
# The SQL version uses the CORRECT partitioning: PARTITION BY region, tower_id

# ⚡ SQL APPROACH: Implement the correct SQL query yourself!
# No SQL hints are provided for this operation.
# Use the WHAT'S BROKEN section at the bottom and Databricks SQL docs for guidance.

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: Write Silver KPIs + Z-ORDER Optimization
# ────────────────────────────────────────────────────────────────────────────

(
    df_kpis
    .write
    .mode("overwrite")
    .option("overwriteSchema", "true")
    .saveAsTable(f"{silver_schema}.network_kpis")
)

print(f"✅ Silver table: {silver_schema}.network_kpis")

# Z-ORDER optimization: co-locate data for common query patterns
# (filtering by region + tower_id + time range)
spark.sql(f"""
    OPTIMIZE {silver_schema}.network_kpis
    ZORDER BY (region, tower_id, event_ts)
""")

print("✅ Z-ORDER applied: (region, tower_id, event_ts)")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 6: Verify KPIs
# ────────────────────────────────────────────────────────────────────────────

display(spark.sql(f"""
    SELECT
        region,
        COUNT(DISTINCT tower_id) AS towers,
        ROUND(AVG(avg_latency_ms), 1) AS avg_latency,
        ROUND(AVG(avg_throughput_mbps), 1) AS avg_throughput,
        ROUND(AVG(avg_packet_loss), 2) AS avg_packet_loss,
        SUM(CASE WHEN health_status = 'DEGRADED' THEN 1 ELSE 0 END) AS degraded_readings,
        SUM(CASE WHEN health_status = 'OVERLOADED' THEN 1 ELSE 0 END) AS overloaded_readings
    FROM {silver_schema}.network_kpis
    GROUP BY region
    ORDER BY region
"""))

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: BROKEN — Wrong Window Partition
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   Window functions partition by "region" only.
#   This averages ALL towers in a region together, producing meaningless
#   metrics. Each tower needs its own rolling average.
#
# TO FIX:
#   Change both window definitions:
#     .partitionBy("region")
#   To:
#     .partitionBy("region", "tower_id")
#
# CONCEPTS LEARNED:
#   1. Window PARTITION BY must match analytical granularity
#   2. Rolling averages with rowsBetween for time-series KPIs
#   3. broadcast() for small reference table joins
#   4. Z-ORDER BY for co-locating commonly queried columns
#   5. OPTIMIZE command for Delta table performance
#   6. Capacity utilization = throughput / capacity * 100
#
# NEXT: Run 03_regional_aggregates_gold.py for Gold aggregations
# ────────────────────────────────────────────────────────────────────────────
