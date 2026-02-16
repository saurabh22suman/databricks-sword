# Databricks notebook source
# MAGIC %md
# MAGIC # Network KPI Calculations - Silver Layer
# MAGIC Calculate per-tower KPIs with rolling window aggregations

# COMMAND ----------
from pyspark.sql import functions as F
from pyspark.sql.window import Window

# COMMAND ----------
# Read bronze metrics
bronze_df = spark.readStream.table("telecom_bronze.cell_tower_metrics")

# COMMAND ----------
# BROKEN: Window function missing tower_id in PARTITION BY
# Expected: PARTITION BY (region, tower_id) for per-tower metrics
# Current: PARTITION BY region only - mixes metrics from different towers!

# ❌ WRONG: Should partition by BOTH region AND tower_id
window_spec = Window.partitionBy("region").orderBy("timestamp").rowsBetween(-11, 0)  # 1-hour rolling (12 x 5min intervals)

kpi_df = (
    bronze_df
    .withColumn("rolling_avg_latency", F.avg("avg_latency_ms").over(window_spec))
    .withColumn("rolling_max_latency", F.max("avg_latency_ms").over(window_spec))
    .withColumn("rolling_avg_throughput", F.avg("throughput_mbps").over(window_spec))
    .withColumn("rolling_avg_packet_loss", F.avg("packet_loss_pct").over(window_spec))
    .withColumn(
        "latency_spike",
        F.when(F.col("avg_latency_ms") > F.col("rolling_avg_latency") * 1.5, True).otherwise(False)
    )
)

# COMMAND ----------
# Write to Silver table
(
    kpi_df.writeStream
    .format("delta")
    .outputMode("append")
    .option("checkpointLocation", "/mnt/checkpoints/telecom_silver")
    .trigger(processingTime="2 minutes")
    .toTable("telecom_silver.network_kpis")
)

# COMMAND ----------
# MAGIC %md
# MAGIC ## Expected Fix
# MAGIC ```python
# MAGIC # Correct window partitioning by BOTH region and tower_id
# MAGIC window_spec = Window.partitionBy("region", "tower_id").orderBy("timestamp").rowsBetween(-11, 0)
# MAGIC ```
