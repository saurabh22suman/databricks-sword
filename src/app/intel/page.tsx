import { faqItems, getDb } from "@/lib/db"
import { StructuredData, getFAQStructuredData } from "@/lib/seo/structured-data"
import { eq } from "drizzle-orm"
import type { Metadata } from "next"
import Link from "next/link"
import { Database } from "lucide-react"

export const metadata: Metadata = {
  title: "Intel — Databricks Interview Questions & Knowledge Base",
  description:
    "Databricks interview questions with detailed answers, code examples, and explanations. Your decrypted knowledge base for lakehouse mastery.",
}

// Force dynamic rendering for DB queries
export const dynamic = "force-dynamic"

type FAQQuestion = {
  id: number | string
  question: string
  answer: string
  codeExample?: string | null
  keyPoints: string[]
}

type FAQCategory = {
  name: string
  icon: string
  questions: FAQQuestion[]
}

/**
 * Get FAQ items from database.
 */
async function getDbFaqs(): Promise<FAQCategory[]> {
  try {
    const db = getDb()
    const items = await db
      .select()
      .from(faqItems)
      .where(eq(faqItems.status, "published"))
      .orderBy(faqItems.displayOrder)

    if (items.length === 0) return []

    // Group by category
    const categoryMap = new Map<string, FAQQuestion[]>()
    for (const item of items) {
      const questions = categoryMap.get(item.category) || []
      questions.push({
        id: item.id,
        question: item.question,
        answer: item.answer,
        codeExample: item.codeExample,
        keyPoints: JSON.parse(item.keyPoints ?? "[]"),
      })
      categoryMap.set(item.category, questions)
    }

    // Convert to category array with icons
    const categoryIcons: Record<string, string> = {
      "general": "🏢",
      "delta-lake": "🔷",
      "pyspark": "⚡",
      "sql": "📊",
      "mlflow": "🤖",
      "architecture": "🏗️",
    }

    return Array.from(categoryMap.entries()).map(([name, questions]) => ({
      name: name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      icon: categoryIcons[name] || "📚",
      questions,
    }))
  } catch (error) {
    console.error("Failed to fetch DB FAQs:", error)
    return []
  }
}

