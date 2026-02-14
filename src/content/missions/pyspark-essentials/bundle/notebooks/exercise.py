# Databricks notebook source
# MAGIC %md
# MAGIC # 🔥 Mission: PySpark Essentials
# MAGIC 
# MAGIC Welcome, Operative! This mission will teach you the fundamentals of **PySpark DataFrames** and the **Spark execution model**.
# MAGIC 
# MAGIC ## Objectives
# MAGIC - Master the DataFrame API
# MAGIC - Understand transformations vs actions
# MAGIC - Learn lazy evaluation
# MAGIC - Explore the Spark execution model
# MAGIC 
# MAGIC ## Prerequisites
# MAGIC - Complete "Lakehouse Fundamentals" mission
# MAGIC - Basic Python knowledge
# MAGIC 
# MAGIC **Let's begin!**

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 1: Creating DataFrames
# MAGIC 
# MAGIC DataFrames are the primary abstraction in Spark for working with structured data.
# MAGIC There are multiple ways to create DataFrames.

# COMMAND ----------

# Method 1: From a Python list
data = [
    ("Alice", 34, "Engineering"),
    ("Bob", 45, "Marketing"),
    ("Charlie", 29, "Engineering"),
    ("Diana", 38, "Sales"),
    ("Eve", 31, "Marketing"),
]

columns = ["name", "age", "department"]

df = spark.createDataFrame(data, columns)
df.show()

# COMMAND ----------

# Method 2: From a dictionary (using pandas)
import pandas as pd

pandas_df = pd.DataFrame({
    "product": ["Widget", "Gadget", "Gizmo"],
    "price": [19.99, 29.99, 39.99],
    "quantity": [100, 50, 25]
})

# Convert pandas DataFrame to Spark DataFrame
products_df = spark.createDataFrame(pandas_df)
products_df.show()

# COMMAND ----------

# Method 3: Reading from files
# Save our sample data first
products_df.write.mode("overwrite").parquet("/tmp/dbsword/products")

# Read it back
loaded_df = spark.read.parquet("/tmp/dbsword/products")
loaded_df.show()

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 2: Transformations vs Actions
# MAGIC 
# MAGIC This is one of the most important concepts in Spark!
# MAGIC 
# MAGIC - **Transformations** are *lazy* - they define a computation but don't execute it
# MAGIC - **Actions** trigger execution and return results
# MAGIC 
# MAGIC ### Common Transformations (Lazy)
# MAGIC - `select()`, `filter()`, `where()`, `groupBy()`, `orderBy()`, `join()`, `withColumn()`
# MAGIC 
# MAGIC ### Common Actions (Eager)
# MAGIC - `show()`, `count()`, `collect()`, `first()`, `take()`, `write()`

# COMMAND ----------

# Create our employee DataFrame
employees = spark.createDataFrame([
    ("E001", "Alice", "Engineering", 95000, "2020-01-15"),
    ("E002", "Bob", "Marketing", 75000, "2019-03-20"),
    ("E003", "Charlie", "Engineering", 110000, "2018-06-10"),
    ("E004", "Diana", "Sales", 85000, "2021-02-01"),
    ("E005", "Eve", "Marketing", 80000, "2020-08-15"),
    ("E006", "Frank", "Engineering", 120000, "2017-04-22"),
    ("E007", "Grace", "Sales", 90000, "2019-11-30"),
    ("E008", "Henry", "Engineering", 105000, "2020-05-18"),
], ["id", "name", "department", "salary", "hire_date"])

employees.show()

# COMMAND ----------

# MAGIC %md
# MAGIC ### Demonstrating Lazy Evaluation
# MAGIC 
# MAGIC Notice that transformations return immediately - no actual computation happens.

# COMMAND ----------

# These are TRANSFORMATIONS - they execute instantly but don't compute anything yet
from pyspark.sql.functions import col, avg, count

# Chain multiple transformations - still lazy!
result = (employees
    .filter(col("salary") > 80000)           # Transformation
    .select("name", "department", "salary")   # Transformation
    .orderBy(col("salary").desc()))           # Transformation

print("Transformations defined! But no computation yet...")
print(f"Type of result: {type(result)}")

# COMMAND ----------

# This is an ACTION - it triggers the computation
print("Executing action (show)...")
result.show()

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 3: DataFrame Transformations
# MAGIC 
# MAGIC Let's explore common DataFrame operations.

# COMMAND ----------

# MAGIC %md
# MAGIC ### TODO: Select Specific Columns
# MAGIC 
# MAGIC Select only the `name` and `salary` columns from the employees DataFrame.

# COMMAND ----------

# TODO: Select name and salary columns
# Hint: employees.select("name", "salary")

# YOUR CODE HERE:


# COMMAND ----------

# MAGIC %md
# MAGIC ### TODO: Filter Rows
# MAGIC 
# MAGIC Filter employees who work in the "Engineering" department.

