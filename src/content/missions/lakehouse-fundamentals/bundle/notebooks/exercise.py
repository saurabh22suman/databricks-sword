# Databricks notebook source
# MAGIC %md
# MAGIC # 🏰 Mission: Lakehouse Fundamentals
# MAGIC 
# MAGIC Welcome, Operative! This mission will teach you the core concepts of the **Lakehouse paradigm** and **Delta Lake**.
# MAGIC 
# MAGIC ## Objectives
# MAGIC - Understand the Lakehouse architecture
# MAGIC - Create and manage Delta Lake tables
# MAGIC - Perform CRUD operations (Create, Read, Update, Delete)
# MAGIC - Experience ACID guarantees in action
# MAGIC 
# MAGIC ## Prerequisites
# MAGIC - Basic SQL knowledge
# MAGIC - The schema `main.dbsword_lakehouse_fundamentals` has been created for you
# MAGIC 
# MAGIC **Let's begin!**

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 1: Understanding Your Environment
# MAGIC 
# MAGIC First, let's verify our schema is ready and explore the catalog structure.

# COMMAND ----------

# Show available catalogs
spark.sql("SHOW CATALOGS").show()

# COMMAND ----------

# Show schemas in the main catalog
spark.sql("SHOW SCHEMAS IN main").show()

# COMMAND ----------

# Use our mission schema
spark.sql("USE main.dbsword_lakehouse_fundamentals")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 2: Creating Your First Delta Table
# MAGIC 
# MAGIC Delta Lake is the foundation of the Lakehouse architecture. Let's create a table to store event data.
# MAGIC 
# MAGIC ### TODO: Create the events table
# MAGIC 
# MAGIC Create a Delta table called `events` with the following schema:
# MAGIC - `event_id` (STRING) - Unique identifier for the event
# MAGIC - `event_type` (STRING) - Type of event (click, purchase, view)
# MAGIC - `user_id` (STRING) - User who triggered the event
# MAGIC - `timestamp` (TIMESTAMP) - When the event occurred
# MAGIC - `properties` (MAP<STRING, STRING>) - Additional event properties

# COMMAND ----------

# TODO: Create the events table using CREATE TABLE with Delta format
# Hint: Use CREATE TABLE IF NOT EXISTS ... USING DELTA

# YOUR CODE HERE:


# COMMAND ----------

# MAGIC %md
# MAGIC ### Verify Table Creation
# MAGIC 
# MAGIC Let's check that our table was created correctly.

# COMMAND ----------

# Describe the table structure
spark.sql("DESCRIBE TABLE events").show(truncate=False)

# COMMAND ----------

# Show table properties - notice it's a DELTA table
spark.sql("DESCRIBE EXTENDED events").show(truncate=False)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 3: Inserting Data (Create)
# MAGIC 
# MAGIC Now let's add some data to our table.
# MAGIC 
# MAGIC ### TODO: Insert sample events
# MAGIC 
# MAGIC Insert at least 5 events into the `events` table using SQL INSERT statements.

# COMMAND ----------

# TODO: Insert sample events
# Hint: INSERT INTO events VALUES ('event-001', 'click', 'user-123', current_timestamp(), map('page', '/home'))

# YOUR CODE HERE:


# COMMAND ----------

# MAGIC %md
# MAGIC ### Alternative: Insert using PySpark DataFrame

# COMMAND ----------

from pyspark.sql.types import StructType, StructField, StringType, TimestampType, MapType
from datetime import datetime

# Create sample data
sample_events = [
    ("event-100", "purchase", "user-456", datetime.now(), {"item": "widget", "price": "29.99"}),
    ("event-101", "view", "user-789", datetime.now(), {"page": "/products/widget"}),
    ("event-102", "click", "user-456", datetime.now(), {"button": "add-to-cart"}),
]

# Define schema
schema = StructType([
    StructField("event_id", StringType(), False),
    StructField("event_type", StringType(), True),
    StructField("user_id", StringType(), True),
    StructField("timestamp", TimestampType(), True),
    StructField("properties", MapType(StringType(), StringType()), True),
])

# Create DataFrame and write to table
df = spark.createDataFrame(sample_events, schema)
df.write.mode("append").saveAsTable("events")

# COMMAND ----------

# Verify data was inserted
spark.sql("SELECT * FROM events").show(truncate=False)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 4: Querying Data (Read)
# MAGIC 
# MAGIC Delta Lake tables support standard SQL queries with all the power of Spark SQL.
# MAGIC 
# MAGIC ### TODO: Write queries to explore the data

# COMMAND ----------