const faqData: FAQCategory[] = [
  {
    name: "General Databricks",
    icon: "🏢",
    questions: [
      {
        id: 1,
        question: "What is Databricks and how does it differ from Apache Spark?",
        answer:
          "Databricks is a unified data analytics platform built on Apache Spark. While Spark is an open-source distributed computing engine, Databricks provides a managed cloud service that includes optimized Spark runtime (Databricks Runtime), collaborative notebooks, job scheduling, cluster management, Delta Lake integration, and enterprise security features. Databricks simplifies infrastructure management and adds significant performance optimizations.",
        keyPoints: [
          "Managed cloud platform vs open-source engine",
          "Includes Databricks Runtime with performance optimizations",
          "Provides collaborative notebooks and workflows",
          "Built-in Delta Lake support for ACID transactions",
        ],
      },
      {
        id: 2,
        question: "What is the Databricks Lakehouse architecture?",
        answer:
          "A Data Lakehouse is a modern data architecture that combines the flexibility and cost-efficiency of data lakes with the data management and ACID transaction capabilities of data warehouses. It enables business intelligence and machine learning on a single platform, storing data in open formats like Delta Lake while providing schema enforcement, governance, and direct BI tool access.",
        keyPoints: [
          "Combines data lake flexibility with warehouse reliability",
          "Single platform for BI and ML workloads",
          "Uses open formats (Delta Lake, Parquet)",
          "Supports ACID transactions on data lakes",
        ],
      },
      {
        id: 3,
        question: "Explain the Databricks Runtime and its components.",
        answer:
          "Databricks Runtime is the set of software artifacts that run on cluster machines. It includes Apache Spark plus additional components that improve usability, performance, and security. Key components include optimized I/O layers, enhanced query execution (Photon engine), integrated libraries for ML (MLlib, scikit-learn, TensorFlow), and native Delta Lake support. Different runtime versions exist for ML, GPU, and genomics workloads.",
        codeExample: `# Check runtime version in a notebook
spark.conf.get("spark.databricks.clusterUsageTags.sparkVersion")

# Example: "13.3.x-scala2.12" indicates DBR 13.3`,
        keyPoints: [
          "Optimized Spark distribution",
          "Photon engine for faster SQL queries",
          "Pre-installed ML libraries",
          "Multiple flavors: Standard, ML, GPU, Genomics",
        ],
      },
      {
        id: 4,
        question: "What is Unity Catalog and why is it important?",
        answer:
          "Unity Catalog is Databricks' unified governance solution for all data and AI assets in the lakehouse. It provides centralized access control, auditing, lineage tracking, and data discovery across workspaces and clouds. Unity Catalog enables fine-grained permissions at the table, column, and row level, making it essential for enterprise data governance and compliance.",
        keyPoints: [
          "Centralized metadata and access control",
          "Cross-workspace and cross-cloud governance",
          "Data lineage and auditing",
          "Fine-grained permissions (row/column level security)",
        ],
      },
      {
        id: 5,
        question: "How do Databricks clusters work?",
        answer:
          "Databricks clusters are sets of computation resources where you run data engineering and data science workloads. A cluster consists of a driver node and worker nodes. You can create all-purpose clusters for interactive analysis or job clusters for automated workloads. Clusters support autoscaling, spot instances for cost savings, and can be configured with specific Databricks Runtime versions.",
        codeExample: `# Cluster configuration example (JSON)
{
  "num_workers": 4,
  "cluster_name": "my-cluster",
  "spark_version": "13.3.x-scala2.12",
  "node_type_id": "i3.xlarge",
  "autoscale": {
    "min_workers": 2,
    "max_workers": 8
  }
}`,
        keyPoints: [
          "Driver node coordinates, workers execute tasks",
          "All-purpose clusters for interactive work",
          "Job clusters for automated pipelines",
          "Autoscaling and spot instances for cost optimization",
        ],
      },
    ],
  },
  {
    name: "Delta Lake",
    icon: "🔺",
    questions: [
      {
        id: 6,
        question: "What is Delta Lake and what problems does it solve?",
        answer:
          "Delta Lake is an open-source storage layer that brings ACID transactions to Apache Spark and data lakes. It solves common data lake problems including: lack of transactions (dirty reads, failed writes), schema enforcement issues, difficulty handling updates/deletes, and no data versioning. Delta Lake stores data in Parquet format with a transaction log that tracks all changes.",
        keyPoints: [
          "ACID transactions on data lakes",
          "Schema enforcement and evolution",
          "Time travel for data versioning",
          "Efficient upserts, updates, and deletes",
        ],
      },
      {
        id: 7,
        question: "Explain Delta Lake time travel and its use cases.",
        answer:
          "Time travel allows you to query previous versions of a Delta table using version numbers or timestamps. Each write creates a new version stored in the transaction log. Use cases include: auditing data changes, reproducing ML experiments, recovering from accidental deletes, and debugging data pipelines by comparing before/after states.",
        codeExample: `# Query by version number
df = spark.read.format("delta").option("versionAsOf", 5).load("/path/to/table")

# Query by timestamp
df = spark.read.format("delta").option("timestampAsOf", "2024-01-15").load("/path/to/table")

# SQL syntax
SELECT * FROM my_table VERSION AS OF 5
SELECT * FROM my_table TIMESTAMP AS OF '2024-01-15'`,
        keyPoints: [
          "Query any historical version of data",
          "Use version numbers or timestamps",
          "Retention controlled by table properties",
          "Essential for auditing and reproducibility",
        ],
      },
      {
        id: 8,
        question: "What is the MERGE operation in Delta Lake?",
        answer:
          "MERGE (upsert) allows you to update, insert, and delete records in a Delta table based on a matching condition with source data. It's an atomic operation that handles complex scenarios like slowly changing dimensions (SCD Type 2). MERGE is more efficient than separate UPDATE/INSERT operations and is the recommended approach for incremental data loading.",
        codeExample: `# PySpark MERGE example
from delta.tables import DeltaTable

deltaTable = DeltaTable.forPath(spark, "/path/to/target")

deltaTable.alias("target").merge(
    source_df.alias("source"),
    "target.id = source.id"
).whenMatchedUpdate(set={
    "name": "source.name",
    "updated_at": "current_timestamp()"
}).whenNotMatchedInsert(values={
    "id": "source.id",
    "name": "source.name",
    "created_at": "current_timestamp()"
}).execute()`,
        keyPoints: [
          "Atomic upsert operation",
          "Supports UPDATE, INSERT, DELETE in one operation",
          "Match conditions determine action",
          "Ideal for CDC and SCD patterns",
        ],
      },
      {
        id: 9,
        question: "How does Delta Lake handle schema evolution?",
        answer:
          "Delta Lake supports automatic schema evolution when writing data. You can add new columns, and Delta will merge the schemas. Schema enforcement prevents writing data that doesn't match the table schema. Use mergeSchema option to add columns automatically or overwriteSchema to replace the schema entirely (use with caution).",
        codeExample: `# Enable automatic schema merge
df.write.format("delta") \\
  .mode("append") \\
  .option("mergeSchema", "true") \\
  .save("/path/to/table")

# Or overwrite entire schema
df.write.format("delta") \\
  .mode("overwrite") \\
  .option("overwriteSchema", "true") \\
  .save("/path/to/table")`,
        keyPoints: [
          "Schema enforcement prevents bad data",
          "mergeSchema adds new columns automatically",
          "overwriteSchema replaces entire schema",
          "Column mapping enables rename/drop without rewrite",
        ],
      },
      {
        id: 10,
        question: "What is liquid clustering and how does it improve performance?",
        answer:
          "Liquid clustering is a modern data layout optimization that replaces traditional partitioning and Z-ordering. It automatically clusters data based on specified columns, adapting the layout as data and query patterns change. Unlike partitioning, you can change clustering columns without rewriting data, and it handles high-cardinality columns efficiently.",
        codeExample: `-- Create table with liquid clustering
CREATE TABLE events (
  event_id BIGINT,
  event_date DATE,
  user_id STRING,
  event_type STRING
) CLUSTER BY (event_date, user_id);

-- Change clustering columns (no data rewrite)
ALTER TABLE events CLUSTER BY (event_type, event_date);

-- Trigger optimization
OPTIMIZE events;`,
        keyPoints: [
          "Replaces partitioning and Z-ordering",
          "Adaptive layout without rewrites",
          "Handles high-cardinality columns",
          "Automatically maintained during optimization",
        ],
      },
    ],
  },
  {
    name: "PySpark",
    icon: "🐍",
    questions: [
      {
        id: 11,
        question: "What is the difference between transformations and actions in Spark?",
        answer:
          "Transformations are lazy operations that define a new DataFrame/RDD without immediately computing results (e.g., select, filter, groupBy, join). Actions trigger actual computation and return results to the driver or write to storage (e.g., collect, count, show, write). Spark builds a DAG of transformations and only executes when an action is called.",
        codeExample: `# Transformations (lazy - no computation yet)
df_filtered = df.filter(df.age > 25)  # Nothing happens
df_selected = df_filtered.select("name", "age")  # Still nothing

# Action (triggers computation)
df_selected.show()  # NOW the entire chain executes
result = df_selected.collect()  # Returns data to driver`,
        keyPoints: [
          "Transformations are lazy (build execution plan)",
          "Actions trigger actual computation",
          "DAG optimization happens before execution",
          "Understanding this is key for performance tuning",
        ],
      },
      {
        id: 12,
        question: "Explain the difference between narrow and wide transformations.",
        answer:
          "Narrow transformations (map, filter, select) process data within the same partition without shuffling data across nodes. Wide transformations (groupBy, join, repartition) require shuffling data across partitions and nodes, which is expensive. Minimizing wide transformations and shuffles is crucial for Spark performance optimization.",
        codeExample: `# Narrow transformations (no shuffle)
df.filter(col("status") == "active")  # Each partition processed independently
df.select("id", "name")  # No data movement

# Wide transformations (require shuffle)
df.groupBy("department").count()  # Data shuffled to group
df1.join(df2, "id")  # Both DataFrames shuffled for join`,
        keyPoints: [
          "Narrow: single partition, no shuffle",
          "Wide: multiple partitions, requires shuffle",
          "Shuffles are expensive network operations",
          "Stage boundaries occur at wide transformations",
        ],
      },
      {
        id: 13,
        question: "How do you optimize joins in PySpark?",
        answer:
          "Join optimization strategies include: broadcast joins for small tables (< 10MB by default), using partitioning on join keys, filtering data before joining, and choosing appropriate join types. Broadcast joins avoid shuffles by sending the small table to all workers. For large-large joins, ensure data is pre-partitioned on join keys.",
        codeExample: `from pyspark.sql.functions import broadcast

# Broadcast join (small table)
result = large_df.join(broadcast(small_df), "customer_id")

# Optimize join with pre-filtering
df1_filtered = df1.filter(col("date") >= "2024-01-01")
result = df1_filtered.join(df2, "id")

# Check join strategy in explain plan
result.explain(mode="extended")

# Adjust broadcast threshold
spark.conf.set("spark.sql.autoBroadcastJoinThreshold", 50 * 1024 * 1024)  # 50MB`,
        keyPoints: [
          "Use broadcast() for small dimension tables",
          "Filter before joining to reduce data",
          "Pre-partition large tables on join keys",
          "Use explain() to verify join strategy",
        ],
      },
      {
        id: 14,
        question: "What are User Defined Functions (UDFs) and when should you use them?",
        answer:
          "UDFs allow you to extend Spark with custom Python functions. However, Python UDFs serialize data between JVM and Python, causing significant overhead. Prefer built-in Spark functions when possible. Use Pandas UDFs (vectorized) for better performance with Python code, as they use Apache Arrow for efficient data transfer.",
        codeExample: `from pyspark.sql.functions import udf, pandas_udf
from pyspark.sql.types import StringType
import pandas as pd

# Regular UDF (slower - avoid if possible)
@udf(StringType())
def upper_case(s):
    return s.upper() if s else None

# Pandas UDF (vectorized - much faster)
@pandas_udf(StringType())
def upper_case_vectorized(s: pd.Series) -> pd.Series:
    return s.str.upper()

# Usage
df.select(upper_case_vectorized(col("name")))

# Best: Use built-in functions
from pyspark.sql.functions import upper
df.select(upper(col("name")))  # Fastest`,
        keyPoints: [
          "Built-in functions are fastest (pure JVM)",
          "Python UDFs have serialization overhead",
          "Pandas UDFs use Arrow for vectorized processing",
          "Always prefer built-in functions when available",
        ],
      },
      {
        id: 15,
        question: "How do you handle skewed data in PySpark?",
        answer:
          "Data skew occurs when some partitions have significantly more data than others, causing slow tasks (stragglers). Solutions include: salting keys by adding random prefixes, using adaptive query execution (AQE), repartitioning with more partitions, and isolating skewed keys for separate processing. Databricks AQE automatically handles many skew scenarios.",
        codeExample: `from pyspark.sql.functions import col, concat, lit, rand

# Enable AQE (handles skew automatically in most cases)
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")

# Manual salting for extreme skew
# Add salt to skewed key
salted_df = skewed_df.withColumn(
    "salted_key",
    concat(col("join_key"), lit("_"), (rand() * 10).cast("int"))
)

# Expand the other table to match salt values
expanded_df = other_df.crossJoin(
    spark.range(10).withColumnRenamed("id", "salt")
).withColumn(
    "salted_key",
    concat(col("join_key"), lit("_"), col("salt"))
)

# Join on salted keys
result = salted_df.join(expanded_df, "salted_key")`,
        keyPoints: [
          "AQE handles most skew automatically",
          "Salting adds random prefix to distribute keys",
          "Monitor Spark UI for uneven task durations",
          "Consider isolating extreme outlier keys",
        ],
      },
    ],
  },
  {
    name: "SQL & Analytics",
    icon: "📊",
    questions: [
      {
        id: 16,
        question: "What are window functions and when would you use them?",
        answer:
          "Window functions perform calculations across a set of rows related to the current row, without collapsing the result into a single row like GROUP BY. Common uses include running totals, rankings, moving averages, and comparing values to previous/next rows. The OVER clause defines the window partition and ordering.",
        codeExample: `-- Running total partitioned by customer
SELECT 
  order_id,
  customer_id,
  amount,
  SUM(amount) OVER (
    PARTITION BY customer_id 
    ORDER BY order_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) as running_total
FROM orders;

-- Rank within department
SELECT 
  employee_id,
  department,
  salary,
  RANK() OVER (PARTITION BY department ORDER BY salary DESC) as salary_rank,
  LAG(salary) OVER (PARTITION BY department ORDER BY salary DESC) as prev_salary
FROM employees;`,
        keyPoints: [
          "PARTITION BY groups rows for the calculation",
          "ORDER BY defines the sequence within partitions",
          "Supports ROWS/RANGE for frame specification",
          "Common functions: ROW_NUMBER, RANK, LAG, LEAD, SUM, AVG",
        ],
      },
      {
        id: 17,
        question: "Explain the Medallion Architecture (Bronze, Silver, Gold).",
        answer:
          "The Medallion Architecture is a data design pattern for organizing data in a lakehouse. Bronze layer stores raw ingested data with minimal transformation. Silver layer contains cleaned, conformed, and validated data. Gold layer has business-level aggregates and metrics ready for reporting. This progressive refinement ensures data quality while maintaining lineage.",
        keyPoints: [
          "Bronze: Raw data, append-only, preserve source format",
          "Silver: Cleaned, deduplicated, schema-enforced data",
          "Gold: Business aggregates, dimensional models, KPIs",
          "Each layer adds quality and business value",
        ],
      },
      {
        id: 18,
        question: "What is the difference between managed and external tables?",
        answer:
          "Managed tables have both metadata and data managed by the metastore. When dropped, both metadata and data files are deleted. External tables only have metadata in the metastore; data files exist in a specified location. Dropping an external table removes only metadata, preserving data files. Use external tables when data is shared across systems or requires specific storage locations.",
        codeExample: `-- Managed table (data stored in metastore location)
CREATE TABLE managed_sales (
  id INT,
  amount DECIMAL(10,2)  
);

-- External table (data at specified location)
CREATE TABLE external_sales (
  id INT,
  amount DECIMAL(10,2)
)
LOCATION 's3://my-bucket/sales/';

-- Check table type
DESCRIBE EXTENDED managed_sales;`,
        keyPoints: [
          "Managed: metastore controls data lifecycle",
          "External: data persists after DROP TABLE",
          "Use external for shared or pre-existing data",
          "Unity Catalog prefers managed tables for governance",
        ],
      },
      {
        id: 19,
        question: "How do you implement slowly changing dimensions (SCD) in Databricks?",
        answer:
          "SCD Type 1 overwrites old values (use MERGE with UPDATE). SCD Type 2 maintains history with effective dates and current flags. In Delta Lake, implement SCD Type 2 using MERGE with multiple WHEN MATCHED clauses to expire old records and insert new versions. Delta's time travel also provides implicit Type 2 capability.",
        codeExample: `-- SCD Type 2 implementation with MERGE
MERGE INTO dim_customer AS target
USING staged_updates AS source
ON target.customer_id = source.customer_id AND target.is_current = true

-- Expire existing record
WHEN MATCHED AND target.name != source.name THEN UPDATE SET
  is_current = false,
  end_date = current_date()

-- Insert new version (handled separately or with INSERT)
WHEN NOT MATCHED THEN INSERT (
  customer_id, name, is_current, start_date, end_date
) VALUES (
  source.customer_id, source.name, true, current_date(), null
);`,
        keyPoints: [
          "Type 1: Overwrite (no history)",
          "Type 2: Track history with effective dates",
          "Use is_current flag for easy current-version queries",
          "Delta time travel provides natural history",
        ],
      },
    ],
  },
  {
    name: "MLflow & MLOps",
    icon: "🤖",
    questions: [
      {
        id: 20,
        question: "What is MLflow and what are its components?",
        answer:
          "MLflow is an open-source platform for managing the ML lifecycle. It has four components: Tracking (logging parameters, metrics, artifacts), Projects (packaging code for reproducibility), Models (model packaging and deployment), and Model Registry (versioning and staging models). MLflow integrates natively with Databricks for seamless experiment tracking and deployment.",
        codeExample: `import mlflow
from mlflow.tracking import MlflowClient

# Start an experiment run
with mlflow.start_run(run_name="my_experiment"):
    # Log parameters
    mlflow.log_param("learning_rate", 0.01)
    mlflow.log_param("epochs", 100)
    
    # Train model...
    
    # Log metrics
    mlflow.log_metric("accuracy", 0.95)
    mlflow.log_metric("f1_score", 0.92)
    
    # Log model
    mlflow.sklearn.log_model(model, "model")
    
    # Log artifacts (plots, data samples)
    mlflow.log_artifact("confusion_matrix.png")`,
        keyPoints: [
          "Tracking: Log experiments, parameters, metrics",
          "Projects: Reproducible ML code packaging",
          "Models: Standard format for deployment",
          "Registry: Version control and model staging",
        ],
      },
      {
        id: 21,
        question: "How do you deploy a model to production in Databricks?",
        answer:
          "Model deployment in Databricks follows a lifecycle: train and log to MLflow, register in Model Registry, transition through stages (None → Staging → Production), then deploy for inference. Options include real-time REST endpoints (Model Serving), batch scoring with Spark UDFs, and streaming inference. Feature Store integration ensures consistent features.",
        codeExample: `from mlflow.tracking import MlflowClient

client = MlflowClient()

# Register model from run
model_uri = f"runs:/{run_id}/model"
mlflow.register_model(model_uri, "my_model")

# Transition to production
client.transition_model_version_stage(
    name="my_model",
    version=1,
    stage="Production"
)

# Load production model for batch scoring
model = mlflow.pyfunc.load_model("models:/my_model/Production")
predictions = model.predict(df.toPandas())

# Or use Spark UDF for distributed scoring
predict_udf = mlflow.pyfunc.spark_udf(spark, "models:/my_model/Production")
scored_df = df.withColumn("prediction", predict_udf(*feature_columns))`,
        keyPoints: [
          "Model Registry manages model versions",
          "Staging workflow: Development → Staging → Production",
          "Model Serving for real-time REST endpoints",
          "Spark UDFs for distributed batch scoring",
        ],
      },
      {
        id: 22,
        question: "What is the Feature Store and why use it?",
        answer:
          "Databricks Feature Store is a centralized repository for feature engineering that enables feature reuse across teams and consistent feature computation between training and inference. It solves feature consistency problems, reduces duplicate feature engineering work, and provides feature lineage and discovery. Features are stored as Delta tables with point-in-time lookup support.",
        keyPoints: [
          "Centralized feature repository",
          "Ensures training/serving consistency",
          "Point-in-time feature lookup prevents leakage",
          "Feature lineage and discovery across teams",
        ],
      },
    ],
  },
  {
    name: "Architecture",
    icon: "🏗️",
    questions: [
      {
        id: 23,
        question: "How would you design a real-time streaming pipeline in Databricks?",
        answer:
          "Use Structured Streaming with Delta Lake as source/sink. Ingest from Kafka/Event Hubs/Kinesis, process with DataFrame transformations, and write to Delta tables with exactly-once guarantees. For complex pipelines, use Lakeflow (DLT) which handles checkpointing, retries, and automatic schema evolution. Monitor with Spark UI and Databricks observability tools.",
        codeExample: `# Structured Streaming with Delta
stream_df = spark.readStream \\
    .format("kafka") \\
    .option("kafka.bootstrap.servers", "broker:9092") \\
    .option("subscribe", "events") \\
    .load()

# Process stream
processed = stream_df \\
    .select(from_json(col("value").cast("string"), schema).alias("data")) \\
    .select("data.*") \\
    .withWatermark("event_time", "10 minutes") \\
    .groupBy(window("event_time", "5 minutes"), "category") \\
    .agg(count("*").alias("event_count"))

# Write to Delta with checkpointing
processed.writeStream \\
    .format("delta") \\
    .outputMode("append") \\
    .option("checkpointLocation", "/checkpoints/events") \\
    .trigger(processingTime="1 minute") \\
    .start("/delta/event_aggregates")`,
        keyPoints: [
          "Structured Streaming for exactly-once processing",
          "Watermarks handle late-arriving data",
          "Checkpoints enable fault-tolerant recovery",
          "Delta Lake as unified batch/streaming sink",
        ],
      },
      {
        id: 24,
        question: "What is Auto Loader and when should you use it?",
        answer:
          "Auto Loader is a Databricks feature for incrementally ingesting new files from cloud storage (S3, ADLS, GCS). It automatically discovers and processes new files without listing the entire directory, using file notification services for efficiency. Use Auto Loader for landing zone ingestion, especially with high file volumes. It supports schema inference and evolution.",
        codeExample: `# Auto Loader with cloudFiles format
df = spark.readStream \\
    .format("cloudFiles") \\
    .option("cloudFiles.format", "json") \\
    .option("cloudFiles.schemaLocation", "/schema/events") \\
    .option("cloudFiles.inferColumnTypes", "true") \\
    .load("s3://bucket/landing/events/")

# Write to Delta Bronze table
df.writeStream \\
    .format("delta") \\
    .option("checkpointLocation", "/checkpoints/events_bronze") \\
    .option("mergeSchema", "true") \\
    .trigger(availableNow=True)  # Or processingTime for continuous
    .start("/delta/bronze/events")`,
        keyPoints: [
          "Efficient file discovery with notifications",
          "Automatic schema inference and evolution",
          "Exactly-once ingestion guarantees",
          "Scales to millions of files efficiently",
        ],
      },
      {
        id: 25,
        question: "How do you optimize costs in Databricks?",
        answer:
          "Cost optimization strategies include: using spot/preemptible instances, right-sizing clusters based on workload, enabling autoscaling with appropriate min/max, using SQL warehouses for BI queries, implementing cluster policies, scheduling jobs during off-peak hours, and optimizing data storage with Delta Lake compaction and Z-ordering. Monitor costs with Databricks account console.",
        keyPoints: [
          "Spot instances save 60-90% on compute",
          "Autoscaling matches resources to demand",
          "SQL Warehouses for concurrent BI queries",
          "Delta Lake optimization reduces I/O costs",
          "Cluster policies enforce cost guardrails",
        ],
      },
    ],
  },
]

