# Databricks notebook source
# MAGIC %md
# MAGIC # 📊 Mission: SQL Analytics Intro
# MAGIC 
# MAGIC Welcome, Operative! This mission will teach you how to leverage **SQL Warehouses** for analytics.
# MAGIC 
# MAGIC ## Objectives
# MAGIC - Understand SQL Warehouse architecture
# MAGIC - Master multi-table JOINs
# MAGIC - Work with GROUP BY aggregations
# MAGIC - Create Views and CTEs
# MAGIC 
# MAGIC **Let's begin!**

# COMMAND ----------

# MAGIC %md
# MAGIC ## Setup: Create Sample Tables

# COMMAND ----------

# MAGIC %sql
# MAGIC USE main.dbsword_sql_analytics;

# COMMAND ----------

# MAGIC %sql
# MAGIC -- Create customers table
# MAGIC CREATE TABLE IF NOT EXISTS customers (
# MAGIC     customer_id STRING,
# MAGIC     name STRING,
# MAGIC     email STRING,
# MAGIC     segment STRING,
# MAGIC     created_at DATE
# MAGIC ) USING DELTA;
# MAGIC 
# MAGIC -- Create orders table
# MAGIC CREATE TABLE IF NOT EXISTS orders (
# MAGIC     order_id STRING,
# MAGIC     customer_id STRING,
# MAGIC     order_date DATE,
# MAGIC     total_amount DECIMAL(10,2),
# MAGIC     status STRING
# MAGIC ) USING DELTA;
# MAGIC 
# MAGIC -- Create products table
# MAGIC CREATE TABLE IF NOT EXISTS products (
# MAGIC     product_id STRING,
# MAGIC     name STRING,
# MAGIC     category STRING,
# MAGIC     price DECIMAL(10,2)
# MAGIC ) USING DELTA;
# MAGIC 
# MAGIC -- Create order_items table
# MAGIC CREATE TABLE IF NOT EXISTS order_items (
# MAGIC     order_id STRING,
# MAGIC     product_id STRING,
# MAGIC     quantity INT,
# MAGIC     unit_price DECIMAL(10,2)
# MAGIC ) USING DELTA;

# COMMAND ----------

# MAGIC %sql
# MAGIC -- Insert sample customers
# MAGIC INSERT INTO customers VALUES
# MAGIC     ('C001', 'Alice Johnson', 'alice@example.com', 'Premium', '2022-01-15'),
# MAGIC     ('C002', 'Bob Smith', 'bob@example.com', 'Standard', '2022-03-20'),
# MAGIC     ('C003', 'Carol White', 'carol@example.com', 'Premium', '2021-11-10'),
# MAGIC     ('C004', 'David Brown', 'david@example.com', 'Standard', '2023-02-01'),
# MAGIC     ('C005', 'Eva Green', 'eva@example.com', 'Premium', '2022-07-15');
# MAGIC 
# MAGIC -- Insert sample products
# MAGIC INSERT INTO products VALUES
# MAGIC     ('P001', 'Data Sword Pro', 'Software', 299.99),
# MAGIC     ('P002', 'Analytics Shield', 'Software', 199.99),
# MAGIC     ('P003', 'Cloud Armor', 'Service', 499.99),
# MAGIC     ('P004', 'Query Blade', 'Software', 99.99),
# MAGIC     ('P005', 'Pipeline Forge', 'Service', 349.99);
# MAGIC 
# MAGIC -- Insert sample orders
# MAGIC INSERT INTO orders VALUES
# MAGIC     ('O001', 'C001', '2024-01-10', 599.98, 'Completed'),
# MAGIC     ('O002', 'C002', '2024-01-12', 199.99, 'Completed'),
# MAGIC     ('O003', 'C001', '2024-01-15', 499.99, 'Completed'),
# MAGIC     ('O004', 'C003', '2024-01-18', 849.97, 'Completed'),
# MAGIC     ('O005', 'C004', '2024-01-20', 99.99, 'Pending'),
# MAGIC     ('O006', 'C005', '2024-01-22', 649.98, 'Completed');
# MAGIC 
# MAGIC -- Insert sample order items
# MAGIC INSERT INTO order_items VALUES
# MAGIC     ('O001', 'P001', 1, 299.99),
# MAGIC     ('O001', 'P001', 1, 299.99),
# MAGIC     ('O002', 'P002', 1, 199.99),
# MAGIC     ('O003', 'P003', 1, 499.99),
# MAGIC     ('O004', 'P001', 1, 299.99),
# MAGIC     ('O004', 'P005', 1, 349.99),
# MAGIC     ('O004', 'P002', 1, 199.99),
# MAGIC     ('O005', 'P004', 1, 99.99),
# MAGIC     ('O006', 'P001', 1, 299.99),
# MAGIC     ('O006', 'P005', 1, 349.99);

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 1: Basic SELECT Queries

# COMMAND ----------

# MAGIC %sql
# MAGIC -- View all customers
# MAGIC SELECT * FROM customers;