# COMMAND ----------

# TODO: Filter for Engineering department
# Hint: employees.filter(col("department") == "Engineering")

# YOUR CODE HERE:


# COMMAND ----------

# MAGIC %md
# MAGIC ### TODO: Add a Calculated Column
# MAGIC 
# MAGIC Add a new column called `annual_bonus` that is 10% of the salary.

# COMMAND ----------

from pyspark.sql.functions import col

# TODO: Add annual_bonus column (salary * 0.10)
# Hint: employees.withColumn("annual_bonus", col("salary") * 0.10)

# YOUR CODE HERE:


# COMMAND ----------

# MAGIC %md
# MAGIC ### TODO: Group and Aggregate
# MAGIC 
# MAGIC Calculate the average salary and employee count per department.

# COMMAND ----------

from pyspark.sql.functions import avg, count

# TODO: Group by department and calculate avg salary and count
# Hint: employees.groupBy("department").agg(avg("salary").alias("avg_salary"), count("*").alias("count"))

# YOUR CODE HERE:


# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 4: The Spark Execution Model
# MAGIC 
# MAGIC When you call an action, Spark:
# MAGIC 1. Builds a **Logical Plan** from your transformations
# MAGIC 2. Optimizes it into a **Physical Plan**
# MAGIC 3. Generates **Tasks** that run on the cluster
# MAGIC 
# MAGIC You can see this plan using `.explain()`.

# COMMAND ----------

# Build a complex query
complex_query = (employees
    .filter(col("salary") > 80000)
    .groupBy("department")
    .agg(avg("salary").alias("avg_salary"))
    .orderBy(col("avg_salary").desc()))

# See the execution plan
complex_query.explain(mode="simple")

# COMMAND ----------

# See the detailed execution plan
complex_query.explain(mode="extended")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 5: Reading and Writing Data
# MAGIC 
# MAGIC Spark supports many file formats. Let's practice reading and writing data.

# COMMAND ----------

# MAGIC %md
# MAGIC ### Write to Different Formats

# COMMAND ----------

# Prepare data
output_base = "/tmp/dbsword/pyspark_essentials"

# Write as Parquet (columnar, compressed, efficient)
employees.write.mode("overwrite").parquet(f"{output_base}/parquet")
print("Written to Parquet!")

# Write as Delta (Parquet + ACID + time travel)
employees.write.mode("overwrite").format("delta").save(f"{output_base}/delta")
print("Written to Delta!")

# Write as CSV
employees.write.mode("overwrite").option("header", True).csv(f"{output_base}/csv")
print("Written to CSV!")

# Write as JSON
employees.write.mode("overwrite").json(f"{output_base}/json")
print("Written to JSON!")

# COMMAND ----------

# MAGIC %md
# MAGIC ### TODO: Read from Parquet

# COMMAND ----------

# TODO: Read the Parquet files we just wrote
# Hint: spark.read.parquet(f"{output_base}/parquet")

# YOUR CODE HERE:


# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 6: Caching and Persistence
# MAGIC 
# MAGIC When you reuse a DataFrame multiple times, you can cache it to avoid recomputation.

# COMMAND ----------

# Cache the DataFrame
employees.cache()

# First action will compute and cache
employees.count()  # Caches the data

# Subsequent actions use the cache
employees.show()   # Uses cache
employees.filter(col("department") == "Engineering").show()  # Reading from cache

# COMMAND ----------

# See storage info in Spark UI or:
print(f"Is cached: {employees.is_cached}")

# Uncache when done
employees.unpersist()
print(f"Is cached after unpersist: {employees.is_cached}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Mission Complete! 🎉
# MAGIC 
# MAGIC Congratulations, Operative! You've mastered the PySpark essentials.
# MAGIC 
# MAGIC ### Key Takeaways
# MAGIC 1. **DataFrames** are the primary abstraction for structured data
# MAGIC 2. **Transformations** are lazy - they define computations
# MAGIC 3. **Actions** trigger execution - they return results
# MAGIC 4. **The Execution Model** optimizes your queries automatically
# MAGIC 5. **Caching** improves performance for reused DataFrames
# MAGIC 
# MAGIC ### Cleanup

# COMMAND ----------

# OPTIONAL: Clean up temp files
# dbutils.fs.rm("/tmp/dbsword", recurse=True)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Evaluation Queries
# MAGIC 
# MAGIC These queries validate your mission completion.
# MAGIC **Do not modify this section.**

# COMMAND ----------

# Evaluation: Can create and transform DataFrames
eval_transform = (employees
    .filter(col("department") == "Engineering")
    .select("name", "salary")
    .orderBy("salary", ascending=False))
print(f"Transformation result count: {eval_transform.count()}")

# COMMAND ----------

# Evaluation: Can perform aggregations
eval_agg = employees.groupBy("department").agg(avg("salary").alias("avg_salary"))
eval_agg.show()