# TODO: Count events by type
# YOUR CODE HERE:


# COMMAND ----------

# TODO: Find all events for a specific user
# YOUR CODE HERE:


# COMMAND ----------

# TODO: Get the most recent events
# YOUR CODE HERE:


# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 5: Updating Data (Update)
# MAGIC 
# MAGIC One of Delta Lake's killer features is support for UPDATE operations - something traditional data lakes cannot do!
# MAGIC 
# MAGIC ### TODO: Update event data

# COMMAND ----------

# TODO: Update the event_type for a specific event
# Hint: UPDATE events SET event_type = 'conversion' WHERE event_id = 'event-100'

# YOUR CODE HERE:


# COMMAND ----------

# Verify the update
spark.sql("SELECT * FROM events WHERE event_id = 'event-100'").show()

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 6: Deleting Data (Delete)
# MAGIC 
# MAGIC Delta Lake also supports DELETE operations with full ACID compliance.
# MAGIC 
# MAGIC ### TODO: Delete specific records

# COMMAND ----------

# First, let's see what we have
spark.sql("SELECT COUNT(*) as total_events FROM events").show()

# COMMAND ----------

# TODO: Delete events of a specific type (e.g., 'view' events)
# Hint: DELETE FROM events WHERE event_type = 'view'

# YOUR CODE HERE:


# COMMAND ----------

# Verify the deletion
spark.sql("SELECT COUNT(*) as total_events FROM events").show()
spark.sql("SELECT DISTINCT event_type FROM events").show()

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 7: Time Travel (ACID Guarantees)
# MAGIC 
# MAGIC Delta Lake maintains a transaction log that enables "time travel" - viewing previous versions of your data.
# MAGIC 
# MAGIC This is possible because of ACID guarantees:
# MAGIC - **Atomicity**: Transactions are all-or-nothing
# MAGIC - **Consistency**: Data is always in a valid state
# MAGIC - **Isolation**: Concurrent transactions don't interfere
# MAGIC - **Durability**: Committed changes are permanent

# COMMAND ----------

# View table history
spark.sql("DESCRIBE HISTORY events").show(truncate=False)

# COMMAND ----------

# TODO: Query a previous version of the table
# Hint: SELECT * FROM events VERSION AS OF <version_number>

# YOUR CODE HERE:


# COMMAND ----------

# TODO: Query the table as it was at a specific timestamp
# Hint: SELECT * FROM events TIMESTAMP AS OF '<timestamp>'

# YOUR CODE HERE:


# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 8: Schema Evolution
# MAGIC 
# MAGIC Delta Lake supports schema evolution - adding new columns without rewriting the entire table.

# COMMAND ----------

# Add a new column to the table
spark.sql("ALTER TABLE events ADD COLUMN source STRING COMMENT 'Source of the event'")

# COMMAND ----------

# Verify the schema change
spark.sql("DESCRIBE TABLE events").show()

# COMMAND ----------

# MAGIC %md
# MAGIC ## Mission Complete! 🎉
# MAGIC 
# MAGIC Congratulations, Operative! You've mastered the fundamentals of the Lakehouse architecture and Delta Lake.
# MAGIC 
# MAGIC ### Key Takeaways
# MAGIC 1. **Delta Lake** is the storage layer that enables ACID transactions on data lakes
# MAGIC 2. **CRUD operations** (Create, Read, Update, Delete) work just like a traditional database
# MAGIC 3. **Time Travel** lets you query historical data and recover from mistakes
# MAGIC 4. **Schema Evolution** allows your tables to grow with your needs
# MAGIC 
# MAGIC ### Cleanup (Optional)
# MAGIC 
# MAGIC Run the cell below to clean up the resources created in this mission.

# COMMAND ----------

# OPTIONAL: Clean up - uncomment and run to delete the table
# spark.sql("DROP TABLE IF EXISTS events")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Evaluation Queries
# MAGIC 
# MAGIC These queries will be used to validate your mission completion.
# MAGIC **Do not modify this section.**

# COMMAND ----------

# Evaluation: Table exists and has correct schema
eval_schema = spark.sql("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'dbsword_lakehouse_fundamentals' 
    AND table_name = 'events'
    ORDER BY ordinal_position
""")
eval_schema.show()

# COMMAND ----------

# Evaluation: Table has data
eval_count = spark.sql("SELECT COUNT(*) as count FROM events")
eval_count.show()

# COMMAND ----------

# Evaluation: Table supports time travel (has history)
eval_history = spark.sql("SELECT COUNT(*) as versions FROM (DESCRIBE HISTORY events)")
eval_history.show()
