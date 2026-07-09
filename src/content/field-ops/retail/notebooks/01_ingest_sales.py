# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 01_ingest_sales.py
# MISSION:  Retail — Inventory Optimization Pipeline
# STATUS:   WORKING — Ingests raw sales CSV into Bronze layer
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Load raw sales transaction data from a Volume into a Bronze Delta table
#   using BOTH the PySpark DataFrame API and Spark SQL approaches.
#
# WHAT YOU'LL LEARN:
#   ✅ Reading CSV files from Unity Catalog Volumes
#   ✅ PySpark: spark.read.csv() with schema definition
#   ✅ SQL: read_files() table-valued function
#   ✅ Writing Delta tables with saveAsTable()
#   ✅ SQL: CREATE OR REPLACE TABLE ... AS SELECT
#   ✅ Using .show() for Databricks-native visualization
#   ✅ Idempotent ingestion with MERGE INTO (SQL + DeltaTable API)
#
# INPUT:
#   Volume: /Volumes/{catalog}/{schema_prefix}_bronze/raw_files/
#   Files:  sales_transactions.csv, products.csv, inventory_levels.csv
#
# OUTPUT:
#   Tables: {catalog}.{schema_prefix}_bronze.sales_transactions
#           {catalog}.{schema_prefix}_bronze.products
#           {catalog}.{schema_prefix}_bronze.inventory_levels
#
# DOCUMENTATION:
#   - Unity Catalog Volumes: https://docs.databricks.com/en/connect/unity-catalog/volumes.html
#   - read_files() TVF:      https://docs.databricks.com/en/sql/language-manual/functions/read_files.html
#   - Delta Lake writes:     https://docs.databricks.com/en/delta/index.html
#   - MERGE INTO:            https://docs.databricks.com/en/delta/merge.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ────────────────────────────────────────────────────────────────────────────
# In Databricks, `spark` is pre-initialized — you NEVER need to create
# a SparkSession. These variables are set by the deployment system.

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
silver_schema = f"{catalog}.{schema_prefix}_silver"
gold_schema   = f"{catalog}.{schema_prefix}_gold"

volume_path = f"/Volumes/{catalog}/{schema_prefix}_bronze/raw_files"

print(f"📦 Catalog:       {catalog}")
print(f"📂 Bronze Schema: {bronze_schema}")
print(f"📂 Volume Path:   {volume_path}")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Explore the Raw Data
# ────────────────────────────────────────────────────────────────────────────
# Before ingesting, always explore the raw data to understand its structure.
# In Databricks notebooks, `.show(truncate=False)` renders tables for DAB compatibility.

