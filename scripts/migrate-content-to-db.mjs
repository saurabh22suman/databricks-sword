/**
 * Migration script to insert existing MDX blog posts and static FAQ data to database.
 * Run with: node scripts/migrate-content-to-db.mjs
 */
import { createClient } from "@libsql/client";
import { randomUUID } from "crypto";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// ============================================
// BLOG POSTS DATA
// ============================================
const blogPosts = [
  {
    slug: "databricks-free-setup",
    title: "How to Set Up Databricks Free Edition for Databricks Sword",
    description: "Step-by-step guide to creating a free Databricks workspace and connecting it to Databricks Sword for real cluster execution.",
    author: "Databricks Sword",
    tags: ["databricks", "setup", "free-edition", "getting-started"],
    category: "tutorials",
    publishedAt: new Date("2025-01-15"),
    featured: true,
    content: `# How to Set Up Databricks Free Edition for Databricks Sword

Databricks Sword works entirely in simulated mode — you never *need* a real Databricks workspace.
But if you want to run your code against a real Spark cluster, Databricks offers a **free Community Edition** that's perfect for learning.

This guide walks you through setup in under 10 minutes.

---

## What Is Databricks Community Edition?

Databricks Community Edition is a free, limited version of the full Databricks platform. It gives you:

- **A single-node Spark cluster** (driver only, no workers)
- **Notebooks** for writing PySpark, SQL, Scala, and R
- **Delta Lake** support (ACID transactions, time travel)
- **DBFS** (Databricks File System) for storing data
- **MLflow** for experiment tracking

### Limitations

- No multi-node clusters (single driver only)
- No Jobs/Workflows scheduler
- No Unity Catalog
- No SQL Warehouses
- Cluster auto-terminates after 2 hours of inactivity
- Community support only (no SLA)

For Databricks Sword missions, the Community Edition covers all B-rank and most A-rank content.
S-rank missions that require Unity Catalog or Workflows will remain in simulated mode.

---

## Step 1: Sign Up

1. Navigate to [community.cloud.databricks.com](https://community.cloud.databricks.com)
2. Click **Sign Up** (or **Get Started — Free**)
3. Fill in:
   - First name, last name
   - Email address (use a personal email — corporate emails may redirect to a trial)
   - Company (enter "Learning" or your actual company)
4. Check the terms of service checkbox
5. Click **Sign Up**
6. Verify your email address by clicking the link sent to your inbox

> **Tip:** If you're redirected to a 14-day trial page instead of Community Edition, look for a small link that says "Get started with Community Edition" near the bottom.

---

## Step 2: Create Your Workspace

After verifying your email:

1. You'll be prompted to choose a cloud provider — select **Community Edition** (not AWS/Azure/GCP)
2. Wait 1-2 minutes for your workspace to provision
3. You'll land on the **Databricks Workspace** home page

Your workspace URL will look like: \`https://community.cloud.databricks.com\`

### Explore the Interface

- **Workspace** — your notebooks and files
- **Repos** — Git integration
- **Data** — browse tables and DBFS
- **Compute** — manage your cluster
- **Machine Learning** — MLflow experiments

---

## Step 3: Start Your Cluster

Before running any code, you need an active cluster:

1. Click **Compute** in the left sidebar
2. Click **Create Cluster** (or your existing cluster if one exists)
3. Give it a name like \`databricks-sword-cluster\`
4. Leave all defaults (single node, latest runtime)
5. Click **Create Cluster**
6. Wait 3-5 minutes for the cluster to start (status changes from "Pending" to "Running")

> **Note:** The cluster auto-terminates after **2 hours** of inactivity. You can restart it anytime from the Compute page.

---

## Step 4: Generate a Personal Access Token (PAT)

To connect your Databricks workspace to Databricks Sword, you need a PAT:

1. Click your **profile icon** (top-right corner)
2. Select **Settings**
3. Navigate to **Developer** → **Access Tokens**
4. Click **Generate New Token**
5. Enter a description: \`Databricks Sword\`
6. Set expiration: **90 days** (or your preference)
7. Click **Generate**
8. **Copy the token immediately** — you won't be able to see it again!

Store the token somewhere safe (password manager recommended).

---

## Step 5: Connect to Databricks Sword

1. Open Databricks Sword at your deployed URL
2. Navigate to **Profile** → **Settings**
3. Find the **Databricks Connection** section
4. Enter:
   - **Workspace URL:** \`https://community.cloud.databricks.com\`
   - **Personal Access Token:** paste your PAT
5. Click **Verify Connection**
6. If successful, you'll see a green checkmark
7. Click **Save**

---

## Step 6: Enable Real Mode on Missions

Now that you're connected:

1. Open any mission
2. Look for the **Mode Toggle** at the top of the stage player
3. Switch from **Simulated** to **Real Databricks**
4. Your code will now execute against your real Databricks cluster

> **Important:** Not all stages support real mode. Drag-drop and quiz stages are always simulated. Code challenges (fill-blank, free-text) will execute against your workspace.

---

## What's Next?

With your workspace connected, you can:

- **Run PySpark code** against a real Spark cluster
- **Create Delta tables** and query them with time travel
- **Track MLflow experiments** in your workspace
- **Compare your results** with the simulated output

Start with a B-rank mission like **Lakehouse Fundamentals** to test your connection.

---

## Troubleshooting

### "PAT expired" Error

Your Personal Access Token has a set expiration date. Generate a new one:

1. Go to Settings → Developer → Access Tokens
2. Generate a new token
3. Update it in Databricks Sword Profile → Settings

### "Cluster not running" Error

Your cluster auto-terminates after 2 hours of inactivity:

1. Go to Compute in your Databricks workspace
2. Find your cluster and click **Start**
3. Wait for it to reach "Running" state
4. Retry the mission

### "Connection refused" Error

Check that:

- Your workspace URL is exactly \`https://community.cloud.databricks.com\`
- There are no trailing slashes
- Your PAT is correct and hasn't expired
- Your cluster is running

### "Redirected to trial" During Signup

If you keep getting redirected to the 14-day trial:

1. Try using a different email address (personal Gmail, etc.)
2. Look for "Community Edition" link at the bottom of the trial page
3. Clear your browser cookies and try again
4. Use an incognito/private window

### Cluster Takes Too Long to Start

Community Edition clusters can take 3-7 minutes to start. If it takes longer than 10 minutes:

1. Cancel the cluster creation
2. Create a new cluster
3. Try during off-peak hours (early morning or late evening UTC)

---

That's it! You're now ready to level up your Databricks skills with real cluster execution.
Remember — simulated mode works perfectly for all missions. Real mode is optional but recommended for the full experience.

**Happy forging!** ⚔️`,
  },
  {
    slug: "delta-lake-essentials",
    title: "Delta Lake Essentials: ACID Transactions for Data Lakes",
    description: "Learn the fundamentals of Delta Lake — ACID transactions, time travel, schema enforcement, and more — for building reliable data lakehouses.",
    author: "Databricks Sword",
    tags: ["delta-lake", "lakehouse", "acid", "data-engineering"],
    category: "deep-dive",
    publishedAt: new Date("2025-01-20"),
    featured: true,
    content: `# Delta Lake Essentials: ACID Transactions for Data Lakes

Delta Lake is the foundation of the modern lakehouse architecture. It brings reliability, quality, and governance to data lakes that were previously only available in traditional data warehouses.

This guide covers the core concepts you need to master Delta Lake.

---

## What is Delta Lake?

Delta Lake is an open-source storage layer that brings **ACID transactions** to Apache Spark and data lakes. It extends Parquet files with a transaction log that tracks all changes to your data.

### Key Benefits

- **ACID Transactions** — Atomicity, Consistency, Isolation, Durability
- **Schema Enforcement** — Prevent bad data from entering your tables
- **Time Travel** — Query previous versions of your data
- **Unified Batch & Streaming** — Same table for both workloads
- **Efficient Upserts** — MERGE operations for incremental updates

### Why It Matters

Traditional data lakes suffer from several problems:

| Problem | Delta Lake Solution |
|---------|---------------------|
| Failed writes leave partial data | Atomic commit – all or nothing |
| Concurrent writes cause corruption | MVCC isolation with optimistic concurrency |
| No way to fix mistakes | Time travel to recover previous versions |
| Schema drift breaks pipelines | Schema enforcement and evolution |
| Updates require full rewrites | Efficient MERGE and UPDATE operations |

---

## Delta Lake Architecture

Every Delta table consists of two parts:

1. **Data files** — Parquet files stored in your cloud storage
2. **Transaction log** — JSON files in the \`_delta_log/\` directory

\`\`\`
my_table/
├── _delta_log/
│   ├── 00000000000000000000.json  # Version 0
│   ├── 00000000000000000001.json  # Version 1
│   ├── 00000000000000000002.json  # Version 2
│   └── ...
├── part-00000-...snappy.parquet
├── part-00001-...snappy.parquet
└── ...
\`\`\`

The transaction log records every operation:
- **add** — New files added
- **remove** — Files logically deleted
- **metaData** — Schema and configuration changes
- **commitInfo** — Who made the change and when

---

## Creating Delta Tables

### From Scratch

\`\`\`python
# Create empty table with schema
spark.sql("""
CREATE TABLE sales (
    sale_id BIGINT,
    product_id STRING,
    quantity INT,
    sale_date DATE,
    amount DECIMAL(10, 2)
)
USING DELTA
""")
\`\`\`

### From a DataFrame

\`\`\`python
df = spark.createDataFrame([
    (1, "PROD-001", 5, "2024-01-15", 125.50),
    (2, "PROD-002", 3, "2024-01-15", 89.99),
], ["sale_id", "product_id", "quantity", "sale_date", "amount"])

# Write as Delta table
df.write.format("delta").mode("overwrite").saveAsTable("sales")

# Or to a path
df.write.format("delta").mode("overwrite").save("/data/sales")
\`\`\`

### Converting Existing Data

\`\`\`python
# Convert Parquet to Delta
spark.sql("CONVERT TO DELTA parquet.\\\`/path/to/parquet/\\\`")

# Or from a DataFrame
parquet_df = spark.read.parquet("/path/to/parquet/")
parquet_df.write.format("delta").mode("overwrite").save("/path/to/delta/")
\`\`\`

---

## Schema Enforcement

Delta Lake validates every write against the table schema. Writes that don't match are rejected.

### Schema Evolution

When your schema needs to change, use \`mergeSchema\`:

\`\`\`python
# Add new column automatically
df_with_discount = spark.createDataFrame([
    (3, "PROD-003", 2, "2024-01-16", 45.00, 5.00),
], ["sale_id", "product_id", "quantity", "sale_date", "amount", "discount"])

df_with_discount.write \\
    .format("delta") \\
    .mode("append") \\
    .option("mergeSchema", "true") \\
    .saveAsTable("sales")
\`\`\`

---

## Time Travel

Every write creates a new version. Query any previous version:

### By Version Number

\`\`\`python
# Read version 5
df = spark.read.format("delta") \\
    .option("versionAsOf", 5) \\
    .load("/data/sales")

# SQL syntax
spark.sql("SELECT * FROM sales VERSION AS OF 5")
\`\`\`

### By Timestamp

\`\`\`python
# Read data as of yesterday
df = spark.read.format("delta") \\
    .option("timestampAsOf", "2024-01-14") \\
    .load("/data/sales")
\`\`\`

### Viewing History

\`\`\`python
from delta.tables import DeltaTable

deltaTable = DeltaTable.forPath(spark, "/data/sales")
deltaTable.history().show()
\`\`\`

### Restoring Previous Versions

\`\`\`python
# Restore to version 2
deltaTable.restoreToVersion(2)

# Or restore to timestamp
deltaTable.restoreToTimestamp("2024-01-15")
\`\`\`

---

## MERGE (Upsert) Operations

MERGE allows you to update, insert, and delete in a single atomic operation:

\`\`\`python
from delta.tables import DeltaTable

deltaTable = DeltaTable.forPath(spark, "/data/sales")

# Source data with updates and new records
updates_df = spark.createDataFrame([
    (1, "PROD-001", 10, "2024-01-15", 250.00),  # Update
    (4, "PROD-004", 1, "2024-01-17", 199.99),   # New
], ["sale_id", "product_id", "quantity", "sale_date", "amount"])

# Perform MERGE
deltaTable.alias("target").merge(
    updates_df.alias("source"),
    "target.sale_id = source.sale_id"
).whenMatchedUpdate(set={
    "quantity": "source.quantity",
    "amount": "source.amount"
}).whenNotMatchedInsert(values={
    "sale_id": "source.sale_id",
    "product_id": "source.product_id",
    "quantity": "source.quantity",
    "sale_date": "source.sale_date",
    "amount": "source.amount"
}).execute()
\`\`\`

---

## Optimizing Delta Tables

### OPTIMIZE

Compacts small files into larger ones:

\`\`\`sql
OPTIMIZE sales
OPTIMIZE sales WHERE sale_date >= '2024-01-01'
\`\`\`

### Z-ORDER

Colocates related data for faster queries:

\`\`\`sql
OPTIMIZE sales ZORDER BY (product_id, sale_date)
\`\`\`

### VACUUM

Removes old files:

\`\`\`sql
VACUUM sales
VACUUM sales RETAIN 24 HOURS
\`\`\`

---

## Best Practices

1. **Choose the Right Partitioning** — Partition by columns used in queries
2. **Use Liquid Clustering** — Replace partitioning + Z-ordering
3. **Enable Change Data Feed** — Track row-level changes for CDC
4. **Set Appropriate Retention** — Balance time travel with storage costs

---

## Practice with Databricks Sword

Try these missions:
- **Delta Lake Basics** — Create tables, write data
- **Time Travel & Recovery** — Query history and restore
- **MERGE Patterns** — Implement upserts and SCD Type 2

**Start your Delta Lake journey!** ⚔️`,
  },
  {
    slug: "pyspark-optimization-tips",
    title: "PySpark Performance: 10 Optimization Tips for Data Engineers",
    description: "Master PySpark performance optimization with these essential tips covering partitioning, caching, joins, and avoiding common pitfalls.",
    author: "Databricks Sword",
    tags: ["pyspark", "performance", "optimization", "data-engineering"],
    category: "tutorials",
    publishedAt: new Date("2025-01-25"),
    featured: false,
    content: `# PySpark Performance: 10 Optimization Tips for Data Engineers

Writing PySpark code that works is one thing. Writing PySpark code that runs *fast* at scale is another. This guide covers the optimization techniques that separate junior data engineers from senior ones.

---

## 1. Understand Lazy Evaluation

Spark transformations are **lazy** — they don't execute until an action is called.

\`\`\`python
# All these transformations are lazy
df = spark.read.parquet("/data/events")
df_filtered = df.filter(col("event_type") == "purchase")
df_selected = df_filtered.select("user_id", "amount")

# NOW everything executes
df_selected.show()
\`\`\`

### Common Actions That Trigger Execution

| Action | Description |
|--------|-------------|
| \`show()\` | Display rows |
| \`collect()\` | Return all data to driver |
| \`count()\` | Count rows |
| \`write()\` | Write to storage |

---

## 2. Avoid \`collect()\` on Large DataFrames

\`collect()\` brings **all data** to the driver node. This causes OOM errors.

\`\`\`python
# BAD
all_data = df.collect()

# GOOD - use limit
sample = df.limit(100).collect()
\`\`\`

---

## 3. Use the Right Join Strategy

### Broadcast Join (Small + Large)

\`\`\`python
from pyspark.sql.functions import broadcast

result = large_df.join(broadcast(small_df), "customer_id")
\`\`\`

### Verify Join Strategy

\`\`\`python
result.explain()
# Look for BroadcastHashJoin
\`\`\`

---

## 4. Prefer Built-in Functions Over UDFs

\`\`\`python
# SLOW: Python UDF
@udf(StringType())
def upper_udf(s):
    return s.upper()

# FAST: Built-in function
from pyspark.sql.functions import upper
df.select(upper(col("name")))
\`\`\`

---

## 5. Optimize DataFrame Caching

Cache only when:
- DataFrame used **multiple times**
- Recomputing is expensive

\`\`\`python
df_processed.cache()
df_processed.count()  # Force materialization
\`\`\`

---

## 6. Control Partition Count

Rules of thumb:
- **2-4 partitions per CPU core**
- **128MB - 1GB per partition**

\`\`\`python
# Repartition (full shuffle)
df = df.repartition(100)

# Coalesce (minimize shuffle)
df = df.coalesce(10)
\`\`\`

---

## 7. Filter Early, Project Early

\`\`\`python
# GOOD: Filter first
df_filtered = df.filter(col("date") >= "2024-01-01")
df_joined = df_filtered.join(other_df, "id")

# BAD: Join then filter
df_joined = df.join(other_df, "id")
df_filtered = df_joined.filter(col("date") >= "2024-01-01")
\`\`\`

---

## 8. Handle Data Skew

Enable Adaptive Query Execution:

\`\`\`python
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
\`\`\`

---

## 9. Use Column and Partition Pruning

\`\`\`python
# Only reads needed columns and partitions
df = spark.read.parquet("/data/events") \\
    .select("user_id", "event_type") \\
    .filter(col("date") == "2024-01-15")
\`\`\`

---

## 10. Monitor with Spark UI

Key things to check:
- **Jobs Tab** — Duration
- **Stages Tab** — Task distribution (skew)
- **SQL Tab** — Query plans

---

## Quick Reference Checklist

- [ ] Filtered early
- [ ] Selected only needed columns
- [ ] Used broadcast joins for small tables
- [ ] Avoided Python UDFs
- [ ] Checked partition count
- [ ] Enabled AQE

**Level up your PySpark skills!** ⚔️`,
  },
];

