# Databricks notebook source

# ════════════════════════════════════════════════════════════════════════════
# NOTEBOOK: 03_gold_reorder.py
# MISSION:  Retail — Inventory Optimization Pipeline
# STATUS:   EMPTY — Player must implement reorder point calculation
# ════════════════════════════════════════════════════════════════════════════
#
# YOUR TASK:
#   Build the gold-layer reorder recommendation table. This is the
#   business-critical output — it tells store managers WHAT to reorder,
#   HOW MUCH, and WHEN.
#
# BUSINESS QUESTION:
#   Which products are below their reorder point and need restocking?
#   How many units should be ordered?
#
# INPUT TABLES:
#   - {catalog}.{schema_prefix}_silver.inventory
#     Columns: sku, store_id, product_name, category, current_stock,
#              avg_daily_sales, total_units_sold
#
# OUTPUT TABLE:
#   - {catalog}.{schema_prefix}_gold.reorder_recommendations
#     Required columns:
#       sku              STRING   — Product SKU
#       product_name     STRING   — Product name
#       store_id         STRING   — Store identifier
#       current_stock    INT      — Current inventory level
#       reorder_point    INT      — Stock level that triggers reorder
#       recommended_qty  INT      — How many units to order
#       priority         STRING   — 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
#       days_of_stock    DOUBLE   — Days of stock remaining at current rate
#
# FORMULAS:
#   reorder_point  = avg_daily_sales × lead_time_days + safety_stock
#   safety_stock   = avg_daily_sales × safety_factor (typically 1.5)
#   lead_time_days = 7 (industry standard for retail)
#   recommended_qty = (reorder_point × 2) - current_stock  (if below reorder point)
#   days_of_stock  = current_stock / avg_daily_sales
#
# PRIORITY LOGIC:
#   CRITICAL = days_of_stock < 3
#   HIGH     = days_of_stock < 7
#   MEDIUM   = days_of_stock < 14
#   LOW      = everything else
#
# APPROACHES:
#   You can implement this using EITHER PySpark DataFrame API OR SQL.
#   Try BOTH to practice! Examples of each approach are in the hints.
#
# RESOURCES:
#   - Reorder Point: https://en.wikipedia.org/wiki/Reorder_point
#   - PySpark when(): https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.when.html
#   - SQL CASE WHEN:  https://docs.databricks.com/en/sql/language-manual/functions/case.html
#
# TIP: Start by reading the Silver inventory table and inspecting what
# columns are available. Then calculate the derived columns one at a time.
#
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

# Business constants
LEAD_TIME_DAYS = 7       # Days to receive a new shipment
SAFETY_FACTOR  = 1.5     # Multiplier for safety stock

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 1: Load Silver Data
# ────────────────────────────────────────────────────────────────────────────
# Start by reading the Silver inventory table and understanding the data.

df_inventory = spark.read.table(f"{silver_schema}.inventory")
print(f"📊 Silver inventory: {df_inventory.count()} rows")
df_inventory.printSchema()
display(df_inventory.limit(10))

# COMMAND ----------

# ════════════════════════════════════════════════════════════════════════════
# SECTION 2: YOUR IMPLEMENTATION GOES HERE
# ════════════════════════════════════════════════════════════════════════════
#
# APPROACH A — PySpark DataFrame API:
#
# from pyspark.sql.functions import col, when, round as spark_round, lit
#
# df_reorder = (
#     df_inventory
#     .withColumn("safety_stock", ???)
#     .withColumn("reorder_point", ???)
#     .withColumn("days_of_stock", ???)
#     .withColumn("recommended_qty", when(???).otherwise(0))
#     .withColumn("priority", when(???).when(???).when(???).otherwise("LOW"))
#     .select("sku", "product_name", "store_id", "current_stock",
#             "reorder_point", "recommended_qty", "priority", "days_of_stock")
# )
#
# ─────────────────────────────────────────────────────────────────────
#
# APPROACH B — SQL:
#
# spark.sql(f"""
#     CREATE OR REPLACE TABLE {gold_schema}.reorder_recommendations AS
#     WITH inventory_metrics AS (
#         SELECT
#             sku,
#             product_name,
#             store_id,
#             current_stock,
#             avg_daily_sales,
#             avg_daily_sales * {SAFETY_FACTOR} AS safety_stock,
#             ??? AS reorder_point,
#             ??? AS days_of_stock
#         FROM {silver_schema}.inventory
#         WHERE avg_daily_sales > 0
#     )
#     SELECT
#         *,
#         CASE
#             WHEN current_stock < reorder_point
#             THEN ???
#             ELSE 0
#         END AS recommended_qty,
#         CASE
#             WHEN days_of_stock < 3  THEN 'CRITICAL'
#             WHEN days_of_stock < 7  THEN 'HIGH'
#             WHEN days_of_stock < 14 THEN 'MEDIUM'
#             ELSE 'LOW'
#         END AS priority
#     FROM inventory_metrics
# """)
#
# ════════════════════════════════════════════════════════════════════════════

# START YOUR CODE BELOW ───────────────────────────────────────────────────


# ─────────────────────────────────────────────── END YOUR CODE ───────────

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 3: Write Gold Table (if using PySpark approach)
# ────────────────────────────────────────────────────────────────────────────
# If you used the PySpark approach above, write the result here.
# If you used the SQL CREATE TABLE approach, this section is optional.

# df_reorder.write.mode("overwrite").saveAsTable(f"{gold_schema}.reorder_recommendations")
# print(f"✅ Gold table created: {gold_schema}.reorder_recommendations")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# SECTION 4: Validate Your Results
# ────────────────────────────────────────────────────────────────────────────
# Run these checks to verify your implementation is correct.

# Check 1: Table exists and has data
try:
    df_gold = spark.read.table(f"{gold_schema}.reorder_recommendations")
    print(f"✅ Check 1 PASSED: Table exists with {df_gold.count()} rows")
except Exception as e:
    print(f"❌ Check 1 FAILED: Table not found — {e}")

# COMMAND ----------

# Check 2: Required columns exist
required_cols = {"sku", "product_name", "current_stock", "reorder_point", "recommended_qty"}
try:
    actual_cols = set(df_gold.columns)
    missing = required_cols - actual_cols
    if not missing:
        print(f"✅ Check 2 PASSED: All required columns present")
    else:
        print(f"❌ Check 2 FAILED: Missing columns: {missing}")
except:
    print("❌ Check 2 SKIPPED: Table not created yet")

# COMMAND ----------

# Check 3: Reorder logic is correct (items below reorder point have recs)
try:
    validation = spark.sql(f"""
        SELECT COUNT(*) > 0 AS passed
        FROM {gold_schema}.reorder_recommendations
        WHERE current_stock < reorder_point AND recommended_qty > 0
    """)
    result = validation.collect()[0]["passed"]
    print(f"{'✅' if result else '❌'} Check 3: Reorder logic {'PASSED' if result else 'FAILED'}")
except:
    print("❌ Check 3 SKIPPED: Table not created yet")

# COMMAND ----------

# ────────────────────────────────────────────────────────────────────────────
# ✅ NOTEBOOK STATUS: EMPTY — YOUR IMPLEMENTATION NEEDED
# ────────────────────────────────────────────────────────────────────────────
# CONCEPTS TO PRACTICE:
#   1. PySpark withColumn() + when() for conditional logic
#   2. SQL CASE WHEN for conditional expressions
#   3. Calculated columns from business formulas
#   4. Gold layer as business-ready aggregated data
#   5. Self-validation of your implementation
#
# MISSION COMPLETE when all 3 checks pass! 🏆
# ────────────────────────────────────────────────────────────────────────────
