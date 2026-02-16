# Databricks notebook source
# MAGIC %md
# MAGIC # DLT Silver Layer - SPC Analysis
# MAGIC Calculate Statistical Process Control metrics with rolling windows

# COMMAND ----------
import dlt
from pyspark.sql import functions as F
from pyspark.sql.window import Window

# COMMAND ----------
@dlt.table(
    name="silver_sensor_pivoted",
    comment="Sensor metrics pivoted by equipment and metric type"
)
def silver_sensor_pivoted():
    return (
        dlt.read_stream("bronze_sensor_readings")
        .groupBy("equipment_id", "production_line", "timestamp_parsed")
        .pivot("metric")
        .agg(F.first("value"))
    )

# COMMAND ----------
# BROKEN: SPC control limits use wrong multiplier
# Expected: UCL/LCL should use 3-sigma rule (mean ± 3*stddev)
# Current: Using 2-sigma (mean ± 2*stddev) - causes false alerts

@dlt.table(
    name="silver_spc_metrics",
    comment="Statistical Process Control metrics for quality monitoring"
)
def silver_spc_metrics():
    window_spec = Window.partitionBy("equipment_id", "metric").orderBy("timestamp_parsed").rowsBetween(-99, 0)
    
    return (
        dlt.read_stream("bronze_sensor_readings")
        .withColumn("rolling_mean", F.avg("value").over(window_spec))
        .withColumn("rolling_stddev", F.stddev("value").over(window_spec))
        .withColumn("ucl", F.col("rolling_mean") + 2 * F.col("rolling_stddev"))  # ❌ WRONG: should be 3*sigma
        .withColumn("lcl", F.col("rolling_mean") - 2 * F.col("rolling_stddev"))  # ❌ WRONG: should be 3*sigma
        .withColumn("out_of_control", 
            (F.col("value") > F.col("ucl")) | (F.col("value") < F.col("lcl"))
        )
    )

# COMMAND ----------
# MAGIC %md
# MAGIC ## Expected Fix
# MAGIC ```python
# MAGIC # Use correct 3-sigma control limits
# MAGIC .withColumn("ucl", F.col("rolling_mean") + 3 * F.col("rolling_stddev"))  # ✅ 3-sigma
# MAGIC .withColumn("lcl", F.col("rolling_mean") - 3 * F.col("rolling_stddev"))  # ✅ 3-sigma
# MAGIC ```