# List files in the Volume
files = dbutils.fs.ls(volume_path)
files.show(truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2A: Read CSV — PySpark DataFrame API
# ────────────────────────────────────────────────────────────────────────────
# The DataFrame API gives you programmatic control over schema definition.
# BEST PRACTICE: Always define explicit schemas in production pipelines —
# schema inference reads the file twice and can produce wrong types.

from pyspark.sql.types import (
    StructType, StructField, StringType, IntegerType,
    DoubleType, DateType
)

sales_schema = StructType([
    StructField("transaction_id", StringType(), False),
    StructField("store_id", StringType(), False),
    StructField("sku", StringType(), False),
    StructField("quantity", IntegerType(), True),
    StructField("unit_price", DoubleType(), True),
    StructField("total_amount", DoubleType(), True),
    StructField("payment_method", StringType(), True),
    StructField("transaction_date", DateType(), True),
    StructField("customer_id", StringType(), True),
])

df_sales = (
    spark.read
    .format("csv")
    .option("header", "true")
    .option("dateFormat", "yyyy-MM-dd")
    .schema(sales_schema)
    .load(f"{volume_path}/sales_transactions.csv")
)

print(f"✅ Loaded {df_sales.count()} sales records via PySpark")
df_sales.show(10, truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2B: Read CSV — SQL read_files() Table-Valued Function
# ────────────────────────────────────────────────────────────────────────────
# The `read_files()` function lets you query files directly in SQL.
# This is the preferred SQL-first approach in Databricks.

df_sales_sql = spark.sql(f"""
    SELECT *
    FROM read_files(
        '{volume_path}/sales_transactions.csv',
        format => 'csv',
        header => true,
        schema => 'transaction_id STRING, store_id STRING, sku STRING,
                   quantity INT, unit_price DOUBLE, total_amount DOUBLE,
                   payment_method STRING, transaction_date DATE,
                   customer_id STRING'
    )
""")

print(f"✅ Loaded {df_sales_sql.count()} sales records via SQL read_files()")
df_sales_sql.show(5, truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Data Quality Checks Before Writing
# ────────────────────────────────────────────────────────────────────────────
# Bronze is "raw but validated" — we don't transform the data, but we
# ensure it's not corrupt before persisting.

from pyspark.sql.functions import col, count, when, isnull, sum as spark_sum

quality_report = df_sales.select(
    count("*").alias("total_rows"),
    spark_sum(when(isnull("transaction_id"), 1).otherwise(0)).alias("null_txn_ids"),
    spark_sum(when(isnull("sku"), 1).otherwise(0)).alias("null_skus"),
    spark_sum(when(col("quantity") <= 0, 1).otherwise(0)).alias("invalid_qty"),
    spark_sum(when(col("total_amount") < 0, 1).otherwise(0)).alias("negative_amt"),
)

quality_report.show(truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4A: Write Bronze — PySpark saveAsTable()
# ────────────────────────────────────────────────────────────────────────────
# saveAsTable() creates a MANAGED Delta table in Unity Catalog.
# Always add ingestion metadata for data lineage.

from pyspark.sql.functions import current_timestamp, input_file_name

df_sales_enriched = (
    df_sales
    .withColumn("_ingested_at", current_timestamp())
    .withColumn("_source_file", input_file_name())
)

(
    df_sales_enriched
    .write
    .mode("overwrite")
    .option("overwriteSchema", "true")
    .saveAsTable(f"{bronze_schema}.sales_transactions")
)

print(f"✅ Bronze table created: {bronze_schema}.sales_transactions")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4B: Write Bronze — Pure SQL Alternative
# ────────────────────────────────────────────────────────────────────────────
# The SQL equivalent uses CREATE OR REPLACE TABLE ... AS SELECT.
# Uncomment to try — both approaches produce identical Delta tables.

# spark.sql(f"""
#     CREATE OR REPLACE TABLE {bronze_schema}.sales_transactions AS
#     SELECT
#         *,
#         current_timestamp() AS _ingested_at,
#         _metadata.file_path AS _source_file
#     FROM read_files(
#         '{volume_path}/sales_transactions.csv',
#         format => 'csv',
#         header => true
#     )
# """)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: Idempotent Ingestion with MERGE INTO
# ────────────────────────────────────────────────────────────────────────────
# In production, you want IDEMPOTENT loads — running the notebook twice
# MUST NOT create duplicates. MERGE INTO matches on a unique key and
# only inserts new rows or updates existing ones.
#
# SQL MERGE syntax (most common in industry):

spark.sql(f"""
    MERGE INTO {bronze_schema}.sales_transactions AS target
    USING (
        SELECT *, current_timestamp() AS _ingested_at
        FROM read_files(
            '{volume_path}/sales_transactions.csv',
            format => 'csv',
            header => true
        )
    ) AS source
    ON target.transaction_id = source.transaction_id
    WHEN MATCHED THEN UPDATE SET *
    WHEN NOT MATCHED THEN INSERT *
""")

print("✅ MERGE complete — idempotent load with no duplicates")

# COMMAND ----------

# PySpark DeltaTable API equivalent for MERGE:
# (Uncomment to try the programmatic approach)

# from delta.tables import DeltaTable
#
# target = DeltaTable.forName(spark, f"{bronze_schema}.sales_transactions")
# source = df_sales_enriched
#
# (
#     target.alias("t")
#     .merge(source.alias("s"), "t.transaction_id = s.transaction_id")
#     .whenMatchedUpdateAll()
#     .whenNotMatchedInsertAll()
#     .execute()
# )

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 6: Ingest Supporting Data Files
# ────────────────────────────────────────────────────────────────────────────

# Products catalog
df_products = (
    spark.read.format("csv")
    .option("header", "true")
    .option("inferSchema", "true")
    .load(f"{volume_path}/products.csv")
    .withColumn("_ingested_at", current_timestamp())
)
df_products.write.mode("overwrite").saveAsTable(f"{bronze_schema}.products")
print(f"✅ products: {df_products.count()} rows")

# Inventory levels
df_inventory = (
    spark.read.format("csv")
    .option("header", "true")
    .option("inferSchema", "true")
    .load(f"{volume_path}/inventory_levels.csv")
    .withColumn("_ingested_at", current_timestamp())
)
df_inventory.write.mode("overwrite").saveAsTable(f"{bronze_schema}.inventory_levels")
print(f"✅ inventory_levels: {df_inventory.count()} rows")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 7: Verify All Bronze Tables
# ────────────────────────────────────────────────────────────────────────────

for table in ["sales_transactions", "products", "inventory_levels"]:
    row_count = spark.read.table(f"{bronze_schema}.{table}").count()
    print(f"📊 {bronze_schema}.{table}: {row_count} rows")

# Inspect Delta table history — shows all operations performed
spark.sql(f"DESCRIBE HISTORY {bronze_schema}.sales_transactions LIMIT 5").show(truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK COMPLETE — Bronze Layer Ready
# ────────────────────────────────────────────────────────────────────────────
# CONCEPTS LEARNED:
#   1. PySpark spark.read.csv() vs SQL read_files() for CSV ingestion
#   2. Schema definition for type safety
#   3. .show() for Databricks-native data exploration
#   4. saveAsTable() vs CREATE OR REPLACE TABLE for Delta writes
#   5. MERGE INTO for idempotent loads (SQL + DeltaTable API)
#   6. Ingestion metadata (_ingested_at, _source_file) for lineage
#
# NEXT → 02_transform_inventory.py — Clean and deduplicate inventory data
# ────────────────────────────────────────────────────────────────────────────
