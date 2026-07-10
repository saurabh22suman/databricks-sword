# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 02_transform_inventory.py
# MISSION:  Retail — Inventory Optimization Pipeline
# STATUS:   BROKEN — Contains a wrong join key + missing deduplication
# ════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE:
#   Join sales data with inventory levels and product catalog to create
#   a clean Silver inventory table — deduplicated and enriched.
#
# WHAT YOU'LL LEARN:
#   ✅ PySpark DataFrame joins vs SQL JOINs
#   ✅ Deduplication with ROW_NUMBER() window function
#   ✅ PySpark Window vs SQL OVER() clause
#   ✅ Data quality: handling nulls and duplicates
#   ✅ Delta Lake table properties and optimization
#
# INPUT:
#   Tables: {catalog}.{schema_prefix}_bronze.sales_transactions
#           {catalog}.{schema_prefix}_bronze.products
#           {catalog}.{schema_prefix}_bronze.inventory_levels
#
# OUTPUT:
#   Table: {catalog}.{schema_prefix}_silver.inventory
#
# HINTS:
#   - Look carefully at the join keys — are they consistent across tables?
#   - The products table uses 'sku' but one join below uses 'product_id'
#   - Think about how to handle duplicate inventory records per SKU
#
# DOCUMENTATION:
#   - PySpark Joins:    https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.join.html
#   - SQL JOINs:        https://docs.databricks.com/en/sql/language-manual/sql-ref-syntax-qry-select-join.html
#   - Window Functions: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.Window.html
# ════════════════════════════════════════════════════════════════════════════

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ────────────────────────────────────────────────────────────────────────────

catalog = "{catalog}"
schema_prefix = "{schema_prefix}"

bronze_schema = f"{catalog}.{schema_prefix}_bronze"
silver_schema = f"{catalog}.{schema_prefix}_silver"
gold_schema   = f"{catalog}.{schema_prefix}_gold"

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Load Bronze Tables
# ────────────────────────────────────────────────────────────────────────────
# Read from Unity Catalog Delta tables using spark.read.table().
# This is the standard way to read managed tables in Databricks.

df_sales     = spark.read.table(f"{bronze_schema}.sales_transactions")
df_products  = spark.read.table(f"{bronze_schema}.products")
df_inventory = spark.read.table(f"{bronze_schema}.inventory_levels")

print(f"📊 Sales:     {df_sales.count()} rows")
print(f"📊 Products:  {df_products.count()} rows")
print(f"📊 Inventory: {df_inventory.count()} rows")

# Inspect schemas to understand column names
print("\n── Sales Columns ──")
df_sales.printSchema()
print("\n── Products Columns ──")
df_products.printSchema()
print("\n── Inventory Columns ──")
df_inventory.printSchema()

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2A: Join Tables — PySpark DataFrame API
# ────────────────────────────────────────────────────────────────────────────
# Join sales with products to enrich sales data with product details.
#
# ⚠️ BUG BELOW: The join key is WRONG.
# HINT: The sales table uses 'sku' as the product identifier.
#       The products table also uses 'sku'.
#       But the join below uses 'product_id' which DOESN'T EXIST.
#       This will produce an empty result or an AnalysisException.

from pyspark.sql.functions import col, sum as spark_sum, avg, count

# Join sales with product details
df_sales_enriched = (
    df_sales
    .join(df_products, df_sales["product_id"] == df_products["sku"], "inner")  # <── ⚠️ BUG HERE
    .select(
        df_sales["transaction_id"],
        df_sales["store_id"],
        df_sales["sku"],
        df_products["product_name"],
        df_products["category"],
        df_sales["quantity"],
        df_sales["unit_price"],
        df_sales["total_amount"],
        df_sales["transaction_date"],
    )
)

