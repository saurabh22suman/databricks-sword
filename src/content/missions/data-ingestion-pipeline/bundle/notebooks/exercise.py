# Databricks notebook source
# MAGIC %md
# MAGIC # 🔄 Mission: Data Ingestion Pipeline
# MAGIC 
# MAGIC Welcome, Operative! This mission teaches you how to build robust **data ingestion pipelines** using Auto Loader.
# MAGIC 
# MAGIC ## Objectives
# MAGIC - Master Auto Loader for streaming file ingestion
# MAGIC - Understand schema inference and evolution
# MAGIC - Use COPY INTO for batch loads
# MAGIC - Build bronze layer ingestion patterns
# MAGIC 
# MAGIC **Let's begin!**

# COMMAND ----------

# MAGIC %md
# MAGIC ## Setup

# COMMAND ----------

# MAGIC %sql
# MAGIC USE main.dbsword_data_ingestion;

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 1: Understanding Auto Loader
# MAGIC 
# MAGIC Auto Loader incrementally processes new files as they arrive in cloud storage.
# MAGIC 
# MAGIC Key benefits:
# MAGIC - **Incremental processing**: Only processes new files
# MAGIC - **Schema inference**: Automatically detects schema
# MAGIC - **Schema evolution**: Handles schema changes
# MAGIC - **Exactly-once semantics**: No duplicate processing

# COMMAND ----------

# Set up paths
source_path = "/tmp/dbsword/ingestion_source"
checkpoint_path = "/tmp/dbsword/ingestion_checkpoint"
target_path = "/tmp/dbsword/ingestion_bronze"

# Create sample source files
sample_data = """{"event_id": "E001", "user_id": "U100", "event_type": "page_view", "timestamp": "2024-01-15T10:30:00Z"}
{"event_id": "E002", "user_id": "U101", "event_type": "click", "timestamp": "2024-01-15T10:31:00Z"}
{"event_id": "E003", "user_id": "U100", "event_type": "purchase", "timestamp": "2024-01-15T10:32:00Z"}"""

dbutils.fs.mkdirs(source_path)
dbutils.fs.put(f"{source_path}/events_batch1.json", sample_data, overwrite=True)

# COMMAND ----------

# MAGIC %md
# MAGIC ### Basic Auto Loader Pattern

# COMMAND ----------

from pyspark.sql.types import StructType, StructField, StringType, TimestampType

# Define the expected schema
schema = StructType([
    StructField("event_id", StringType(), True),
    StructField("user_id", StringType(), True),
    StructField("event_type", StringType(), True),
    StructField("timestamp", TimestampType(), True)
])

# Create Auto Loader stream
df_stream = (spark.readStream
    .format("cloudFiles")
    .option("cloudFiles.format", "json")
    .option("cloudFiles.schemaLocation", checkpoint_path)
    .schema(schema)
    .load(source_path))

# Write to bronze table (Delta)
query = (df_stream.writeStream
    .format("delta")
    .option("checkpointLocation", checkpoint_path)
    .outputMode("append")
    .trigger(availableNow=True)  # Process all available files and stop
    .toTable("events_bronze"))

# Wait for completion
query.awaitTermination()

# COMMAND ----------

# View the results
spark.sql("SELECT * FROM events_bronze").show()

# COMMAND ----------

# MAGIC %md
# MAGIC ### Add More Files - Watch Auto Loader Process Them

# COMMAND ----------

# Add another batch of files
new_data = """{"event_id": "E004", "user_id": "U102", "event_type": "signup", "timestamp": "2024-01-15T10:35:00Z"}
{"event_id": "E005", "user_id": "U103", "event_type": "page_view", "timestamp": "2024-01-15T10:36:00Z"}"""

dbutils.fs.put(f"{source_path}/events_batch2.json", new_data, overwrite=True)

# COMMAND ----------