// ============================================
// FAQ DATA
// ============================================
const faqData = [
  // General Databricks
  { category: "general", question: "What is Databricks and how does it differ from Apache Spark?", answer: "Databricks is a unified data analytics platform built on Apache Spark. While Spark is an open-source distributed computing engine, Databricks provides a managed cloud service that includes optimized Spark runtime (Databricks Runtime), collaborative notebooks, job scheduling, cluster management, Delta Lake integration, and enterprise security features. Databricks simplifies infrastructure management and adds significant performance optimizations.", codeExample: null, keyPoints: ["Managed cloud platform vs open-source engine", "Includes Databricks Runtime with performance optimizations", "Provides collaborative notebooks and workflows", "Built-in Delta Lake support for ACID transactions"], displayOrder: 1 },
  { category: "general", question: "What is the Databricks Lakehouse architecture?", answer: "A Data Lakehouse is a modern data architecture that combines the flexibility and cost-efficiency of data lakes with the data management and ACID transaction capabilities of data warehouses. It enables business intelligence and machine learning on a single platform, storing data in open formats like Delta Lake while providing schema enforcement, governance, and direct BI tool access.", codeExample: null, keyPoints: ["Combines data lake flexibility with warehouse reliability", "Single platform for BI and ML workloads", "Uses open formats (Delta Lake, Parquet)", "Supports ACID transactions on data lakes"], displayOrder: 2 },
  { category: "general", question: "Explain the Databricks Runtime and its components.", answer: "Databricks Runtime is the set of software artifacts that run on cluster machines. It includes Apache Spark plus additional components that improve usability, performance, and security. Key components include optimized I/O layers, enhanced query execution (Photon engine), integrated libraries for ML (MLlib, scikit-learn, TensorFlow), and native Delta Lake support. Different runtime versions exist for ML, GPU, and genomics workloads.", codeExample: `# Check runtime version in a notebook\nspark.conf.get("spark.databricks.clusterUsageTags.sparkVersion")\n\n# Example: "13.3.x-scala2.12" indicates DBR 13.3`, keyPoints: ["Optimized Spark distribution", "Photon engine for faster SQL queries", "Pre-installed ML libraries", "Multiple flavors: Standard, ML, GPU, Genomics"], displayOrder: 3 },
  { category: "general", question: "What is Unity Catalog and why is it important?", answer: "Unity Catalog is Databricks' unified governance solution for all data and AI assets in the lakehouse. It provides centralized access control, auditing, lineage tracking, and data discovery across workspaces and clouds. Unity Catalog enables fine-grained permissions at the table, column, and row level, making it essential for enterprise data governance and compliance.", codeExample: null, keyPoints: ["Centralized metadata and access control", "Cross-workspace and cross-cloud governance", "Data lineage and auditing", "Fine-grained permissions (row/column level security)"], displayOrder: 4 },
  { category: "general", question: "How do Databricks clusters work?", answer: "Databricks clusters are sets of computation resources where you run data engineering and data science workloads. A cluster consists of a driver node and worker nodes. You can create all-purpose clusters for interactive analysis or job clusters for automated workloads. Clusters support autoscaling, spot instances for cost savings, and can be configured with specific Databricks Runtime versions.", codeExample: `# Cluster configuration example (JSON)\n{\n  "num_workers": 4,\n  "cluster_name": "my-cluster",\n  "spark_version": "13.3.x-scala2.12",\n  "node_type_id": "i3.xlarge",\n  "autoscale": {\n    "min_workers": 2,\n    "max_workers": 8\n  }\n}`, keyPoints: ["Driver node coordinates, workers execute tasks", "All-purpose clusters for interactive work", "Job clusters for automated pipelines", "Autoscaling and spot instances for cost optimization"], displayOrder: 5 },
  
  // Delta Lake
  { category: "delta-lake", question: "What is Delta Lake and what problems does it solve?", answer: "Delta Lake is an open-source storage layer that brings ACID transactions to Apache Spark and data lakes. It solves common data lake problems including: lack of transactions (dirty reads, failed writes), schema enforcement issues, difficulty handling updates/deletes, and no data versioning. Delta Lake stores data in Parquet format with a transaction log that tracks all changes.", codeExample: null, keyPoints: ["ACID transactions on data lakes", "Schema enforcement and evolution", "Time travel for data versioning", "Efficient upserts, updates, and deletes"], displayOrder: 6 },
  { category: "delta-lake", question: "Explain Delta Lake time travel and its use cases.", answer: "Time travel allows you to query previous versions of a Delta table using version numbers or timestamps. Each write creates a new version stored in the transaction log. Use cases include: auditing data changes, reproducing ML experiments, recovering from accidental deletes, and debugging data pipelines by comparing before/after states.", codeExample: `# Query by version number\ndf = spark.read.format("delta").option("versionAsOf", 5).load("/path/to/table")\n\n# Query by timestamp\ndf = spark.read.format("delta").option("timestampAsOf", "2024-01-15").load("/path/to/table")\n\n# SQL syntax\nSELECT * FROM my_table VERSION AS OF 5\nSELECT * FROM my_table TIMESTAMP AS OF '2024-01-15'`, keyPoints: ["Query any historical version of data", "Use version numbers or timestamps", "Retention controlled by table properties", "Essential for auditing and reproducibility"], displayOrder: 7 },
  { category: "delta-lake", question: "What is the MERGE operation in Delta Lake?", answer: "MERGE (upsert) allows you to update, insert, and delete records in a Delta table based on a matching condition with source data. It's an atomic operation that handles complex scenarios like slowly changing dimensions (SCD Type 2). MERGE is more efficient than separate UPDATE/INSERT operations and is the recommended approach for incremental data loading.", codeExample: `# PySpark MERGE example\nfrom delta.tables import DeltaTable\n\ndeltaTable = DeltaTable.forPath(spark, "/path/to/target")\n\ndeltaTable.alias("target").merge(\n    source_df.alias("source"),\n    "target.id = source.id"\n).whenMatchedUpdate(set={\n    "name": "source.name",\n    "updated_at": "current_timestamp()"\n}).whenNotMatchedInsert(values={\n    "id": "source.id",\n    "name": "source.name",\n    "created_at": "current_timestamp()"\n}).execute()`, keyPoints: ["Atomic upsert operation", "Supports UPDATE, INSERT, DELETE in one operation", "Match conditions determine action", "Ideal for CDC and SCD patterns"], displayOrder: 8 },
  { category: "delta-lake", question: "How does Delta Lake handle schema evolution?", answer: "Delta Lake supports automatic schema evolution when writing data. You can add new columns, and Delta will merge the schemas. Schema enforcement prevents writing data that doesn't match the table schema. Use mergeSchema option to add columns automatically or overwriteSchema to replace the schema entirely (use with caution).", codeExample: `# Enable automatic schema merge\ndf.write.format("delta") \\\n  .mode("append") \\\n  .option("mergeSchema", "true") \\\n  .save("/path/to/table")\n\n# Or overwrite entire schema\ndf.write.format("delta") \\\n  .mode("overwrite") \\\n  .option("overwriteSchema", "true") \\\n  .save("/path/to/table")`, keyPoints: ["Schema enforcement prevents bad data", "mergeSchema adds new columns automatically", "overwriteSchema replaces entire schema", "Column mapping enables rename/drop without rewrite"], displayOrder: 9 },
  { category: "delta-lake", question: "What is liquid clustering and how does it improve performance?", answer: "Liquid clustering is a modern data layout optimization that replaces traditional partitioning and Z-ordering. It automatically clusters data based on specified columns, adapting the layout as data and query patterns change. Unlike partitioning, you can change clustering columns without rewriting data, and it handles high-cardinality columns efficiently.", codeExample: `-- Create table with liquid clustering\nCREATE TABLE events (\n  event_id BIGINT,\n  event_date DATE,\n  user_id STRING,\n  event_type STRING\n) CLUSTER BY (event_date, user_id);\n\n-- Change clustering columns (no data rewrite)\nALTER TABLE events CLUSTER BY (event_type, event_date);\n\n-- Trigger optimization\nOPTIMIZE events;`, keyPoints: ["Replaces partitioning and Z-ordering", "Adaptive layout without rewrites", "Handles high-cardinality columns", "Automatically maintained during optimization"], displayOrder: 10 },
  
  // PySpark
  { category: "pyspark", question: "What is the difference between transformations and actions in Spark?", answer: "Transformations are lazy operations that define a new DataFrame/RDD without immediately computing results (e.g., select, filter, groupBy, join). Actions trigger actual computation and return results to the driver or write to storage (e.g., collect, count, show, write). Spark builds a DAG of transformations and only executes when an action is called.", codeExample: `# Transformations (lazy - no computation yet)\ndf_filtered = df.filter(df.age > 25)  # Nothing happens\ndf_selected = df_filtered.select("name", "age")  # Still nothing\n\n# Action (triggers computation)\ndf_selected.show()  # NOW the entire chain executes\nresult = df_selected.collect()  # Returns data to driver`, keyPoints: ["Transformations are lazy (build execution plan)", "Actions trigger actual computation", "DAG optimization happens before execution", "Understanding this is key for performance tuning"], displayOrder: 11 },
  { category: "pyspark", question: "Explain the difference between narrow and wide transformations.", answer: "Narrow transformations (map, filter, select) process data within the same partition without shuffling data across nodes. Wide transformations (groupBy, join, repartition) require shuffling data across partitions and nodes, which is expensive. Minimizing wide transformations and shuffles is crucial for Spark performance optimization.", codeExample: `# Narrow transformations (no shuffle)\ndf.filter(col("status") == "active")  # Each partition processed independently\ndf.select("id", "name")  # No data movement\n\n# Wide transformations (require shuffle)\ndf.groupBy("department").count()  # Data shuffled to group\ndf1.join(df2, "id")  # Both DataFrames shuffled for join`, keyPoints: ["Narrow: single partition, no shuffle", "Wide: multiple partitions, requires shuffle", "Shuffles are expensive network operations", "Stage boundaries occur at wide transformations"], displayOrder: 12 },
  { category: "pyspark", question: "How do you optimize joins in PySpark?", answer: "Join optimization strategies include: broadcast joins for small tables (< 10MB by default), using partitioning on join keys, filtering data before joining, and choosing appropriate join types. Broadcast joins avoid shuffles by sending the small table to all workers. For large-large joins, ensure data is pre-partitioned on join keys.", codeExample: `from pyspark.sql.functions import broadcast\n\n# Broadcast join (small table)\nresult = large_df.join(broadcast(small_df), "customer_id")\n\n# Optimize join with pre-filtering\ndf1_filtered = df1.filter(col("date") >= "2024-01-01")\nresult = df1_filtered.join(df2, "id")\n\n# Check join strategy in explain plan\nresult.explain(mode="extended")\n\n# Adjust broadcast threshold\nspark.conf.set("spark.sql.autoBroadcastJoinThreshold", 50 * 1024 * 1024)  # 50MB`, keyPoints: ["Use broadcast() for small dimension tables", "Filter before joining to reduce data", "Pre-partition large tables on join keys", "Use explain() to verify join strategy"], displayOrder: 13 },
  { category: "pyspark", question: "What are User Defined Functions (UDFs) and when should you use them?", answer: "UDFs allow you to extend Spark with custom Python functions. However, Python UDFs serialize data between JVM and Python, causing significant overhead. Prefer built-in Spark functions when possible. Use Pandas UDFs (vectorized) for better performance with Python code, as they use Apache Arrow for efficient data transfer.", codeExample: `from pyspark.sql.functions import udf, pandas_udf\nfrom pyspark.sql.types import StringType\nimport pandas as pd\n\n# Regular UDF (slower - avoid if possible)\n@udf(StringType())\ndef upper_case(s):\n    return s.upper() if s else None\n\n# Pandas UDF (vectorized - much faster)\n@pandas_udf(StringType())\ndef upper_case_vectorized(s: pd.Series) -> pd.Series:\n    return s.str.upper()\n\n# Usage\ndf.select(upper_case_vectorized(col("name")))\n\n# Best: Use built-in functions\nfrom pyspark.sql.functions import upper\ndf.select(upper(col("name")))  # Fastest`, keyPoints: ["Built-in functions are fastest (pure JVM)", "Python UDFs have serialization overhead", "Pandas UDFs use Arrow for vectorized processing", "Always prefer built-in functions when available"], displayOrder: 14 },
  { category: "pyspark", question: "How do you handle skewed data in PySpark?", answer: "Data skew occurs when some partitions have significantly more data than others, causing slow tasks (stragglers). Solutions include: salting keys by adding random prefixes, using adaptive query execution (AQE), repartitioning with more partitions, and isolating skewed keys for separate processing. Databricks AQE automatically handles many skew scenarios.", codeExample: `from pyspark.sql.functions import col, concat, lit, rand\n\n# Enable AQE (handles skew automatically in most cases)\nspark.conf.set("spark.sql.adaptive.enabled", "true")\nspark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")\n\n# Manual salting for extreme skew\nsalted_df = skewed_df.withColumn(\n    "salted_key",\n    concat(col("join_key"), lit("_"), (rand() * 10).cast("int"))\n)\n\n# Expand the other table to match salt values\nexpanded_df = other_df.crossJoin(\n    spark.range(10).withColumnRenamed("id", "salt")\n).withColumn(\n    "salted_key",\n    concat(col("join_key"), lit("_"), col("salt"))\n)\n\n# Join on salted keys\nresult = salted_df.join(expanded_df, "salted_key")`, keyPoints: ["AQE handles most skew automatically", "Salting adds random prefix to distribute keys", "Monitor Spark UI for uneven task durations", "Consider isolating extreme outlier keys"], displayOrder: 15 },
  
  // SQL & Analytics
  { category: "sql", question: "What are window functions and when would you use them?", answer: "Window functions perform calculations across a set of rows related to the current row, without collapsing the result into a single row like GROUP BY. Common uses include running totals, rankings, moving averages, and comparing values to previous/next rows. The OVER clause defines the window partition and ordering.", codeExample: `-- Running total partitioned by customer\nSELECT \n  order_id,\n  customer_id,\n  amount,\n  SUM(amount) OVER (\n    PARTITION BY customer_id \n    ORDER BY order_date\n    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\n  ) as running_total\nFROM orders;\n\n-- Rank within department\nSELECT \n  employee_id,\n  department,\n  salary,\n  RANK() OVER (PARTITION BY department ORDER BY salary DESC) as salary_rank,\n  LAG(salary) OVER (PARTITION BY department ORDER BY salary DESC) as prev_salary\nFROM employees;`, keyPoints: ["PARTITION BY groups rows for the calculation", "ORDER BY defines the sequence within partitions", "Supports ROWS/RANGE for frame specification", "Common functions: ROW_NUMBER, RANK, LAG, LEAD, SUM, AVG"], displayOrder: 16 },
  { category: "sql", question: "Explain the Medallion Architecture (Bronze, Silver, Gold).", answer: "The Medallion Architecture is a data design pattern for organizing data in a lakehouse. Bronze layer stores raw ingested data with minimal transformation. Silver layer contains cleaned, conformed, and validated data. Gold layer has business-level aggregates and metrics ready for reporting. This progressive refinement ensures data quality while maintaining lineage.", codeExample: null, keyPoints: ["Bronze: Raw data, append-only, preserve source format", "Silver: Cleaned, deduplicated, schema-enforced data", "Gold: Business aggregates, dimensional models, KPIs", "Each layer adds quality and business value"], displayOrder: 17 },
  { category: "sql", question: "What is the difference between managed and external tables?", answer: "Managed tables have both metadata and data managed by the metastore. When dropped, both metadata and data files are deleted. External tables only have metadata in the metastore; data files exist in a specified location. Dropping an external table removes only metadata, preserving data files. Use external tables when data is shared across systems or requires specific storage locations.", codeExample: `-- Managed table (data stored in metastore location)\nCREATE TABLE managed_sales (\n  id INT,\n  amount DECIMAL(10,2)\n);\n\n-- External table (data at specified location)\nCREATE TABLE external_sales (\n  id INT,\n  amount DECIMAL(10,2)\n)\nLOCATION 's3://my-bucket/sales/';\n\n-- Check table type\nDESCRIBE EXTENDED managed_sales;`, keyPoints: ["Managed: metastore controls data lifecycle", "External: data persists after DROP TABLE", "Use external for shared or pre-existing data", "Unity Catalog prefers managed tables for governance"], displayOrder: 18 },
  { category: "sql", question: "How do you implement slowly changing dimensions (SCD) in Databricks?", answer: "SCD Type 1 overwrites old values (use MERGE with UPDATE). SCD Type 2 maintains history with effective dates and current flags. In Delta Lake, implement SCD Type 2 using MERGE with multiple WHEN MATCHED clauses to expire old records and insert new versions. Delta's time travel also provides implicit Type 2 capability.", codeExample: `-- SCD Type 2 implementation with MERGE\nMERGE INTO dim_customer AS target\nUSING staged_updates AS source\nON target.customer_id = source.customer_id AND target.is_current = true\n\n-- Expire existing record\nWHEN MATCHED AND target.name != source.name THEN UPDATE SET\n  is_current = false,\n  end_date = current_date()\n\n-- Insert new version (handled separately or with INSERT)\nWHEN NOT MATCHED THEN INSERT (\n  customer_id, name, is_current, start_date, end_date\n) VALUES (\n  source.customer_id, source.name, true, current_date(), null\n);`, keyPoints: ["Type 1: Overwrite (no history)", "Type 2: Track history with effective dates", "Use is_current flag for easy current-version queries", "Delta time travel provides natural history"], displayOrder: 19 },
  
  // MLflow & MLOps
  { category: "mlflow", question: "What is MLflow and what are its components?", answer: "MLflow is an open-source platform for managing the ML lifecycle. It has four components: Tracking (logging parameters, metrics, artifacts), Projects (packaging code for reproducibility), Models (model packaging and deployment), and Model Registry (versioning and staging models). MLflow integrates natively with Databricks for seamless experiment tracking and deployment.", codeExample: `import mlflow\nfrom mlflow.tracking import MlflowClient\n\n# Start an experiment run\nwith mlflow.start_run(run_name="my_experiment"):\n    # Log parameters\n    mlflow.log_param("learning_rate", 0.01)\n    mlflow.log_param("epochs", 100)\n    \n    # Train model...\n    \n    # Log metrics\n    mlflow.log_metric("accuracy", 0.95)\n    mlflow.log_metric("f1_score", 0.92)\n    \n    # Log model\n    mlflow.sklearn.log_model(model, "model")\n    \n    # Log artifacts (plots, data samples)\n    mlflow.log_artifact("confusion_matrix.png")`, keyPoints: ["Tracking: Log experiments, parameters, metrics", "Projects: Reproducible ML code packaging", "Models: Standard format for deployment", "Registry: Version control and model staging"], displayOrder: 20 },
  { category: "mlflow", question: "How do you deploy a model to production in Databricks?", answer: "Model deployment in Databricks follows a lifecycle: train and log to MLflow, register in Model Registry, transition through stages (None → Staging → Production), then deploy for inference. Options include real-time REST endpoints (Model Serving), batch scoring with Spark UDFs, and streaming inference. Feature Store integration ensures consistent features.", codeExample: `from mlflow.tracking import MlflowClient\n\nclient = MlflowClient()\n\n# Register model from run\nmodel_uri = f"runs:/{run_id}/model"\nmlflow.register_model(model_uri, "my_model")\n\n# Transition to production\nclient.transition_model_version_stage(\n    name="my_model",\n    version=1,\n    stage="Production"\n)\n\n# Load production model for batch scoring\nmodel = mlflow.pyfunc.load_model("models:/my_model/Production")\npredictions = model.predict(df.toPandas())\n\n# Or use Spark UDF for distributed scoring\npredict_udf = mlflow.pyfunc.spark_udf(spark, "models:/my_model/Production")\nscored_df = df.withColumn("prediction", predict_udf(*feature_columns))`, keyPoints: ["Model Registry manages model versions", "Staging workflow: Development → Staging → Production", "Model Serving for real-time REST endpoints", "Spark UDFs for distributed batch scoring"], displayOrder: 21 },
  { category: "mlflow", question: "What is the Feature Store and why use it?", answer: "Databricks Feature Store is a centralized repository for feature engineering that enables feature reuse across teams and consistent feature computation between training and inference. It solves feature consistency problems, reduces duplicate feature engineering work, and provides feature lineage and discovery. Features are stored as Delta tables with point-in-time lookup support.", codeExample: null, keyPoints: ["Centralized feature repository", "Ensures training/serving consistency", "Point-in-time feature lookup prevents leakage", "Feature lineage and discovery across teams"], displayOrder: 22 },
  
  // Architecture
  { category: "architecture", question: "How would you design a real-time streaming pipeline in Databricks?", answer: "Use Structured Streaming with Delta Lake as source/sink. Ingest from Kafka/Event Hubs/Kinesis, process with DataFrame transformations, and write to Delta tables with exactly-once guarantees. For complex pipelines, use Lakeflow (DLT) which handles checkpointing, retries, and automatic schema evolution. Monitor with Spark UI and Databricks observability tools.", codeExample: `# Structured Streaming with Delta\nstream_df = spark.readStream \\\n    .format("kafka") \\\n    .option("kafka.bootstrap.servers", "broker:9092") \\\n    .option("subscribe", "events") \\\n    .load()\n\n# Process stream\nprocessed = stream_df \\\n    .select(from_json(col("value").cast("string"), schema).alias("data")) \\\n    .select("data.*") \\\n    .withWatermark("event_time", "10 minutes") \\\n    .groupBy(window("event_time", "5 minutes"), "category") \\\n    .agg(count("*").alias("event_count"))\n\n# Write to Delta with checkpointing\nprocessed.writeStream \\\n    .format("delta") \\\n    .outputMode("append") \\\n    .option("checkpointLocation", "/checkpoints/events") \\\n    .trigger(processingTime="1 minute") \\\n    .start("/delta/event_aggregates")`, keyPoints: ["Structured Streaming for exactly-once processing", "Watermarks handle late-arriving data", "Checkpoints enable fault-tolerant recovery", "Delta Lake as unified batch/streaming sink"], displayOrder: 23 },
  { category: "architecture", question: "What is Auto Loader and when should you use it?", answer: "Auto Loader is a Databricks feature for incrementally ingesting new files from cloud storage (S3, ADLS, GCS). It automatically discovers and processes new files without listing the entire directory, using file notification services for efficiency. Use Auto Loader for landing zone ingestion, especially with high file volumes. It supports schema inference and evolution.", codeExample: `# Auto Loader with cloudFiles format\ndf = spark.readStream \\\n    .format("cloudFiles") \\\n    .option("cloudFiles.format", "json") \\\n    .option("cloudFiles.schemaLocation", "/schema/events") \\\n    .option("cloudFiles.inferColumnTypes", "true") \\\n    .load("s3://bucket/landing/events/")\n\n# Write to Delta Bronze table\ndf.writeStream \\\n    .format("delta") \\\n    .option("checkpointLocation", "/checkpoints/events_bronze") \\\n    .option("mergeSchema", "true") \\\n    .trigger(availableNow=True)\n    .start("/delta/bronze/events")`, keyPoints: ["Efficient file discovery with notifications", "Automatic schema inference and evolution", "Exactly-once ingestion guarantees", "Scales to millions of files efficiently"], displayOrder: 24 },
  { category: "architecture", question: "How do you optimize costs in Databricks?", answer: "Cost optimization strategies include: using spot/preemptible instances, right-sizing clusters based on workload, enabling autoscaling with appropriate min/max, using SQL warehouses for BI queries, implementing cluster policies, scheduling jobs during off-peak hours, and optimizing data storage with Delta Lake compaction and Z-ordering. Monitor costs with Databricks account console.", codeExample: null, keyPoints: ["Spot instances save 60-90% on compute", "Autoscaling matches resources to demand", "SQL Warehouses for concurrent BI queries", "Delta Lake optimization reduces I/O costs", "Cluster policies enforce cost guardrails"], displayOrder: 25 },
];

