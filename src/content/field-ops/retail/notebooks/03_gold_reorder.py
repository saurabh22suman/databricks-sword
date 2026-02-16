# Databricks notebook source
# MAGIC %md
# MAGIC # 03 - Gold Reorder Recommendations
# MAGIC 
# MAGIC **Objective:** Create reorder recommendations based on sales velocity and current stock
# MAGIC 
# MAGIC **Current Issue:** This is an EMPTY notebook - you need to implement the logic
# MAGIC 
# MAGIC **Hint:** Join inventory with sales data, calculate velocity, recommend reorders for items below threshold

# COMMAND ----------

# TODO: Implement the reorder logic
# 1. Calculate sales velocity from Bronze sales data
# 2. Join with Silver inventory
# 3. Recommend reorders where current_stock < reorder_point
# 4. Save to Gold layer

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, count, sum, datediff, current_date

spark = SparkSession.builder.getOrCreate()

# Your implementation here:

# Step 1: Read sales and inventory data
# sales = spark.table("{catalog}.{schema_prefix}_bronze.sales_transactions")
# inventory = spark.table("{catalog}.{schema_prefix}_silver.inventory")

# Step 2: Calculate sales velocity (units per day)
# sales_velocity = sales.groupBy("product_id").agg(
#     sum("quantity").alias("total_sold"),
#     count("*").alias("num_transactions")
# )

# Step 3: Join with inventory and calculate reorder quantity
# recommendations = inventory.join(sales_velocity, inventory.sku == sales_velocity.product_id, "left")
# recommendations = recommendations.withColumn(
#     "reorder_quantity",
#     when(col("current_stock") < col("reorder_point"), 
#          col("reorder_point") * 2 - col("current_stock")
#     ).otherwise(0)
# )

# Step 4: Save to Gold layer
# recommendations.write.mode("overwrite").saveAsTable("{catalog}.{schema_prefix}_gold.reorder_recommendations")
