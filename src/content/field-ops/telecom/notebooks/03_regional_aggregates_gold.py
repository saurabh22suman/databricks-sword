# Databricks notebook source
# MAGIC %md
# MAGIC # Regional Performance Aggregates - Gold Layer
# MAGIC Build hourly regional KPI summaries with timezone conversions

# COMMAND ----------
from pyspark.sql import functions as F

# COMMAND ----------
# Read Silver KPIs
kpis_df = spark.readStream.table("telecom_silver.network_kpis")

# COMMAND ----------
# Regional timezone mapping
# US-WEST: Pacific (UTC-8)
# US-EAST: Eastern (UTC-5)
# US-CENTRAL: Central (UTC-6)
# US-SOUTH: Central (UTC-6)

# BROKEN: Timezone conversion is missing
# Expected: Convert UTC timestamps to regional local time
# Current: All timestamps in UTC - aggregations don't align with business hours

regional_agg_df = (
    kpis_df
    # ❌ MISSING: Timezone conversion
    # Should: .withColumn("local_time", F.from_utc_timestamp("timestamp", regional_tz))
    .withColumn("hour", F.hour("timestamp"))  # ❌ Using UTC hour, not local hour
    .groupBy("region", "date", "hour")
    .agg(
        F.avg("rolling_avg_latency").alias("avg_latency_ms"),
        F.max("rolling_max_latency").alias("max_latency_ms"),
        F.avg("rolling_avg_throughput").alias("avg_throughput_mbps"),
        F.avg("rolling_avg_packet_loss").alias("avg_packet_loss_pct"),
        F.sum(F.when(F.col("latency_spike"), 1).otherwise(0)).alias("total_latency_spikes"),
        F.count("*").alias("measurement_count")
    )
)

# COMMAND ----------
# Write to Gold table
(
    regional_agg_df.writeStream
    .format("delta")
    .outputMode("append")
    .option("checkpointLocation", "/mnt/checkpoints/telecom_gold")
    .trigger(processingTime="5 minutes")
    .toTable("telecom_gold.regional_performance")
)

# COMMAND ----------
# MAGIC %md
# MAGIC ## Optimization: Z-Ordering (run manually after initial load)
# MAGIC ```sql
# MAGIC OPTIMIZE telecom_silver.network_kpis ZORDER BY (region, tower_id, timestamp);
# MAGIC OPTIMIZE telecom_gold.regional_performance ZORDER BY (region, date);
# MAGIC ```

# COMMAND ----------
# MAGIC %md
# MAGIC ## Expected Fix
# MAGIC ```python
# MAGIC # Add timezone conversion logic
# MAGIC regional_agg_df = (
# MAGIC     kpis_df
# MAGIC     .withColumn(
# MAGIC         "local_timestamp",
# MAGIC         F.when(F.col("region") == "US-WEST", F.from_utc_timestamp("timestamp", "America/Los_Angeles"))
# MAGIC          .when(F.col("region") == "US-EAST", F.from_utc_timestamp("timestamp", "America/New_York"))
# MAGIC          .when(F.col("region").isin("US-CENTRAL", "US-SOUTH"), F.from_utc_timestamp("timestamp", "America/Chicago"))
# MAGIC          .otherwise(F.col("timestamp"))
# MAGIC     )
# MAGIC     .withColumn("hour", F.hour("local_timestamp"))  # Use local hour, not UTC
# MAGIC     .withColumn("date", F.to_date("local_timestamp"))
# MAGIC     .groupBy("region", "date", "hour")
# MAGIC     # ... rest of aggregations
# MAGIC )
# MAGIC ```