// ============================================
// MIGRATION LOGIC
// ============================================
async function migrate() {
  console.log("Starting content migration...\n");

  // Migrate blog posts
  console.log("Migrating blog posts...");
  for (const post of blogPosts) {
    const now = Date.now();
    const id = randomUUID();
    try {
      await client.execute({
        sql: `INSERT INTO blog_posts (id, slug, title, description, content, author, category, tags, status, featured, published_at, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?)`,
        args: [
          id,
          post.slug,
          post.title,
          post.description,
          post.content,
          post.author,
          post.category,
          JSON.stringify(post.tags),
          post.featured ? 1 : 0,
          post.publishedAt.getTime(),
          now,
          now,
        ],
      });
      console.log(`  ✓ ${post.slug}`);
    } catch (err) {
      if (err.message?.includes("UNIQUE constraint failed")) {
        console.log(`  - ${post.slug} (already exists)`);
      } else {
        console.error(`  ✗ ${post.slug}: ${err.message}`);
      }
    }
  }

  // Migrate FAQ items
  console.log("\nMigrating FAQ items...");
  for (const faq of faqData) {
    const now = Date.now();
    const id = randomUUID();
    try {
      await client.execute({
        sql: `INSERT INTO faq_items (id, category, question, answer, code_example, key_points, display_order, status, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`,
        args: [
          id,
          faq.category,
          faq.question,
          faq.answer,
          faq.codeExample,
          JSON.stringify(faq.keyPoints),
          faq.displayOrder,
          now,
          now,
        ],
      });
      console.log(`  ✓ Q${faq.displayOrder}: ${faq.question.substring(0, 50)}...`);
    } catch (err) {
      console.error(`  ✗ Q${faq.displayOrder}: ${err.message}`);
    }
  }

  // Verify counts
  const blogCount = await client.execute("SELECT COUNT(*) as count FROM blog_posts");
  const faqCount = await client.execute("SELECT COUNT(*) as count FROM faq_items");

  console.log("\n✓ Migration complete!");
  console.log(`  Blog posts: ${blogCount.rows[0].count}`);
  console.log(`  FAQ items: ${faqCount.rows[0].count}`);
}

migrate().catch(console.error);