# COMMAND ----------

# MAGIC %sql
# MAGIC -- TODO: Select only Premium customers
# MAGIC -- YOUR CODE HERE:
# MAGIC 

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 2: JOINs
# MAGIC 
# MAGIC JOINs are essential for combining data from multiple tables.

# COMMAND ----------

# MAGIC %sql
# MAGIC -- Example: Join orders with customers
# MAGIC SELECT 
# MAGIC     o.order_id,
# MAGIC     c.name as customer_name,
# MAGIC     o.total_amount,
# MAGIC     o.order_date
# MAGIC FROM orders o
# MAGIC JOIN customers c ON o.customer_id = c.customer_id;

# COMMAND ----------

# MAGIC %sql
# MAGIC -- TODO: Join order_items with products to see what was ordered
# MAGIC -- Hint: Join on product_id
# MAGIC -- YOUR CODE HERE:
# MAGIC 

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 3: GROUP BY Aggregations
# MAGIC 
# MAGIC Aggregate functions summarize data across groups.

# COMMAND ----------

# MAGIC %sql
# MAGIC -- Count orders per customer
# MAGIC SELECT 
# MAGIC     c.name,
# MAGIC     COUNT(o.order_id) as order_count,
# MAGIC     SUM(o.total_amount) as total_spent
# MAGIC FROM customers c
# MAGIC LEFT JOIN orders o ON c.customer_id = o.customer_id
# MAGIC GROUP BY c.customer_id, c.name
# MAGIC ORDER BY total_spent DESC;

# COMMAND ----------

# MAGIC %sql
# MAGIC -- TODO: Calculate total revenue by product category
# MAGIC -- Hint: Join order_items with products, group by category
# MAGIC -- YOUR CODE HERE:
# MAGIC 

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 4: CTEs (Common Table Expressions)
# MAGIC 
# MAGIC CTEs make complex queries more readable.

# COMMAND ----------

# MAGIC %sql
# MAGIC -- Example CTE: Find high-value customers
# MAGIC WITH customer_totals AS (
# MAGIC     SELECT 
# MAGIC         customer_id,
# MAGIC         SUM(total_amount) as lifetime_value
# MAGIC     FROM orders
# MAGIC     WHERE status = 'Completed'
# MAGIC     GROUP BY customer_id
# MAGIC )
# MAGIC SELECT 
# MAGIC     c.name,
# MAGIC     c.segment,
# MAGIC     ct.lifetime_value
# MAGIC FROM customers c
# MAGIC JOIN customer_totals ct ON c.customer_id = ct.customer_id
# MAGIC WHERE ct.lifetime_value > 500
# MAGIC ORDER BY ct.lifetime_value DESC;

# COMMAND ----------

# MAGIC %sql
# MAGIC -- TODO: Create a CTE to find the most popular product
# MAGIC -- Hint: Count order_items by product_id, then join with products
# MAGIC -- YOUR CODE HERE:
# MAGIC 

# COMMAND ----------

# MAGIC %md
# MAGIC ## Part 5: Views
# MAGIC 
# MAGIC Views save queries for reuse.

# COMMAND ----------

# MAGIC %sql
# MAGIC -- Create a view for customer analytics
# MAGIC CREATE OR REPLACE VIEW customer_analytics AS
# MAGIC SELECT 
# MAGIC     c.customer_id,
# MAGIC     c.name,
# MAGIC     c.segment,
# MAGIC     COUNT(o.order_id) as total_orders,
# MAGIC     COALESCE(SUM(o.total_amount), 0) as total_revenue,
# MAGIC     MIN(o.order_date) as first_order,
# MAGIC     MAX(o.order_date) as last_order
# MAGIC FROM customers c
# MAGIC LEFT JOIN orders o ON c.customer_id = o.customer_id
# MAGIC GROUP BY c.customer_id, c.name, c.segment;

# COMMAND ----------

# MAGIC %sql
# MAGIC -- Query the view
# MAGIC SELECT * FROM customer_analytics ORDER BY total_revenue DESC;

# COMMAND ----------

# MAGIC %md
# MAGIC ## Mission Complete! 🎉
# MAGIC 
# MAGIC ### Key Takeaways
# MAGIC 1. **JOINs** combine data from multiple tables
# MAGIC 2. **GROUP BY** enables powerful aggregations
# MAGIC 3. **CTEs** improve query readability
# MAGIC 4. **Views** save queries for reuse

# COMMAND ----------

# MAGIC %md
# MAGIC ## Evaluation Queries

# COMMAND ----------

# MAGIC %sql
# MAGIC -- Eval: JOIN query works
# MAGIC SELECT COUNT(*) as joined_rows 
# MAGIC FROM orders o 
# MAGIC JOIN customers c ON o.customer_id = c.customer_id;

# COMMAND ----------

# MAGIC %sql
# MAGIC -- Eval: View exists and returns data
# MAGIC SELECT COUNT(*) as view_rows FROM customer_analytics;