# Run Auto Loader again - it only processes new files!
query = (spark.readStream
    .format("cloudFiles")
    .option("cloudFiles.format", "json")
    .option("cloudFiles.schemaLocation", checkpoint_path)
    .schema(schema)
    .load(source_path)
    .writeStream
    .format("delta")
    .option("checkpointLocation", checkpoint_path)
    .outputMode("append")
    .trigger(availableNow=True)
    .toTable("events_bronze"))

query.awaitTermination()

# COMMAND ----------

# Verify new records were added
spark.sql("SELECT COUNT(*) as total_events FROM events_bronze").show()

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 2: Schema Inference
# MAGIC 
# MAGIC Auto Loader can automatically detect the schema from your files.

# COMMAND ----------

# MAGIC %md
# MAGIC ### TODO: Use Schema Inference
# MAGIC 
# MAGIC Create an Auto Loader stream with `cloudFiles.inferColumnTypes` set to `true`.

# COMMAND ----------

# TODO: Create Auto Loader with schema inference
# Hint: .option("cloudFiles.inferColumnTypes", "true")

# YOUR CODE HERE:


# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 3: COPY INTO for Batch Loads
# MAGIC 
# MAGIC COPY INTO is great for one-time or scheduled batch loads.

# COMMAND ----------

# Create another source with CSV data
csv_data = """product_id,name,price,category
P001,Widget Pro,99.99,Electronics
P002,Data Blade,199.99,Software
P003,Cloud Shield,299.99,Security"""

dbutils.fs.put("/tmp/dbsword/csv_source/products.csv", csv_data, overwrite=True)

# COMMAND ----------

# MAGIC %sql
# MAGIC -- Create target table
# MAGIC CREATE TABLE IF NOT EXISTS products_bronze (
# MAGIC     product_id STRING,
# MAGIC     name STRING,
# MAGIC     price DECIMAL(10,2),
# MAGIC     category STRING
# MAGIC ) USING DELTA;

# COMMAND ----------

# MAGIC %sql
# MAGIC -- Use COPY INTO to load the CSV
# MAGIC COPY INTO products_bronze
# MAGIC FROM '/tmp/dbsword/csv_source/'
# MAGIC FILEFORMAT = CSV
# MAGIC FORMAT_OPTIONS ('header' = 'true', 'inferSchema' = 'true')
# MAGIC COPY_OPTIONS ('mergeSchema' = 'true');

# COMMAND ----------

# MAGIC %sql
# MAGIC SELECT * FROM products_bronze;

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 4: Adding Ingestion Metadata
# MAGIC 
# MAGIC Best practice: Add metadata columns to track ingestion.

# COMMAND ----------

from pyspark.sql.functions import current_timestamp, input_file_name

# Enhanced Auto Loader with metadata
df_with_metadata = (spark.readStream
    .format("cloudFiles")
    .option("cloudFiles.format", "json")
    .option("cloudFiles.schemaLocation", f"{checkpoint_path}_v2")
    .schema(schema)
    .load(source_path)
    .withColumn("_ingested_at", current_timestamp())
    .withColumn("_source_file", input_file_name()))

# Write to new table
query = (df_with_metadata.writeStream
    .format("delta")
    .option("checkpointLocation", f"{checkpoint_path}_v2")
    .trigger(availableNow=True)
    .toTable("events_bronze_v2"))

query.awaitTermination()

# COMMAND ----------

# View with metadata
spark.sql("SELECT * FROM events_bronze_v2").show(truncate=False)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Mission Complete! 🎉
# MAGIC 
# MAGIC ### Key Takeaways
# MAGIC 1. **Auto Loader** processes files incrementally and exactly once
# MAGIC 2. **Schema inference** automatically detects data types
# MAGIC 3. **COPY INTO** is perfect for batch loads
# MAGIC 4. **Metadata columns** help track data lineage

# COMMAND ----------

# MAGIC %md
# MAGIC ## Evaluation Queries

# COMMAND ----------

# Eval: Bronze table was created and has data
spark.sql("SELECT COUNT(*) as count FROM events_bronze").show()

# COMMAND ----------

# Eval: Incremental processing worked
spark.sql("SELECT COUNT(DISTINCT _source_file) as source_files FROM events_bronze_v2").show()