df_sales_enriched.show(10, truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 2B: Join Tables — SQL Approach
# ────────────────────────────────────────────────────────────────────────────
# The equivalent SQL JOIN. Notice the join key difference — which is correct?
#
# ⚠️ SAME BUG: Uses s.product_id instead of s.sku

df_sales_enriched_sql = spark.sql(f"""
    SELECT
        s.transaction_id,
        s.store_id,
        s.sku,
        p.product_name,
        p.category,
        s.quantity,
        s.unit_price,
        s.total_amount,
        s.transaction_date
    FROM {bronze_schema}.sales_transactions s
    INNER JOIN {bronze_schema}.products p
        ON s.product_id = p.sku  -- ⚠️ BUG: s.product_id should be s.sku
""")

df_sales_enriched_sql.show(10, truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Aggregate Sales Metrics per SKU
# ────────────────────────────────────────────────────────────────────────────
# Calculate daily sales velocity, total revenue, and average order size
# per SKU. This will be used for reorder point calculation.

# PySpark approach
from pyspark.sql.functions import countDistinct, round as spark_round

df_sku_metrics = (
    df_sales_enriched
    .groupBy("sku", "product_name", "category", "store_id")
    .agg(
        spark_sum("quantity").alias("total_units_sold"),
        spark_sum("total_amount").alias("total_revenue"),
        avg("quantity").alias("avg_order_qty"),
        countDistinct("transaction_date").alias("selling_days"),
        count("transaction_id").alias("transaction_count"),
    )
    .withColumn(
        "avg_daily_sales",
        spark_round(col("total_units_sold") / col("selling_days"), 2)
    )
)

df_sku_metrics.show(truncate=False)

# COMMAND ----------

# SQL equivalent — same aggregation logic:

# spark.sql(f"""
#     SELECT
#         sku,
#         product_name,
#         category,
#         store_id,
#         SUM(quantity)                          AS total_units_sold,
#         SUM(total_amount)                      AS total_revenue,
#         AVG(quantity)                           AS avg_order_qty,
#         COUNT(DISTINCT transaction_date)        AS selling_days,
#         COUNT(transaction_id)                   AS transaction_count,
#         ROUND(SUM(quantity) / COUNT(DISTINCT transaction_date), 2) AS avg_daily_sales
#     FROM sales_enriched_view
#     GROUP BY sku, product_name, category, store_id
# """)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4A: Deduplication — PySpark Window Function
# ────────────────────────────────────────────────────────────────────────────
# Join inventory levels with SKU metrics and deduplicate.
# Inventory data may have multiple records per SKU (from different scan times).
# We want the LATEST record per SKU using ROW_NUMBER().

from pyspark.sql.window import Window
from pyspark.sql.functions import row_number, desc

# Join inventory with products
df_inventory_enriched = (
    df_inventory
    .join(df_products, "sku", "inner")
)

# Deduplicate: keep only the latest inventory record per SKU per store
# ROW_NUMBER() assigns sequential numbers within each partition.
# We partition by (sku, store_id) and order by _ingested_at descending
# to get the most recent record as row_number = 1.

window_spec = Window.partitionBy("sku", "store_id").orderBy(desc("_ingested_at"))

df_inventory_deduped = (
    df_inventory_enriched
    .withColumn("row_num", row_number().over(window_spec))
    .filter(col("row_num") == 1)
    .drop("row_num")
)

print(f"📊 Before dedup: {df_inventory_enriched.count()} rows")
print(f"📊 After dedup:  {df_inventory_deduped.count()} rows")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4B: Deduplication — SQL ROW_NUMBER() Approach
# ────────────────────────────────────────────────────────────────────────────
# Same deduplication logic in pure SQL using a CTE (Common Table Expression).

# First, register temp views for SQL queries
df_inventory_enriched.createOrReplaceTempView("inventory_enriched")

df_inventory_deduped_sql = spark.sql("""
    WITH ranked_inventory AS (
        SELECT
            *,
            ROW_NUMBER() OVER (
                PARTITION BY sku, store_id
                ORDER BY _ingested_at DESC
            ) AS row_num
        FROM inventory_enriched
    )
    SELECT *
    FROM ranked_inventory
    WHERE row_num = 1
""")

df_inventory_deduped_sql.show(10, truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 5: Create Silver Inventory Table
# ────────────────────────────────────────────────────────────────────────────
# Combine deduplicated inventory with sales metrics for a complete view.

from pyspark.sql.functions import current_timestamp

df_silver_inventory = (
    df_inventory_deduped
    .join(
        df_sku_metrics.select("sku", "store_id", "avg_daily_sales", "total_units_sold"),
        on=["sku", "store_id"],
        how="left"  # Keep all inventory items, even those with no sales
    )
    .withColumn("_updated_at", current_timestamp())
)

# Write the Silver table
(
    df_silver_inventory
    .write
    .mode("overwrite")
    .option("overwriteSchema", "true")
    .saveAsTable(f"{silver_schema}.inventory")
)

print(f"✅ Silver inventory table created: {silver_schema}.inventory")
print(f"📊 {df_silver_inventory.count()} rows")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 6: Verify Silver Table
# ────────────────────────────────────────────────────────────────────────────

# Check for duplicates (should be 0)
dup_check = spark.sql(f"""
    SELECT sku, store_id, COUNT(*) as cnt
    FROM {silver_schema}.inventory
    GROUP BY sku, store_id
    HAVING cnt > 1
""")

dup_count = dup_check.count()
print(f"🔍 Duplicate (sku, store_id) pairs: {dup_count}")

if dup_count == 0:
    print("✅ No duplicates — deduplication working correctly!")
else:
    print("❌ Duplicates found — check your dedup logic")
    dup_check.show(truncate=False)

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: BROKEN — FIX REQUIRED
# ────────────────────────────────────────────────────────────────────────────
# WHAT'S BROKEN:
#   The join in Section 2 uses `product_id` as the join key from the sales
#   table, but that column doesn't exist. The correct key is `sku`.
#
# TO FIX:
#   1. In Section 2A: Change df_sales["product_id"] → df_sales["sku"]
#   2. In Section 2B: Change s.product_id → s.sku in the SQL ON clause
#
# CONCEPTS LEARNED:
#   1. PySpark .join() vs SQL JOIN syntax
#   2. ROW_NUMBER() for deduplication (PySpark Window + SQL OVER)
#   3. Aggregations with groupBy vs GROUP BY
#   4. LEFT joins for preserving all rows from one side
#   5. CTE (WITH ... AS) pattern in SQL for query organization
#
# NEXT → 03_gold_reorder.py — Implement reorder point calculation
# ────────────────────────────────────────────────────────────────────────────
