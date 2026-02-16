# Databricks notebook source# Databricks notebook source



























































# MAGIC ```# MAGIC )# MAGIC     F.to_timestamp("timestamp", "yyyy-MM-dd'T'HH:mm:ss'Z'")# MAGIC     "timestamp_parsed",# MAGIC bronze_df = telemetry_df.withColumn(# MAGIC # Correct timestamp parsing for ISO 8601 format# MAGIC ```python# MAGIC ## Expected Fix# MAGIC %md# COMMAND ----------)    .toTable("field_ops_automotive.bronze_telemetry")    .trigger(processingTime="30 seconds")    .option("checkpointLocation", "/mnt/checkpoints/automotive_bronze")    .outputMode("append")    .format("delta")    bronze_df.writeStream(# Write to Bronze table# COMMAND ----------)    F.to_timestamp("timestamp", "yyyy-MM-dd HH:mm:ss")  # ❌ WRONG FORMAT    "timestamp_parsed",bronze_df = telemetry_df.withColumn(# Current code uses format for "2024-01-15 14:30:00" (no 'T' or 'Z')# Expected: ISO 8601 format "2024-01-15T14:30:00Z"# BROKEN: Timestamp parsing is incorrect - using wrong format# COMMAND ----------)    .load("/mnt/field-ops/automotive/telemetry/")    """)        longitude DOUBLE        latitude DOUBLE,        dtc_code STRING,        battery_voltage DOUBLE,        fuel_level DOUBLE,        engine_temp INT,        rpm INT,        speed DOUBLE,        timestamp STRING,        vehicle_id STRING,    .schema("""    .format("json")    spark.readStreamtelemetry_df = (# Read telemetry stream# COMMAND ----------from pyspark.sql.types import *from pyspark.sql import functions as F# COMMAND ----------# MAGIC Ingest streaming telemetry from connected vehicles into Bronze layer# MAGIC # Vehicle Telemetry Ingestion# MAGIC %md# MAGIC %md
# MAGIC # Vehicle Telemetry Ingestion
# MAGIC Ingest streaming telemetry data from connected vehicles into Bronze layer

# COMMAND ----------

from pyspark.sql.functions import *
from pyspark.sql.types import *

# COMMAND ----------

# Schema for vehicle telemetry
telemetry_schema = StructType([
    StructField("vehicle_id", StringType(), False),
    StructField("timestamp", StringType(), False),  # BUG: Should be TimestampType or needs parsing
    StructField("speed", DoubleType(), True),
    StructField("rpm", IntegerType(), True),
    StructField("engine_temp", DoubleType(), True),
    StructField("oil_pressure", DoubleType(), True),
    StructField("battery_voltage", DoubleType(), True),
    StructField("dtc_code", StringType(), True)
])

# COMMAND ----------

# Read telemetry data
telemetry_df = (
    spark.read
    .option("multiLine", "true")
    .schema(telemetry_schema)
    .json("/tmp/field_ops/data/vehicle_telemetry.json")
)

# COMMAND ----------

# BUG: Timestamp is string, needs conversion
# Missing: .withColumn("timestamp", to_timestamp(col("timestamp"), "yyyy-MM-dd HH:mm:ss"))

# COMMAND ----------

# Write to Bronze layer
(
    telemetry_df
    .write
    .mode("overwrite")
    .format("delta")
    .saveAsTable("automotive_bronze.vehicle_telemetry")
)

# COMMAND ----------

# MAGIC %md
# MAGIC # Vehicle Reference Data

# COMMAND ----------

# Read vehicles
vehicles_df = (
    spark.read
    .option("header", "true")
    .option("inferSchema", "true")
    .csv("/tmp/field_ops/data/vehicles.csv")
)

vehicles_df.write.mode("overwrite").format("delta").saveAsTable("automotive_bronze.vehicles")

# COMMAND ----------

# Read DTC codes
dtc_df = (
    spark.read
    .option("header", "true")
    .option("inferSchema", "true")
    .csv("/tmp/field_ops/data/dtc_codes.csv")
)

dtc_df.write.mode("overwrite").format("delta").saveAsTable("automotive_bronze.dtc_codes")

# COMMAND ----------

# Read service records
service_df = (
    spark.read
    .option("header", "true")
    .option("inferSchema", "true")
    .csv("/tmp/field_ops/data/service_records.csv")
)

service_df.write.mode("overwrite").format("delta").saveAsTable("automotive_bronze.service_records")