/**
 * Expandable FAQ item component.
 */
function FAQItem({ item }: { item: FAQQuestion }): React.ReactElement {
  // Only show ID prefix for numeric IDs (static data), not UUIDs (database data)
  const showIdPrefix = typeof item.id === 'number';
  
  return (
    <details className="group cut-corner border border-anime-700 bg-anime-900 hover:border-anime-cyan/50 transition-colors">
      <summary className="flex cursor-pointer items-center justify-between p-5 text-gray-100 hover:bg-anime-800/50">
        <span className="font-medium pr-4">{showIdPrefix ? `${item.id}. ` : ''}{item.question}</span>
        <span className="text-anime-cyan transition-transform group-open:rotate-180">
          ▼
        </span>
      </summary>
      <div className="border-t border-anime-700 p-5">
        <p className="text-gray-300 leading-relaxed">{item.answer}</p>
        
        {item.codeExample && (
          <pre className="mt-4 overflow-x-auto rounded bg-anime-950 p-4 text-sm text-gray-300 border border-anime-700">
            <code>{item.codeExample}</code>
          </pre>
        )}
        
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-anime-cyan mb-2">Key Points:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
            {item.keyPoints.map((point, idx) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  )
}

/**
 * Intel page - Decrypted knowledge base for Databricks interview questions.
 * Cyberpunk-themed FAQ with technical intelligence gathering aesthetic.
 */
export default async function IntelPage(): Promise<React.ReactElement> {
  // Try to get FAQ data from DB, fall back to static data
  const dbFaqs = await getDbFaqs()
  const displayData = dbFaqs.length > 0 ? dbFaqs : faqData
  
  const totalQuestions = displayData.reduce((sum, cat) => sum + cat.questions.length, 0)
  
  return (
    <div className="min-h-screen bg-anime-950 text-white pt-20">
      <StructuredData data={getFAQStructuredData()} />
      
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 flex items-center gap-4">
          <div className="w-16 h-16 bg-anime-accent/10 border border-anime-accent flex items-center justify-center text-anime-accent">
            <Database className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-black italic text-white uppercase tracking-tighter">
              Intel
            </h1>
            <p className="text-gray-500 font-mono text-xs uppercase tracking-widest mt-1">
              Decrypted Knowledge Base • {totalQuestions} Entries
            </p>
          </div>
        </div>

        <p className="text-lg text-gray-400 mb-8 border-l-2 border-anime-cyan pl-4">
          Prepare for Databricks interview operations with classified intel, detailed answers, code examples, and tactical key points.
        </p>

        {/* Category summary cards */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-12">
          {displayData.map((cat) => (
            <a
              key={cat.name}
              href={`#${cat.name.toLowerCase().replace(/\s+/g, "-")}`}
              className="cut-corner border border-anime-700 bg-anime-900 p-5 transition-all duration-300 hover:border-anime-cyan hover:bg-anime-800/50 hover:-translate-y-1 hover:shadow-neon-cyan group"
            >
              <span className="text-2xl" aria-hidden="true">
                {cat.icon}
              </span>
              <h3 className="mt-2 font-semibold text-gray-100 group-hover:text-anime-cyan transition-colors">{cat.name}</h3>
              <p className="mt-1 text-sm text-gray-400 font-mono">
                {cat.questions.length} classified entries
              </p>
            </a>
          ))}
        </div>

        {/* FAQ content by category */}
        <div className="mt-12 space-y-12">
          {displayData.map((category) => (
            <section
              key={category.name}
              id={category.name.toLowerCase().replace(/\s+/g, "-")}
            >
              <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-3 mb-6 border-l-2 border-anime-cyan pl-4">
                <span aria-hidden="true">{category.icon}</span>
                {category.name}
              </h2>
              <div className="space-y-4">
                {category.questions.map((item) => (
                  <FAQItem key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 cut-corner border border-anime-accent/30 bg-anime-900 p-6 text-center">
          <p className="text-gray-400">
            Ready to deploy your knowledge in the field?
          </p>
          <Link
            href="/challenges"
            className="mt-3 inline-block rounded bg-anime-accent px-6 py-2 font-medium text-white transition-colors hover:bg-anime-accent/80"
          >
            Execute Challenge Operations →
          </Link>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-anime-cyan hover:text-anime-cyan/80"
          >
            ← Return to Base
          </Link>
        </div>
      </div>
    </div>
  )
}
