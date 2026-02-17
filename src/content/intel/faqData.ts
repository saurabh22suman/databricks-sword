/**
 * Shared FAQ data for the Intel page.
 * Used by both the UI and the seed script.
 */

export type FAQQuestion = {
  id: number | string
  question: string
  answer: string
  codeExample?: string | null
  keyPoints: string[]
}

export type FAQCategory = {
  name: string
  icon: string
  questions: FAQQuestion[]
}

/** Maps display category names to DB slugs. */
export const categorySlugMap: Record<string, string> = {
  "General Databricks": "general",
  "Delta Lake": "delta-lake",
  "PySpark": "pyspark",
  "SQL & Analytics": "sql",
  "MLflow & MLOps": "mlflow",
  "Architecture": "architecture",
}

export const faqData: FAQCategory[] = [
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
      {
        id: 26,
        question: "What are Databricks Workflows and how do they differ from Jobs?",
        answer:
          "Databricks Workflows is the orchestration engine for running multi-task data, analytics, and ML pipelines. A Workflow defines a DAG of tasks (notebooks, JARs, Python scripts, dbt, SQL, DLT pipelines) with dependencies, retries, and conditional logic. Jobs are the execution instances of workflows. Workflows support scheduling, event triggers (file arrival), parameters, and integration with CI/CD.",
        codeExample: `# Create a multi-task workflow via REST API
{
  "name": "daily_etl_pipeline",
  "tasks": [
    {
      "task_key": "ingest",
      "notebook_task": { "notebook_path": "/pipelines/ingest" }
    },
    {
      "task_key": "transform",
      "depends_on": [{ "task_key": "ingest" }],
      "notebook_task": { "notebook_path": "/pipelines/transform" }
    },
    {
      "task_key": "validate",
      "depends_on": [{ "task_key": "transform" }],
      "notebook_task": { "notebook_path": "/pipelines/validate" }
    }
  ],
  "schedule": { "quartz_cron_expression": "0 0 6 * * ?", "timezone_id": "UTC" }
}`,
        keyPoints: [
          "DAG-based multi-task orchestration",
          "Supports notebooks, JARs, Python, SQL, DLT",
          "Event-driven triggers (file arrival, API call)",
          "Built-in retry, timeout, and alerting policies",
        ],
      },
      {
        id: 27,
        question: "What is Databricks SQL and SQL Warehouses?",
        answer:
          "Databricks SQL (DB SQL) is a serverless analytics service for running SQL queries on lakehouse data. SQL Warehouses are compute endpoints optimized for concurrent BI queries with auto-scaling, query caching, and Photon acceleration. They support T-ANSI SQL, JDBC/ODBC drivers, and native connectors for BI tools like Tableau, Power BI, and Looker. Serverless SQL Warehouses remove cluster management entirely.",
        keyPoints: [
          "Serverless SQL compute for BI workloads",
          "Photon engine provides near-warehouse performance",
          "Auto-scaling handles concurrency spikes",
          "Query result caching reduces repeat query costs",
          "Native BI tool integration (Tableau, Power BI)",
        ],
      },
      {
        id: 28,
        question: "What are Databricks Asset Bundles (DABs)?",
        answer:
          "Databricks Asset Bundles are an infrastructure-as-code framework for packaging Databricks projects — jobs, pipelines, notebooks, and configurations — as version-controlled YAML files. DABs enable CI/CD, environment promotion (dev → staging → prod), and reproducible deployments. They use the Databricks CLI for deploying and destroying bundles across workspaces.",
        codeExample: `# databricks.yml — bundle configuration
bundle:
  name: sales_pipeline

workspace:
  host: https://myworkspace.databricks.com

resources:
  jobs:
    daily_etl:
      name: "Daily Sales ETL"
      tasks:
        - task_key: ingest
          notebook_task:
            notebook_path: ./notebooks/ingest.py

targets:
  dev:
    default: true
    workspace:
      root_path: /Users/me/bundles/dev
  prod:
    workspace:
      root_path: /Shared/bundles/prod`,
        keyPoints: [
          "Infrastructure-as-code for Databricks resources",
          "YAML-based project configuration",
          "Supports dev/staging/prod environment promotion",
          "Integrated with Databricks CLI for CI/CD",
        ],
      },
      {
        id: 29,
        question: "How does Databricks handle secrets management?",
        answer:
          "Databricks provides a Secrets API and CLI for securely storing sensitive values like API keys, passwords, and connection strings. Secrets are organized into scopes (Databricks-backed or Azure Key Vault-backed). In notebooks, use dbutils.secrets.get() to retrieve them — values are redacted from notebook output. ACLs control which users/groups can access each scope.",
        codeExample: `# Create a secret scope via CLI
databricks secrets create-scope my-scope

# Store a secret
databricks secrets put-secret my-scope db-password --string-value "s3cr3t"

# Access in a notebook
password = dbutils.secrets.get(scope="my-scope", key="db-password")

# Use in JDBC connection
jdbc_url = f"jdbc:postgresql://host:5432/db?user=admin&password={password}"
df = spark.read.format("jdbc").option("url", jdbc_url).load()`,
        keyPoints: [
          "Secret scopes organize sensitive values",
          "Values redacted from notebook output",
          "ACL-based access control per scope",
          "Supports Azure Key Vault integration",
        ],
      },
      {
        id: 30,
        question: "What is Photon and how does it accelerate queries?",
        answer:
          "Photon is a C++ vectorized query engine built into Databricks Runtime that dramatically accelerates SQL and DataFrame workloads. It processes data in columnar batches using CPU SIMD instructions, bypassing JVM overhead. Photon is particularly effective for scan-heavy BI queries, aggregations, joins, and Delta Lake operations. It's enabled by default on SQL Warehouses and opt-in on all-purpose clusters.",
        keyPoints: [
          "C++ vectorized engine (not JVM-based)",
          "Columnar batch processing with SIMD",
          "2-8x speedup for scan-heavy SQL workloads",
          "Native Delta Lake and Parquet optimizations",
          "Enabled by default on SQL Warehouses",
        ],
      },
      {
        id: 31,
        question: "What are Databricks Repos and Git integration?",
        answer:
          "Databricks Repos allows you to sync Git repositories directly into your Databricks workspace. It supports GitHub, GitLab, Azure DevOps, and Bitbucket. You can develop in notebooks or IDE-style files, commit, push, pull, and create branches — all within the Databricks UI. This enables collaborative development, code review, and CI/CD workflows for notebooks and Python modules.",
        keyPoints: [
          "Native Git integration in the workspace",
          "Supports branching, commits, pull requests",
          "Works with GitHub, GitLab, Azure DevOps",
          "Enables importing Python modules alongside notebooks",
        ],
      },
      {
        id: 32,
        question: "What is the difference between interactive and job clusters?",
        answer:
          "Interactive (all-purpose) clusters are long-lived, support multiple users and notebooks simultaneously, and are ideal for development and exploration. Job clusters are ephemeral, created for a specific workflow run and terminated after completion. Job clusters cost less (lower DBU rate) and isolate workloads. Best practice: develop on interactive clusters, deploy to production with job clusters.",
        codeExample: `# Interactive cluster — reusable
{
  "cluster_name": "shared-dev",
  "autotermination_minutes": 60,
  "num_workers": 4,
  "spark_version": "14.3.x-scala2.12"
}

# Job cluster — ephemeral, created per run
{
  "new_cluster": {
    "num_workers": 8,
    "spark_version": "14.3.x-scala2.12",
    "node_type_id": "m5.2xlarge"
  }
}`,
        keyPoints: [
          "Interactive: multi-user, long-lived, higher DBU cost",
          "Job clusters: single-use, ephemeral, lower cost",
          "Job clusters auto-terminate after run completion",
          "Use cluster policies to enforce guardrails on both",
        ],
      },
      {
        id: 33,
        question: "How does Databricks implement data lineage?",
        answer:
          "Unity Catalog provides automatic data lineage tracking across tables, columns, notebooks, workflows, and ML models. It captures read/write relationships without any code changes. Lineage helps with impact analysis (which downstream tables are affected by a schema change), regulatory compliance (GDPR data tracing), debugging data quality issues, and understanding data flow through the organization.",
        keyPoints: [
          "Automatic lineage capture via Unity Catalog",
          "Table-level and column-level lineage",
          "Tracks notebook, workflow, and model dependencies",
          "Essential for impact analysis and compliance",
        ],
      },
      {
        id: 34,
        question: "What is Serverless Compute in Databricks?",
        answer:
          "Serverless Compute removes cluster management by providing instant, auto-scaling compute managed by Databricks. Available for SQL Warehouses, notebooks, and workflows. Benefits include sub-second startup (no cluster wait), automatic scaling to zero, pay-per-query pricing, and no infrastructure configuration. It's ideal for unpredictable workloads, ad-hoc queries, and reducing operational complexity.",
        keyPoints: [
          "Instant startup — no cluster provisioning wait",
          "Automatic scale-to-zero when idle",
          "Available for SQL, notebooks, and jobs",
          "Reduces operational overhead significantly",
        ],
      },
      {
        id: 35,
        question: "What are Databricks Cluster Policies and why use them?",
        answer:
          "Cluster Policies are JSON rules that restrict cluster creation options for users and groups. Admins define policies to enforce instance types, maximum workers, runtime versions, spot instance usage, and auto-termination. This prevents runaway costs, ensures compliance, and standardizes cluster configurations across teams. Users select a policy when creating clusters, and policy violations are blocked.",
        codeExample: `// Cluster Policy JSON example
{
  "node_type_id": {
    "type": "allowlist",
    "values": ["m5.xlarge", "m5.2xlarge"]
  },
  "autoscale.max_workers": {
    "type": "range",
    "maxValue": 10
  },
  "autotermination_minutes": {
    "type": "fixed",
    "value": 60
  },
  "spark_version": {
    "type": "regex",
    "pattern": "14\\\\.[0-9]+\\\\.x-scala.*"
  }
}`,
        keyPoints: [
          "Admin-defined guardrails for cluster creation",
          "Enforce instance types, sizes, and timeouts",
          "Prevent cost overruns from oversized clusters",
          "Apply policies to users, groups, or service principals",
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
      {
        id: 36,
        question: "What is the Delta Lake transaction log and how does it work?",
        answer:
          "The Delta Lake transaction log (_delta_log) is an ordered record of every transaction performed on a table. It stores JSON files for each commit containing metadata about the operations (add/remove files, schema changes). Every 10 commits, a checkpoint Parquet file is created for faster log replay. The log enables ACID transactions, time travel, and concurrent write conflict detection using optimistic concurrency control.",
        keyPoints: [
          "JSON commit files track every table operation",
          "Checkpoint files every 10 commits for performance",
          "Enables optimistic concurrency control",
          "Foundation for ACID, time travel, and audit",
        ],
      },
      {
        id: 37,
        question: "What is VACUUM in Delta Lake and when should you use it?",
        answer:
          "VACUUM removes data files that are no longer referenced by the Delta transaction log (stale files from updates, deletes, compaction). By default, it retains files for 7 days (168 hours) to support time travel. Running VACUUM too aggressively removes the ability to query older versions. Schedule VACUUM regularly to reclaim storage, but balance with time travel requirements.",
        codeExample: `-- Vacuum with default retention (7 days)
VACUUM my_table;

-- Vacuum with custom retention (30 days)
VACUUM my_table RETAIN 720 HOURS;

-- DRY RUN to preview files to delete
VACUUM my_table DRY RUN;

-- Override safety check (dangerous!)
SET spark.databricks.delta.retentionDurationCheck.enabled = false;
VACUUM my_table RETAIN 0 HOURS;`,
        keyPoints: [
          "Removes unreferenced data files",
          "Default retention: 7 days (168 hours)",
          "Time travel won't work for vacuumed versions",
          "Schedule regularly to control storage costs",
        ],
      },
      {
        id: 38,
        question: "What is Change Data Feed (CDF) in Delta Lake?",
        answer:
          "Change Data Feed records row-level changes (inserts, updates, deletes) on a Delta table, making it easy to propagate incremental changes downstream. When enabled, CDF adds _change_type, _commit_version, and _commit_timestamp columns. It's ideal for CDC pipelines, audit logging, syncing to external systems, and building incremental ETL without full table scans.",
        codeExample: `-- Enable CDF on a table
ALTER TABLE orders SET TBLPROPERTIES (delta.enableChangeDataFeed = true);

-- Read changes since a version
SELECT * FROM table_changes('orders', 5)
WHERE _change_type IN ('insert', 'update_postimage');

-- Streaming CDF reader
spark.readStream.format("delta") \\
  .option("readChangeFeed", "true") \\
  .option("startingVersion", 10) \\
  .table("orders")`,
        keyPoints: [
          "Records row-level insert/update/delete changes",
          "Enables efficient incremental downstream processing",
          "Supports both batch and streaming consumers",
          "Adds _change_type metadata to track operation type",
        ],
      },
      {
        id: 39,
        question: "How does OPTIMIZE work in Delta Lake?",
        answer:
          "OPTIMIZE compacts small files into larger ones (target ~1GB) for better read performance. It can also Z-order data by specified columns to co-locate related values for faster predicate pushdown. OPTIMIZE is idempotent and safe to run concurrently with reads. On Databricks, predictive optimization can schedule OPTIMIZE automatically based on table usage patterns.",
        codeExample: `-- Basic compaction
OPTIMIZE my_table;

-- Z-order by frequently filtered columns
OPTIMIZE my_table ZORDER BY (date, region);

-- Optimize a specific partition
OPTIMIZE my_table WHERE date = '2024-01-15';

-- Enable predictive optimization (auto-OPTIMIZE)
ALTER TABLE my_table SET TBLPROPERTIES (
  'delta.tuneFileSizesForRewrites' = 'true'
);`,
        keyPoints: [
          "Compacts small files into optimal-size files",
          "Z-ordering co-locates data for query predicates",
          "Safe to run concurrently with readers",
          "Predictive optimization automates scheduling",
        ],
      },
      {
        id: 40,
        question: "What are Delta Lake constraints and how do you use them?",
        answer:
          "Delta Lake supports NOT NULL constraints and CHECK constraints for data quality enforcement. NOT NULL prevents null values in specified columns. CHECK constraints validate arbitrary boolean expressions on new rows. Constraints are enforced at write time — violating rows cause the write to fail. They complement schema enforcement for comprehensive data quality.",
        codeExample: `-- Add NOT NULL constraint
ALTER TABLE orders ALTER COLUMN customer_id SET NOT NULL;

-- Add CHECK constraint
ALTER TABLE orders ADD CONSTRAINT valid_amount CHECK (amount > 0);
ALTER TABLE orders ADD CONSTRAINT valid_status CHECK (status IN ('pending', 'shipped', 'delivered'));

-- Drop a constraint
ALTER TABLE orders DROP CONSTRAINT valid_amount;

-- View constraints
DESCRIBE DETAIL orders;`,
        keyPoints: [
          "NOT NULL and CHECK constraints supported",
          "Enforced at write time — bad data rejected",
          "Complement schema enforcement",
          "Named constraints can be added/dropped independently",
        ],
      },
      {
        id: 41,
        question: "What is Delta Sharing and how does it enable data collaboration?",
        answer:
          "Delta Sharing is an open protocol for secure data sharing across organizations without copying data. The provider publishes tables or partitions via a sharing server, and recipients access data using any client (Spark, pandas, Power BI) with a credential file. Data stays in the provider's storage, recipients always get the latest version, and access can be revoked instantly.",
        keyPoints: [
          "Open protocol — works across platforms and clouds",
          "No data copying — recipients read directly",
          "Fine-grained access control (table/partition level)",
          "Recipients use standard tools (Spark, pandas, BI)",
        ],
      },
      {
        id: 42,
        question: "How do you handle small file problems in Delta Lake?",
        answer:
          "Small files degrade read performance due to excessive file listing and I/O overhead. In Delta Lake, small files accumulate from frequent appends, streaming ingestion, or highly partitioned writes. Solutions include: running OPTIMIZE for compaction, auto-compaction (delta.autoOptimize.autoCompact), optimized writes (delta.autoOptimize.optimizeWrite), and adjusting partition strategies. Streaming workloads should use trigger intervals that batch more data.",
        codeExample: `-- Enable auto-compaction and optimized writes
ALTER TABLE events SET TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact' = 'true'
);

-- Or set at session level
SET spark.databricks.delta.optimizeWrite.enabled = true;
SET spark.databricks.delta.autoCompact.enabled = true;

-- Manual compaction
OPTIMIZE events;`,
        keyPoints: [
          "Small files degrade scan and listing performance",
          "OPTIMIZE compacts into ~1GB target files",
          "optimizeWrite coalesces partitions before write",
          "autoCompact triggers mini-compaction after writes",
        ],
      },
      {
        id: 43,
        question: "What are Deletion Vectors in Delta Lake?",
        answer:
          "Deletion Vectors are a performance optimization that marks rows as deleted within existing Parquet data files rather than rewriting entire files. When a DELETE or UPDATE touches a few rows, the engine writes a lightweight bitmap (deletion vector) instead of a full file rewrite. This dramatically speeds up DML operations on large tables. Reads apply the deletion vector to filter out marked rows.",
        keyPoints: [
          "Mark rows deleted without rewriting data files",
          "10-100x faster DELETE/UPDATE on large tables",
          "Bitmap stored alongside data files",
          "Transparent to readers — filtered automatically",
        ],
      },
      {
        id: 44,
        question: "How does Delta Lake handle concurrent writes?",
        answer:
          "Delta Lake uses optimistic concurrency control. Multiple writers can write simultaneously — at commit time, the engine checks the transaction log for conflicts. If a concurrent commit modified the same files, the conflicting transaction is retried or fails. Isolation levels (WriteSerializable, Serializable) control conflict detection strictness. Most append operations succeed without conflicts since they add new files without modifying existing ones.",
        keyPoints: [
          "Optimistic concurrency — no locks required",
          "Conflict detection at commit time via transaction log",
          "Append operations rarely conflict",
          "WriteSerializable (default) handles most scenarios",
        ],
      },
      {
        id: 45,
        question: "What is UniForm in Delta Lake?",
        answer:
          "UniForm (Universal Format) automatically generates Iceberg and Hudi metadata alongside Delta Lake commits, enabling engines like Snowflake, Trino, Presto, and BigQuery to read Delta tables through their native format readers. No data duplication — only metadata is generated. UniForm makes Delta Lake truly interoperable without requiring all consumers to support the Delta protocol.",
        codeExample: `-- Enable UniForm for Iceberg compatibility
ALTER TABLE my_table SET TBLPROPERTIES (
  'delta.universalFormat.enabledFormats' = 'iceberg'
);

-- Create table with UniForm from the start
CREATE TABLE my_table (id INT, name STRING)
TBLPROPERTIES (
  'delta.universalFormat.enabledFormats' = 'iceberg'
);`,
        keyPoints: [
          "Auto-generates Iceberg/Hudi metadata from Delta",
          "No data duplication — metadata only",
          "Enables Snowflake, Trino, BigQuery to read Delta",
          "Live interoperability without export/convert",
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
      {
        id: 46,
        question: "What is Adaptive Query Execution (AQE) in Spark?",
        answer:
          "AQE dynamically optimizes query execution at runtime based on actual data statistics collected during shuffle stages. It can coalesce small post-shuffle partitions, switch join strategies (broadcast) when one side is discovered to be small, and optimize skewed joins — all without manual tuning. AQE is enabled by default in Databricks Runtime and dramatically reduces the need for manual performance tuning.",
        codeExample: `# AQE is enabled by default, but can be configured
spark.conf.set("spark.sql.adaptive.enabled", "true")

# Coalesce small partitions
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")

# Skew join optimization
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes", "256MB")

# Convert sort-merge join to broadcast if small enough
spark.conf.set("spark.sql.adaptive.autoBroadcastJoinThreshold", "30MB")`,
        keyPoints: [
          "Runtime optimization using actual data statistics",
          "Auto-coalesces small post-shuffle partitions",
          "Dynamically switches join strategies",
          "Handles skewed joins automatically",
        ],
      },
      {
        id: 47,
        question: "How do you read and write data from external sources in PySpark?",
        answer:
          "PySpark supports reading/writing to many formats and sources: Parquet, Delta, CSV, JSON, Avro, ORC (file formats); JDBC/ODBC (databases); Kafka, Event Hubs (streaming); and REST APIs via custom connectors. Use spark.read.format() for batch and spark.readStream.format() for streaming. Connection credentials should use Databricks secrets, not hardcoded values.",
        codeExample: `# Read from JDBC database
df = spark.read.format("jdbc") \\
  .option("url", "jdbc:postgresql://host:5432/db") \\
  .option("dbtable", "public.orders") \\
  .option("user", dbutils.secrets.get("scope", "user")) \\
  .option("password", dbutils.secrets.get("scope", "pass")) \\
  .option("fetchsize", "10000") \\
  .load()

# Write to Delta
df.write.format("delta").mode("overwrite").saveAsTable("bronze.orders")

# Read from S3 with Auto Loader
stream_df = spark.readStream.format("cloudFiles") \\
  .option("cloudFiles.format", "json") \\
  .load("s3://bucket/landing/")`,
        keyPoints: [
          "Supports files, databases, streaming sources",
          "Use secrets for credentials, never hardcode",
          "JDBC fetchsize improves database read performance",
          "Auto Loader for incremental file ingestion",
        ],
      },
      {
        id: 48,
        question: "What is the Catalyst optimizer and how does it work?",
        answer:
          "Catalyst is Spark SQL's query optimizer that transforms logical query plans into optimized physical execution plans. It applies rule-based optimizations (predicate pushdown, column pruning, constant folding) and cost-based optimizations (join reordering, choosing join algorithms). Catalyst works with DataFrames and SQL queries, which is why they outperform RDD-based code. Use explain() to inspect the query plan.",
        codeExample: `# View the query plan
df.filter(col("status") == "active") \\
  .groupBy("department") \\
  .agg(sum("salary").alias("total_salary")) \\
  .explain(mode="extended")

# Modes: "simple", "extended", "codegen", "cost", "formatted"

# Catalyst applies automatically:
# - Predicate Pushdown: filters pushed to data source
# - Column Pruning: only reads needed columns
# - Constant Folding: evaluates constants at plan time`,
        keyPoints: [
          "Transforms logical plans to optimized physical plans",
          "Predicate pushdown, column pruning, join reordering",
          "Cost-based optimization for join strategies",
          "Use explain() to inspect and debug query plans",
        ],
      },
      {
        id: 49,
        question: "How do you work with complex data types in PySpark?",
        answer:
          "PySpark handles nested data (JSON, Avro) natively with StructType, ArrayType, and MapType. Use dot notation to access struct fields, explode() to flatten arrays, and from_json()/to_json() for JSON strings. Schema-on-read with schema inference or explicit StructType definitions. For deeply nested data, consider flattening in the silver layer of medallion architecture.",
        codeExample: `from pyspark.sql.functions import explode, col, from_json
from pyspark.sql.types import StructType, StructField, StringType, ArrayType

# Access nested struct fields
df.select("user.name", "user.address.city")

# Flatten an array column
df.select("order_id", explode("items").alias("item"))

# Parse JSON string column
schema = StructType([
  StructField("event", StringType()),
  StructField("tags", ArrayType(StringType()))
])
df.select(from_json(col("json_data"), schema).alias("parsed"))`,
        keyPoints: [
          "StructType, ArrayType, MapType for nested data",
          "Dot notation accesses nested struct fields",
          "explode() flattens arrays into rows",
          "from_json() parses JSON strings with a schema",
        ],
      },
      {
        id: 50,
        question: "What is DataFrame caching and when should you use it?",
        answer:
          "Caching (persist/cache) stores a DataFrame in memory or disk to avoid recomputation when the same DataFrame is used in multiple actions. Use cache() for iterative algorithms, ML training with multiple passes, or when a DataFrame is reused across several downstream transformations. Avoid caching large DataFrames that exceed cluster memory, one-time-use DataFrames, or streaming DataFrames.",
        codeExample: `from pyspark import StorageLevel

# Cache in memory (default)
df_cached = df.cache()

# Persist with specific storage level
df_persisted = df.persist(StorageLevel.MEMORY_AND_DISK)

# Force materialization
df_cached.count()

# Check if cached in Spark UI > Storage tab

# Unpersist when no longer needed
df_cached.unpersist()`,
        keyPoints: [
          "Avoids recomputation for reused DataFrames",
          "cache() = MEMORY_ONLY, persist() for custom levels",
          "Always unpersist when no longer needed",
          "Monitor memory usage via Spark UI Storage tab",
        ],
      },
      {
        id: 51,
        question: "How do you debug and profile PySpark jobs?",
        answer:
          "Use the Spark UI to inspect DAGs, stages, tasks, and shuffle metrics. Check the SQL tab for query plans, Storage tab for cached data, and Executors tab for memory/GC issues. In Databricks, use the built-in profiler, Ganglia metrics, and driver/executor logs. For code-level debugging, use explain() for query plans, df.printSchema() for structure, and toDF() with show() for intermediate results.",
        codeExample: `# Inspect query plan
df.explain("formatted")

# Check partition count
print(f"Partitions: {df.rdd.getNumPartitions()}")

# Sample data for debugging
df.limit(10).show(truncate=False)
df.printSchema()

# Check for data skew
df.groupBy("join_key").count().orderBy(col("count").desc()).show(20)

# Enable Spark UI event logging
spark.conf.set("spark.eventLog.enabled", "true")`,
        keyPoints: [
          "Spark UI: DAGs, stages, tasks, shuffle metrics",
          "SQL tab shows optimized query plans",
          "Check partition distribution for skew",
          "Databricks profiler for CPU/memory analysis",
        ],
      },
      {
        id: 52,
        question: "What is the difference between repartition() and coalesce()?",
        answer:
          "repartition(n) creates exactly n partitions with a full shuffle, distributing data evenly. coalesce(n) reduces partitions without a full shuffle by merging existing partitions — it's faster but can only decrease partition count and may create uneven sizes. Use repartition() before writes requiring even distribution, and coalesce() after filtering when partition count is excessive.",
        codeExample: `# repartition — full shuffle, increases or decreases
df = df.repartition(200)             # Even distribution across 200 partitions
df = df.repartition("date")          # Partition by column for join optimization
df = df.repartition(100, "date")     # Combine count + column

# coalesce — no shuffle, only decreases
df_filtered = df.filter(col("active") == True)
df_small = df_filtered.coalesce(10)  # Reduce from 200 down to 10

# Common pattern: coalesce before writing to avoid small files
df.coalesce(1).write.format("csv").save("/output/single_file/")`,
        keyPoints: [
          "repartition: full shuffle, even distribution",
          "coalesce: no shuffle, merges existing partitions",
          "repartition for increasing or even distribution",
          "coalesce for reducing partitions efficiently",
        ],
      },
      {
        id: 53,
        question: "How do you implement data quality checks in PySpark?",
        answer:
          "Data quality checks in PySpark include: null/duplicate validation with filter/groupBy, schema validation with StructType, range checks with where(), referential integrity with anti-joins, and statistical checks (mean, stddev). On Databricks, DLT Expectations provide declarative quality rules. For production pipelines, implement quality gates that quarantine bad records rather than failing entirely.",
        codeExample: `# Check for nulls
null_counts = df.select([
  sum(col(c).isNull().cast("int")).alias(c)
  for c in df.columns
])

# Check for duplicates
dupes = df.groupBy("id").count().filter(col("count") > 1)

# DLT Expectations (declarative quality rules)
# @dlt.expect_or_drop("valid_amount", "amount > 0")
# @dlt.expect_or_fail("not_null_id", "id IS NOT NULL")

# Quarantine pattern — good and bad rows
good = df.filter((col("amount") > 0) & col("id").isNotNull())
quarantine = df.filter((col("amount") <= 0) | col("id").isNull())`,
        keyPoints: [
          "Validate nulls, duplicates, ranges, and types",
          "DLT Expectations for declarative quality rules",
          "Quarantine bad records instead of failing pipelines",
          "Statistical checks for anomaly detection",
        ],
      },
      {
        id: 54,
        question: "What are Spark Accumulators and Broadcast Variables?",
        answer:
          "Accumulators are write-only shared variables that workers can add to (e.g., counting errors or tracking metrics during transformations). Broadcast variables are read-only variables efficiently distributed to all workers (e.g., lookup tables, configuration maps). Both reduce data transfer — accumulators aggregate values without collecting to driver, and broadcast avoids sending large data per task.",
        codeExample: `# Accumulator — count bad records
error_count = spark.sparkContext.accumulator(0)

def process_row(row):
    if row["amount"] < 0:
        error_count.add(1)
    return row

df.foreach(process_row)
print(f"Bad records: {error_count.value}")

# Broadcast variable — small lookup table
country_codes = {"US": "United States", "UK": "United Kingdom"}
bc_codes = spark.sparkContext.broadcast(country_codes)

@udf(StringType())
def lookup_country(code):
    return bc_codes.value.get(code, "Unknown")`,
        keyPoints: [
          "Accumulators: write-only counters/aggregators",
          "Broadcast: read-only lookup data sent to workers",
          "Accumulators only reliable inside actions",
          "broadcast() used automatically for small join tables",
        ],
      },
      {
        id: 55,
        question: "How do you handle late-arriving data in streaming PySpark?",
        answer:
          "Watermarks define how long to wait for late data before considering a window final. Set watermarks on event-time columns with withWatermark() — data arriving after the watermark threshold is dropped. For append mode, state older than the watermark is cleaned up. Choose watermark duration based on acceptable lateness vs. memory/state growth trade-offs.",
        codeExample: `from pyspark.sql.functions import window

# Define watermark — accept data up to 10 minutes late
stream_df = spark.readStream.format("delta").load("/events") \\
  .withWatermark("event_time", "10 minutes")

# Windowed aggregation with watermark
result = stream_df \\
  .groupBy(
    window("event_time", "5 minutes"),
    "category"
  ) \\
  .agg(count("*").alias("event_count"))

# Write — append mode only emits finalized windows
result.writeStream \\
  .format("delta") \\
  .outputMode("append") \\
  .start("/output/windowed_counts")`,
        keyPoints: [
          "Watermarks define maximum acceptable lateness",
          "Data beyond watermark threshold is dropped",
          "Enables state cleanup for bounded memory usage",
          "Balance lateness tolerance vs. resource consumption",
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
      {
        id: 56,
        question: "What are Common Table Expressions (CTEs) and when should you use them?",
        answer:
          "CTEs (WITH clauses) define temporary named result sets within a query, improving readability and enabling recursive queries. Use CTEs to break complex queries into logical steps, reference the same subquery multiple times, or write recursive hierarchy traversals. In Databricks SQL, CTEs are optimized by Catalyst and don't persist data between statements.",
        codeExample: `-- Multi-step CTE for readability
WITH daily_sales AS (
  SELECT date, region, SUM(amount) AS total
  FROM orders GROUP BY date, region
),
ranked AS (
  SELECT *, RANK() OVER (PARTITION BY date ORDER BY total DESC) AS rk
  FROM daily_sales
)
SELECT * FROM ranked WHERE rk <= 3;

-- Recursive CTE for org hierarchy
WITH RECURSIVE org_tree AS (
  SELECT id, name, manager_id, 1 AS level
  FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, e.manager_id, t.level + 1
  FROM employees e JOIN org_tree t ON e.manager_id = t.id
)
SELECT * FROM org_tree ORDER BY level;`,
        keyPoints: [
          "WITH clause for named temporary result sets",
          "Improves query readability and maintainability",
          "Supports recursive queries for hierarchical data",
          "Optimized by Catalyst — no intermediate materialization",
        ],
      },
      {
        id: 57,
        question: "How do you use PIVOT and UNPIVOT in Databricks SQL?",
        answer:
          "PIVOT rotates rows into columns (wide format) — aggregate values for each pivot column value. UNPIVOT rotates columns into rows (long format) — useful for normalizing denormalized data. Both are common in reporting and BI transformations. PIVOT requires an aggregate function, while UNPIVOT creates name-value pairs from column sets.",
        codeExample: `-- PIVOT: rows to columns
SELECT * FROM monthly_sales
PIVOT (
  SUM(revenue) FOR month IN ('Jan', 'Feb', 'Mar', 'Apr')
);

-- UNPIVOT: columns to rows
SELECT * FROM quarterly_report
UNPIVOT (
  value FOR quarter IN (Q1, Q2, Q3, Q4)
);

-- PySpark equivalent
df.groupBy("region").pivot("month").sum("revenue")`,
        keyPoints: [
          "PIVOT transforms rows into columns with aggregation",
          "UNPIVOT normalizes columns back into rows",
          "PIVOT requires an aggregate function (SUM, COUNT, etc.)",
          "Common in reporting and BI data preparation",
        ],
      },
      {
        id: 58,
        question: "What are Materialized Views in Databricks?",
        answer:
          "Materialized Views (MVs) pre-compute and store query results, refreshing automatically when underlying data changes. Unlike regular views (computed on each query), MVs provide faster BI query performance. In Databricks, MVs are managed by Lakeflow Declarative Pipelines (DLT) and support incremental refresh. They're ideal for expensive aggregations serving dashboards.",
        codeExample: `-- Create a materialized view in DLT
CREATE OR REFRESH MATERIALIZED VIEW gold_sales_summary AS
SELECT
  region,
  product_category,
  DATE_TRUNC('month', order_date) AS month,
  SUM(amount) AS total_revenue,
  COUNT(DISTINCT customer_id) AS unique_customers
FROM silver_orders
GROUP BY region, product_category, DATE_TRUNC('month', order_date);

-- Regular view for comparison (computed each time)
CREATE VIEW v_sales_summary AS
SELECT region, SUM(amount) FROM orders GROUP BY region;`,
        keyPoints: [
          "Pre-computed results for faster queries",
          "Automatic incremental refresh on data change",
          "Managed by Lakeflow Declarative Pipelines (DLT)",
          "Ideal for dashboards with expensive aggregations",
        ],
      },
      {
        id: 59,
        question: "How do you create and use SQL User-Defined Functions in Databricks?",
        answer:
          "Databricks SQL supports scalar UDFs (return one value), table UDFs (return a table), and Python UDFs registered for SQL use. SQL UDFs defined with CREATE FUNCTION are stored in Unity Catalog and reusable across queries and notebooks. For performance, prefer built-in functions; use UDFs only for custom logic not available natively.",
        codeExample: `-- Scalar SQL UDF
CREATE OR REPLACE FUNCTION mask_email(email STRING)
RETURNS STRING
RETURN CONCAT(LEFT(email, 2), '***@', SPLIT(email, '@')[1]);

-- Use it
SELECT mask_email(email) AS masked FROM customers;

-- Table-valued function
CREATE OR REPLACE FUNCTION date_range(start_date DATE, end_date DATE)
RETURNS TABLE (dt DATE)
RETURN SELECT explode(sequence(start_date, end_date)) AS dt;

SELECT * FROM date_range('2024-01-01', '2024-01-31');`,
        keyPoints: [
          "Scalar UDFs return a single value per row",
          "Table UDFs return result sets",
          "Stored in Unity Catalog for governance",
          "Prefer built-in functions for performance",
        ],
      },
      {
        id: 60,
        question: "What is the QUALIFY clause in Databricks SQL?",
        answer:
          "QUALIFY filters rows based on window function results, similar to how HAVING filters GROUP BY results. It eliminates the need for subqueries or CTEs when filtering by ROW_NUMBER(), RANK(), or other window functions. This makes deduplication and top-N queries much cleaner. QUALIFY is evaluated after window functions in the SQL execution order.",
        codeExample: `-- Deduplicate: keep latest record per customer
SELECT * FROM raw_customers
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY customer_id ORDER BY updated_at DESC
) = 1;

-- Without QUALIFY (traditional approach — more verbose)
SELECT * FROM (
  SELECT *, ROW_NUMBER() OVER (
    PARTITION BY customer_id ORDER BY updated_at DESC
  ) AS rn FROM raw_customers
) WHERE rn = 1;

-- Top-3 products per category
SELECT * FROM products
QUALIFY RANK() OVER (PARTITION BY category ORDER BY sales DESC) <= 3;`,
        keyPoints: [
          "Filters rows after window function evaluation",
          "Eliminates need for subquery wrappers",
          "Ideal for deduplication (ROW_NUMBER = 1)",
          "Cleaner syntax than CTE-based approaches",
        ],
      },
      {
        id: 61,
        question: "How do you use MERGE INTO for incremental data loading?",
        answer:
          "MERGE INTO is the standard pattern for incremental loading in lakehouse pipelines. It matches incoming records against the target table on a key, then applies INSERT for new records, UPDATE for changed records, and optionally DELETE for removed records. Combined with Auto Loader or CDF upstream, it enables efficient incremental ETL without full table scans.",
        codeExample: `-- Incremental load from bronze to silver
MERGE INTO silver.orders AS target
USING (
  SELECT * FROM bronze.orders
  WHERE _ingestion_date = current_date()
) AS source
ON target.order_id = source.order_id
WHEN MATCHED AND source.updated_at > target.updated_at THEN
  UPDATE SET *
WHEN NOT MATCHED THEN
  INSERT *
WHEN NOT MATCHED BY SOURCE AND target.order_date < current_date() - 365 THEN
  DELETE;`,
        keyPoints: [
          "Single statement for INSERT + UPDATE + DELETE",
          "Use with Auto Loader for incremental file ingestion",
          "NOT MATCHED BY SOURCE handles deletes from source",
          "Efficient — only processes changed/new records",
        ],
      },
      {
        id: 62,
        question: "What are Dynamic Views in Unity Catalog?",
        answer:
          "Dynamic Views apply row-level and column-level security based on the querying user's identity and group membership. Unlike static views, dynamic views use functions like current_user(), is_member(), and CASE statements to mask or filter data per user. This enables fine-grained access control without creating separate tables or views per team.",
        codeExample: `-- Column masking based on group membership
CREATE VIEW secure_customers AS
SELECT
  customer_id,
  name,
  CASE WHEN is_member('pii_readers')
    THEN email ELSE '***MASKED***'
  END AS email,
  CASE WHEN is_member('finance')
    THEN credit_card ELSE 'XXXX-XXXX-XXXX-' || RIGHT(credit_card, 4)
  END AS credit_card
FROM raw_customers;

-- Row-level filtering
CREATE VIEW regional_orders AS
SELECT * FROM orders
WHERE region = CASE
  WHEN is_member('apac_team') THEN 'APAC'
  WHEN is_member('emea_team') THEN 'EMEA'
  ELSE region  -- admins see all
END;`,
        keyPoints: [
          "Row-level security via WHERE + current_user()/is_member()",
          "Column masking with CASE expressions",
          "Enforced at query time — no data duplication",
          "Managed through Unity Catalog governance",
        ],
      },
      {
        id: 63,
        question: "How do you optimize query performance with file statistics and data skipping?",
        answer:
          "Delta Lake collects file-level min/max statistics for the first 32 columns, enabling data skipping — the engine reads only files whose statistics overlap with query predicates. Optimize data skipping by: clustering or Z-ordering on filter columns, ordering columns by cardinality, keeping key filter columns in the first 32, and using OPTIMIZE to compact files with better statistics.",
        codeExample: `-- Check table statistics
DESCRIBE DETAIL my_table;  -- file count, size, partitions

-- Analyze table for cost-based optimization
ANALYZE TABLE my_table COMPUTE STATISTICS FOR ALL COLUMNS;

-- Optimize with Z-order for multi-column queries
OPTIMIZE my_table ZORDER BY (customer_id, order_date);

-- Or use liquid clustering (preferred for new tables)
ALTER TABLE my_table CLUSTER BY (customer_id, order_date);

-- Verify data skipping is working
SET spark.databricks.delta.stats.skipping = true;
-- Then check "files pruned" in query explain plan`,
        keyPoints: [
          "Min/max file statistics enable data skipping",
          "Only first 32 columns have statistics by default",
          "Z-ORDER or liquid clustering improves pruning",
          "ANALYZE TABLE updates column-level statistics",
        ],
      },
      {
        id: 64,
        question: "What is the difference between TEMP VIEW, VIEW, and TABLE?",
        answer:
          "A TABLE stores data physically in Delta files. A VIEW is a saved query that executes on read — no data stored, always current. A TEMP VIEW exists only for the Spark session duration and is not registered in the metastore. Views are ideal for abstractions and security layers; tables for materialized, frequently-queried data; temp views for intermediate pipeline steps.",
        codeExample: `-- Persistent table (data stored on disk)
CREATE TABLE gold.daily_kpis AS SELECT ...;

-- Persistent view (query stored in metastore, no data)
CREATE VIEW analytics.v_daily_kpis AS
SELECT * FROM gold.daily_kpis WHERE date >= current_date() - 90;

-- Temporary view (session-scoped, not in metastore)
CREATE OR REPLACE TEMP VIEW staging_data AS
SELECT * FROM raw_data WHERE valid = true;

-- Global temp view (shared across notebooks in same cluster)
CREATE GLOBAL TEMP VIEW shared_lookup AS
SELECT * FROM reference_data;
-- Access as: SELECT * FROM global_temp.shared_lookup;`,
        keyPoints: [
          "TABLE: physical data, persisted, queryable by all",
          "VIEW: saved query, no data, always reflects source",
          "TEMP VIEW: session-scoped, not in metastore",
          "GLOBAL TEMP VIEW: shared across notebooks on same cluster",
        ],
      },
      {
        id: 65,
        question: "How do you implement data deduplication in Databricks SQL?",
        answer:
          "Deduplication uses ROW_NUMBER() with QUALIFY (or a subquery) to keep one record per key. For streaming deduplication, use dropDuplicatesWithinWatermark() or MERGE-based dedup. Choose dedup columns (business key), sort columns (recency preference), and decide whether to deduplicate at ingest (bronze→silver) or on read. Delta MERGE is best for ongoing incremental deduplication.",
        codeExample: `-- Best: QUALIFY for clean dedup
SELECT * FROM raw_events
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY event_id
  ORDER BY received_at DESC
) = 1;

-- MERGE-based ongoing dedup (bronze to silver)
MERGE INTO silver.events AS t
USING (
  SELECT * FROM bronze.events
  QUALIFY ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY received_at DESC) = 1
) AS s
ON t.event_id = s.event_id
WHEN NOT MATCHED THEN INSERT *;

-- Streaming dedup
stream_df.dropDuplicatesWithinWatermark(["event_id"])`,
        keyPoints: [
          "ROW_NUMBER + QUALIFY for batch deduplication",
          "MERGE INTO for incremental ongoing dedup",
          "dropDuplicatesWithinWatermark for streaming",
          "Deduplicate at bronze→silver transition",
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
      {
        id: 66,
        question: "How do you set up Model Serving endpoints in Databricks?",
        answer:
          "Model Serving provides real-time REST API endpoints for registered models in Unity Catalog. It supports autoscaling (including scale-to-zero), GPU serving, and A/B traffic routing between model versions. You register a model, create a serving endpoint, configure compute size and scaling, and get an auto-generated REST URL. Supports both custom MLflow models and Foundation Model APIs.",
        codeExample: `# Serve a model via API
import mlflow
from databricks.sdk import WorkspaceClient

w = WorkspaceClient()

# Create serving endpoint
w.serving_endpoints.create(
    name="fraud-detector-v2",
    config={
        "served_models": [{
            "model_name": "fraud_model",
            "model_version": "3",
            "workload_size": "Small",
            "scale_to_zero_enabled": True
        }]
    }
)

# Query the endpoint
import requests
response = requests.post(
    f"{workspace_url}/serving-endpoints/fraud-detector-v2/invocations",
    headers={"Authorization": f"Bearer {token}"},
    json={"inputs": [{"feature1": 1.0, "feature2": "value"}]}
)`,
        keyPoints: [
          "Auto-generated REST API for registered models",
          "Scale-to-zero saves costs during idle periods",
          "A/B traffic splitting between model versions",
          "Supports custom models and Foundation Model APIs",
        ],
      },
      {
        id: 67,
        question: "How does MLflow Experiment Tracking work in Databricks?",
        answer:
          "MLflow auto-logs parameters, metrics, and artifacts for each training run in an Experiment. Databricks enhances this with autologging (automatically captures framework-specific metrics), notebook revision tracking, cluster info capture, and Unity Catalog integration. Use mlflow.start_run() to group runs, log with mlflow.log_params/metrics/artifacts, and compare runs in the Experiments UI.",
        codeExample: `import mlflow
from sklearn.ensemble import RandomForestClassifier

# Enable autologging for sklearn
mlflow.sklearn.autolog()

# Start tracked experiment
mlflow.set_experiment("/Users/me/fraud-detection")

with mlflow.start_run(run_name="rf-baseline"):
    # These are auto-logged by autolog:
    model = RandomForestClassifier(n_estimators=100, max_depth=10)
    model.fit(X_train, y_train)
    
    # Custom metrics
    mlflow.log_metric("custom_f1", 0.94)
    mlflow.log_param("data_version", "2024-03")
    
    # Log artifacts
    mlflow.log_artifact("feature_importance.png")
    
    # Compare runs in the UI or programmatically
    runs = mlflow.search_runs(order_by=["metrics.f1_score DESC"])`,
        keyPoints: [
          "Autologging captures metrics without explicit code",
          "Tracks parameters, metrics, artifacts, and code version",
          "Experiment UI for comparing runs side by side",
          "Integrates with Unity Catalog for model governance",
        ],
      },
      {
        id: 68,
        question: "What is the Models in Unity Catalog approach?",
        answer:
          "Models in Unity Catalog (UC) replaces the legacy Workspace Model Registry. Models are registered as three-level namespace objects (catalog.schema.model_name) with full governance — ACLs, lineage, tagging, and cross-workspace sharing. Promotion between stages (dev → staging → prod) is done via aliases instead of the old stage concept. This provides centralized model governance across the organization.",
        codeExample: `import mlflow
mlflow.set_registry_uri("databricks-uc")

# Register model to Unity Catalog
with mlflow.start_run():
    mlflow.sklearn.log_model(model, "model",
        registered_model_name="prod_catalog.ml.fraud_detector"
    )

# Set alias for promotion
from mlflow import MlflowClient
client = MlflowClient()
client.set_registered_model_alias(
    name="prod_catalog.ml.fraud_detector",
    alias="champion",
    version=3
)

# Load model by alias (in serving or batch)
model = mlflow.pyfunc.load_model(
    "models:/prod_catalog.ml.fraud_detector@champion"
)`,
        keyPoints: [
          "Three-level namespace: catalog.schema.model",
          "Aliases replace stages (champion, challenger, etc.)",
          "Full Unity Catalog governance — ACLs, lineage, audit",
          "Cross-workspace model sharing and discovery",
        ],
      },
      {
        id: 69,
        question: "How do you implement model monitoring and drift detection?",
        answer:
          "Databricks Lakehouse Monitoring creates monitor profiles on inference tables to detect data drift (input distribution shifts), prediction drift (output distribution changes), and model quality degradation (accuracy decline). It generates dashboard tables with statistical tests (KS test, Chi-squared) and integrates with alerts. Monitor both the input features and prediction outputs continuously.",
        codeExample: `from databricks.sdk import WorkspaceClient

w = WorkspaceClient()

# Create a monitor on the inference table
w.quality_monitors.create(
    table_name="prod_catalog.ml.fraud_predictions",
    inference_log={
        "model_id_col": "model_version",
        "prediction_col": "prediction",
        "label_col": "actual_label",  # if available
        "timestamp_col": "prediction_time",
        "problem_type": "CLASSIFICATION"
    },
    schedule={"quartz_cron_expression": "0 0 * * * ?"},  # hourly
    slicing_exprs=["region", "customer_segment"]
)

# Results written to:
# {table_name}_profile_metrics — drift stats
# {table_name}_drift_metrics — statistical tests`,
        keyPoints: [
          "Monitors inference tables for drift and quality",
          "KS test and Chi-squared for statistical drift detection",
          "Slicing by dimensions for granular monitoring",
          "Automated alerts on drift threshold violations",
        ],
      },
      {
        id: 70,
        question: "What is Databricks AutoML and when should you use it?",
        answer:
          "AutoML automatically trains and tunes models using multiple algorithms (XGBoost, LightGBM, sklearn) on your dataset. It generates a complete notebook for each trial with all preprocessing, feature engineering, and hyperparameter choices — so it's transparent, not a black box. Use AutoML for baselines, POCs, or when non-ML experts need to build models. It supports classification, regression, and forecasting.",
        codeExample: `from databricks import automl

# Run AutoML classification
summary = automl.classify(
    dataset=train_df,
    target_col="is_fraud",
    primary_metric="f1",
    timeout_minutes=30,
    max_trials=20
)

# Access best model
print(f"Best trial: {summary.best_trial}")
print(f"Metrics: {summary.best_trial.metrics}")

# Best trial notebook is auto-generated
# View it: summary.best_trial.notebook_url

# Load the best model
import mlflow
best_model = mlflow.pyfunc.load_model(
    summary.best_trial.model_path
)`,
        keyPoints: [
          "Automated model selection and hyperparameter tuning",
          "Generates transparent notebooks — not a black box",
          "Supports classification, regression, and forecasting",
          "Great for baselines and rapid prototyping",
        ],
      },
      {
        id: 71,
        question: "How do you use MLflow Model Signatures?",
        answer:
          "Model signatures define the expected input and output schema of an MLflow model. They enable input validation at serving time, documentation, and schema enforcement. Signatures are inferred automatically with autologging or specified manually. Without a signature, the serving endpoint won't validate inputs — leading to cryptic errors in production. Always include signatures for production models.",
        codeExample: `import mlflow
from mlflow.models.signature import ModelSignature
from mlflow.types.schema import Schema, ColSpec

# Infer signature from data
from mlflow.models import infer_signature
signature = infer_signature(X_train, model.predict(X_train))

# Or define explicitly
input_schema = Schema([
    ColSpec("double", "amount"),
    ColSpec("string", "merchant_category"),
    ColSpec("long", "customer_age"),
])
output_schema = Schema([ColSpec("double", "fraud_probability")])
signature = ModelSignature(inputs=input_schema, outputs=output_schema)

# Log with signature
mlflow.sklearn.log_model(
    model, "model", signature=signature,
    registered_model_name="catalog.schema.fraud_model"
)`,
        keyPoints: [
          "Defines expected input/output schema for models",
          "Enables input validation at serving time",
          "Inferred automatically with autologging or infer_signature()",
          "Essential for production model reliability",
        ],
      },
      {
        id: 72,
        question: "What are MLflow Webhooks and how do you use them?",
        answer:
          "MLflow Webhooks trigger automated actions on model registry events — model creation, version transitions, approval requests. Use them to integrate ML workflows with CI/CD pipelines, Slack notifications, or automated testing. Common patterns: trigger validation tests on new model version, notify team on promotion, or auto-deploy champion models. Configure via REST API or SDK.",
        codeExample: `from databricks.sdk import WorkspaceClient

w = WorkspaceClient()

# Webhook on new model version
w.model_registry.create_webhook(
    model_name="prod_catalog.ml.fraud_detector",
    events=["MODEL_VERSION_CREATED"],
    http_url_spec={
        "url": "https://ci-cd.company.com/ml-pipeline/trigger",
        "enable_ssl_verification": True
    },
    description="Trigger validation pipeline on new version"
)

# Webhook for Slack notification
w.model_registry.create_webhook(
    events=["TRANSITION_REQUEST_CREATED"],
    http_url_spec={
        "url": "https://hooks.slack.com/services/...",
    },
    description="Notify ML team on promotion request"
)`,
        keyPoints: [
          "Trigger actions on model registry events",
          "Integrate ML lifecycle with CI/CD pipelines",
          "Support HTTP endpoints for custom integrations",
          "Common for promotion notifications and auto-testing",
        ],
      },
      {
        id: 73,
        question: "How do you implement hyperparameter tuning at scale in Databricks?",
        answer:
          "Use Hyperopt with SparkTrials to distribute hyperparameter search across a cluster. Hyperopt implements Bayesian optimization (Tree of Parzen Estimators — TPE) which is smarter than grid search. SparkTrials parallelizes trials across workers. MLflow auto-logs each trial. For deep learning, use Optuna or Ray Tune. Set max_evals, define search space, and let the optimizer converge.",
        codeExample: `from hyperopt import fmin, tpe, hp, SparkTrials, STATUS_OK
import mlflow

def objective(params):
    with mlflow.start_run(nested=True):
        model = XGBClassifier(
            max_depth=int(params["max_depth"]),
            learning_rate=params["lr"],
            n_estimators=int(params["n_estimators"])
        )
        model.fit(X_train, y_train)
        f1 = f1_score(y_test, model.predict(X_test))
        mlflow.log_metric("f1", f1)
        return {"loss": -f1, "status": STATUS_OK}

search_space = {
    "max_depth": hp.quniform("max_depth", 3, 15, 1),
    "lr": hp.loguniform("lr", -5, 0),
    "n_estimators": hp.quniform("n_estimators", 50, 500, 50)
}

with mlflow.start_run():
    best = fmin(fn=objective, space=search_space,
        algo=tpe.suggest, max_evals=100,
        trials=SparkTrials(parallelism=8))`,
        keyPoints: [
          "Hyperopt TPE for Bayesian optimization",
          "SparkTrials distributes across cluster workers",
          "MLflow auto-logs each trial for comparison",
          "More efficient than grid search for large spaces",
        ],
      },
      {
        id: 74,
        question: "What are Inference Tables and why are they important?",
        answer:
          "Inference Tables automatically log all requests and responses from Model Serving endpoints into a Delta table. They capture input features, predictions, timestamps, latency, and model version — forming the foundation for monitoring, debugging, A/B analysis, and retraining pipelines. Enable them on any serving endpoint to build a complete audit trail of production predictions.",
        codeExample: `# Enable inference table on endpoint creation
w.serving_endpoints.create(
    name="fraud-detector",
    config={
        "served_models": [{
            "model_name": "catalog.ml.fraud_model",
            "model_version": "5",
            "workload_size": "Small",
        }],
        "auto_capture_config": {
            "catalog_name": "prod_catalog",
            "schema_name": "ml_monitoring",
            "table_name_prefix": "fraud_detector"
        }
    }
)

# Query logged predictions
SELECT
  request_time, model_version,
  request_payload, response_payload, execution_time_ms
FROM prod_catalog.ml_monitoring.fraud_detector_payload
WHERE request_time >= current_date() - 7;`,
        keyPoints: [
          "Automatic logging of all serving requests/responses",
          "Foundation for model monitoring and drift detection",
          "Stored as Delta tables for easy analysis",
          "Enables retraining pipelines from production data",
        ],
      },
      {
        id: 75,
        question: "How do you manage the ML lifecycle from development to production?",
        answer:
          "The recommended Databricks ML lifecycle: (1) Develop in a dev workspace with experiments, (2) Register model to Unity Catalog, (3) Set 'challenger' alias and run validation tests, (4) Promote to 'champion' alias after approval, (5) Serving endpoint references @champion alias — no code change needed. Use Databricks Asset Bundles (DABs) for CI/CD of ML code, and Lakehouse Monitoring for production observability.",
        codeExample: `# 1. Develop & train
mlflow.set_experiment("/dev/fraud-detection")
with mlflow.start_run():
    model.fit(X_train, y_train)
    mlflow.sklearn.log_model(model, "model",
        registered_model_name="prod.ml.fraud_model")

# 2. Promote through aliases
client = MlflowClient()
client.set_registered_model_alias(
    "prod.ml.fraud_model", "challenger", version=4)

# 3. Run validation (CI/CD pipeline)
challenger = mlflow.pyfunc.load_model(
    "models:/prod.ml.fraud_model@challenger")
assert f1_score(y_test, challenger.predict(X_test)) > 0.9

# 4. Promote to champion
client.set_registered_model_alias(
    "prod.ml.fraud_model", "champion", version=4)

# Serving endpoint auto-picks up @champion — zero downtime`,
        keyPoints: [
          "Unity Catalog aliases for stage promotion",
          "CI/CD validation before production promotion",
          "Serving endpoints reference aliases — no redeploy needed",
          "Lakehouse Monitoring for ongoing observability",
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
      {
        id: 76,
        question: "What is the Medallion (multi-hop) architecture and how do you implement it?",
        answer:
          "The Medallion architecture organizes data into Bronze (raw ingestion), Silver (cleansed, validated), and Gold (business-aggregated) layers. Bronze preserves raw data as-is for auditability. Silver applies schema enforcement, deduplication, and quality rules. Gold provides business-ready aggregations and dimensional models. Implement with DLT pipelines or structured streaming between Delta tables.",
        codeExample: `-- Bronze: raw ingestion (append-only)
CREATE OR REFRESH STREAMING TABLE bronze_orders
AS SELECT *, current_timestamp() AS ingested_at,
   input_file_name() AS source_file
FROM cloud_files("/data/orders/", "json",
  map("cloudFiles.inferColumnTypes", "true"));

-- Silver: cleansed and validated
CREATE OR REFRESH STREAMING TABLE silver_orders (
  CONSTRAINT valid_amount EXPECT (amount > 0) ON VIOLATION DROP ROW,
  CONSTRAINT valid_email EXPECT (email IS NOT NULL)
)
AS SELECT *, current_timestamp() AS processed_at
FROM STREAM(LIVE.bronze_orders)
QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ingested_at DESC) = 1;

-- Gold: business aggregation
CREATE OR REFRESH MATERIALIZED VIEW gold_daily_revenue AS
SELECT date_trunc('day', order_date) AS day, region,
       SUM(amount) AS revenue, COUNT(*) AS order_count
FROM LIVE.silver_orders GROUP BY ALL;`,
        keyPoints: [
          "Bronze: raw, append-only, preserves source fidelity",
          "Silver: cleansed, deduplicated, schema-enforced",
          "Gold: business aggregations and dimensional models",
          "DLT automates the pipeline between layers",
        ],
      },
      {
        id: 77,
        question: "How do you design DLT (Lakeflow Declarative Pipelines) for production?",
        answer:
          "Design DLT pipelines by declaring tables as SQL/Python definitions with expectations (data quality rules). DLT handles orchestration, checkpointing, error handling, and infrastructure. Key design decisions: use STREAMING TABLE for incremental sources, MATERIALIZED VIEW for aggregations, set expectations with ON VIOLATION actions (DROP ROW, FAIL UPDATE), and organize with a clear Bronze→Silver→Gold flow.",
        codeExample: `import dlt
from pyspark.sql.functions import *

@dlt.table(comment="Raw clickstream from Kafka")
@dlt.expect_or_drop("valid_timestamp", "event_time IS NOT NULL")
def bronze_clicks():
    return (spark.readStream
        .format("kafka")
        .option("subscribe", "clickstream")
        .load()
        .select(from_json(col("value").cast("string"), schema).alias("data"))
        .select("data.*"))

@dlt.table(comment="Sessionized click data")
@dlt.expect_all_or_drop({
    "valid_user": "user_id IS NOT NULL",
    "valid_page": "page_url IS NOT NULL"
})
def silver_sessions():
    return (dlt.read_stream("bronze_clicks")
        .withWatermark("event_time", "1 hour")
        .groupBy(session_window("event_time", "30 minutes"), "user_id")
        .agg(collect_list("page_url").alias("pages"),
             count("*").alias("clicks")))`,
        keyPoints: [
          "Declarative — define WHAT, DLT handles HOW",
          "Expectations enforce data quality with configurable actions",
          "STREAMING TABLE for incremental, MATERIALIZED VIEW for batch",
          "Automatic checkpointing, retry, and error recovery",
        ],
      },
      {
        id: 78,
        question: "How do you implement data mesh principles on Databricks?",
        answer:
          "Data Mesh on Databricks uses Unity Catalog's three-level namespace (catalog.schema.table) to implement domain ownership. Each domain team owns a catalog, manages their own pipelines, and publishes governed data products. UC provides cross-domain discovery, access control, and lineage. Shares enable cross-account/cross-cloud data distribution without copying. The platform team manages UC, while domain teams own their data.",
        codeExample: `-- Domain team setup (e.g., Finance domain)
CREATE CATALOG finance_domain;
CREATE SCHEMA finance_domain.gold;

-- Domain owns their pipeline Bronze->Silver->Gold
-- and publishes Gold as the data product

-- Make data product discoverable
ALTER TABLE finance_domain.gold.revenue_report
SET TAGS ('data_product' = 'true', 'owner' = 'finance-team',
          'sla' = '99.5%', 'refresh' = 'hourly');

COMMENT ON TABLE finance_domain.gold.revenue_report IS
'Daily revenue by region. Refreshed hourly. Contact: finance-data@company.com';

-- Cross-domain access via grants
GRANT SELECT ON TABLE finance_domain.gold.revenue_report
TO \`analytics-team\`;

-- Delta Sharing for external consumers
CREATE SHARE finance_data_products;
ALTER SHARE finance_data_products ADD TABLE finance_domain.gold.revenue_report;`,
        keyPoints: [
          "Each domain owns a catalog (domain-oriented ownership)",
          "Unity Catalog for governance, discovery, and lineage",
          "Delta Sharing for cross-org data distribution",
          "Domain teams build pipelines; platform team manages infrastructure",
        ],
      },
      {
        id: 79,
        question: "What disaster recovery strategies exist for Databricks workspaces?",
        answer:
          "DR strategies depend on RPO/RTO requirements. Passive DR: replicate Delta tables and configs to a standby region using Deep Clone and Terraform/DABs. Active-Active: run parallel workspaces in two regions with bidirectional Delta Sharing. Key components to replicate: Unity Catalog metastore (Terraform), Delta tables (Deep Clone/COPY INTO), notebooks/repos (Git), jobs/workflows (DABs), secrets (Terraform). Test failover regularly.",
        codeExample: `-- Replicate Delta tables to DR region
-- Deep Clone for full replication
CREATE TABLE dr_catalog.schema.orders
DEEP CLONE prod_catalog.schema.orders
LOCATION 's3://dr-bucket/orders/';

-- Incremental sync (daily job)
CREATE OR REPLACE TABLE dr_catalog.schema.orders
DEEP CLONE prod_catalog.schema.orders;

-- Terraform for workspace config
# terraform/dr.tf
resource "databricks_workspace" "dr" {
  provider = databricks.dr_region
  # Mirror production config
}

# Use DABs for job/pipeline definitions
# databricks.yml — deploy to both regions
targets:
  prod:
    workspace:
      host: https://prod.cloud.databricks.com
  dr:
    workspace:
      host: https://dr.cloud.databricks.com`,
        keyPoints: [
          "Deep Clone for Delta table replication",
          "Terraform/DABs for infrastructure-as-code DR",
          "Active-passive vs active-active based on RTO needs",
          "Test failover procedures regularly",
        ],
      },
      {
        id: 80,
        question: "How do you implement CI/CD for data pipelines in Databricks?",
        answer:
          "Use Databricks Asset Bundles (DABs) for CI/CD. Define jobs, pipelines, and configs in databricks.yml, store in Git, and deploy via CI (GitHub Actions, Azure DevOps, etc.). The workflow: develop in dev workspace → PR + code review → CI runs tests/linting → deploy to staging → integration tests → deploy to production. Separate compute and data environments per stage.",
        codeExample: `# databricks.yml — Asset Bundle definition
bundle:
  name: revenue-pipeline

resources:
  pipelines:
    revenue_etl:
      name: "Revenue ETL"
      target: "gold"
      libraries:
        - notebook:
            path: ./src/revenue_pipeline.py

  jobs:
    daily_revenue:
      name: "Daily Revenue Job"
      schedule:
        quartz_cron_expression: "0 0 6 * * ?"
      tasks:
        - task_key: run_pipeline
          pipeline_task:
            pipeline_id: \${resources.pipelines.revenue_etl.id}

targets:
  dev:
    workspace: {host: "https://dev.databricks.com"}
  staging:
    workspace: {host: "https://staging.databricks.com"}
  prod:
    workspace: {host: "https://prod.databricks.com"}
    
# CI: databricks bundle deploy -t staging
# CD: databricks bundle deploy -t prod`,
        keyPoints: [
          "DABs define infrastructure as code in YAML",
          "Git-based workflow with PR reviews",
          "Separate targets for dev, staging, production",
          "CI/CD pipelines validate before production deploy",
        ],
      },
      {
        id: 81,
        question: "What is Lakehouse Monitoring and how do you set it up?",
        answer:
          "Lakehouse Monitoring profiles Delta tables for data quality, drift, and statistical properties. Create monitors on any table — it generates metric tables with row counts, null rates, distribution stats, and drift scores. Three profile types: Snapshot (point-in-time), TimeSeries (windowed), and InferenceLog (ML serving). Monitors can trigger alerts via SQL Alerts when thresholds are breached.",
        codeExample: `from databricks.sdk import WorkspaceClient

w = WorkspaceClient()

# Create a time-series monitor
monitor = w.quality_monitors.create(
    table_name="prod.gold.daily_revenue",
    time_series={
        "timestamp_col": "report_date",
        "granularities": ["1 day", "1 week"]
    },
    schedule={"quartz_cron_expression": "0 0 8 * * ?"},
    slicing_exprs=["region", "product_line"],
    output_schema_name="prod.monitoring"
)

-- Query generated metric tables
SELECT column_name, data_type,
       percent_nulls, num_zeros, mean, stddev
FROM prod.monitoring.daily_revenue_profile_metrics
WHERE window_end = current_date();

-- Alert on anomalies
CREATE ALERT revenue_drift_alert AS
SELECT * FROM prod.monitoring.daily_revenue_drift_metrics
WHERE drift_type = 'SIGNIFICANT'
  AND window_end >= current_date() - 1;`,
        keyPoints: [
          "Automatic profiling: nulls, distributions, statistics",
          "Snapshot, TimeSeries, and InferenceLog profile types",
          "Drift detection with statistical significance tests",
          "SQL Alerts for automated threshold notifications",
        ],
      },
      {
        id: 82,
        question: "How do you design a multi-cloud Databricks architecture?",
        answer:
          "Multi-cloud Databricks uses Unity Catalog as the centralized governance layer across AWS, Azure, and GCP workspaces. Share data via Delta Sharing (open protocol, no vendor lock-in). Deploy identical pipelines with DABs targeting different cloud workspaces. Key considerations: data residency/sovereignty, latency between regions, egress costs, and cloud-specific service integrations (S3/ADLS/GCS).",
        codeExample: `# Unity Catalog spans clouds
# Central metastore accessible from all workspaces

# DABs multi-cloud deployment
# databricks.yml
targets:
  aws-prod:
    workspace: {host: "https://aws-workspace.cloud.databricks.com"}
    variables:
      storage_root: "s3://data-lake-aws"
  azure-prod:
    workspace: {host: "https://adb-xxxx.azuredatabricks.net"}
    variables:
      storage_root: "abfss://container@storage.dfs.core.windows.net"
  gcp-prod:
    workspace: {host: "https://xxxx.gcp.databricks.com"}
    variables:
      storage_root: "gs://data-lake-gcp"

# Delta Sharing for cross-cloud data access (no copy)
CREATE SHARE global_customers;
ALTER SHARE global_customers ADD TABLE catalog.schema.customers;
CREATE RECIPIENT azure_workspace
  USING ID 'azure-workspace-sharing-id';
GRANT SELECT ON SHARE global_customers TO RECIPIENT azure_workspace;`,
        keyPoints: [
          "Unity Catalog as cross-cloud governance layer",
          "Delta Sharing for zero-copy cross-cloud data access",
          "DABs for consistent multi-cloud deployments",
          "Consider data residency, latency, and egress costs",
        ],
      },
      {
        id: 83,
        question: "What security best practices should you follow on Databricks?",
        answer:
          "Defense in depth: Unity Catalog for data governance (ACLs, column masking, row filters), private networking (VPC/VNet peering, Private Link, no public IPs), encryption at rest and in transit, secret management (Databricks Secrets, not hardcoded), IP access lists, audit logging enabled, cluster policies restricting configurations, and least-privilege IAM roles. Enable all security features in the account console.",
        codeExample: `-- Column masking with Unity Catalog
ALTER TABLE customers ALTER COLUMN ssn
SET MASK mask_ssn USING COLUMNS (current_user());

CREATE FUNCTION mask_ssn(ssn STRING, invoker STRING)
RETURNS STRING
RETURN CASE WHEN is_member('pii_admin') THEN ssn
            ELSE 'XXX-XX-' || RIGHT(ssn, 4) END;

-- Row-level security
ALTER TABLE orders SET ROW FILTER region_filter ON (region);

CREATE FUNCTION region_filter(region STRING)
RETURNS BOOLEAN
RETURN is_member('all_regions') OR region = current_user_region();

-- Secret management
# databricks secrets create-scope --scope prod-secrets
# databricks secrets put --scope prod-secrets --key api-key
password = dbutils.secrets.get(scope="prod-secrets", key="db-password")

-- Audit logging
SELECT * FROM system.access.audit
WHERE action_name = 'getTable'
  AND request_params.full_name_arg LIKE '%.pii_%';`,
        keyPoints: [
          "Unity Catalog: column masking, row filters, ACLs",
          "Network isolation: Private Link, no public IPs",
          "Secrets API — never hardcode credentials",
          "System tables for audit logging and compliance",
        ],
      },
      {
        id: 84,
        question: "How do you benchmark and tune Spark job performance?",
        answer:
          "Performance tuning workflow: (1) Check Spark UI — identify stage bottlenecks, data skew, spill to disk. (2) Optimize joins — broadcast small tables, salting for skew. (3) Tune partitioning — repartition before wide transformations, coalesce before writes. (4) Enable AQE. (5) Cache strategically. (6) Optimize file layout — OPTIMIZE + Z-ORDER. (7) Right-size cluster — use spot instances + autoscaling.",
        codeExample: `# Check query execution plan
df.explain(mode="formatted")

# Broadcast small dimension tables
from pyspark.sql.functions import broadcast
result = big_df.join(broadcast(small_df), "key")

# Handle data skew with salting
from pyspark.sql.functions import concat, lit, rand
salt_buckets = 10
salted_big = big_df.withColumn("salt", (rand() * salt_buckets).cast("int"))
salted_small = small_df.crossJoin(
    spark.range(salt_buckets).withColumnRenamed("id", "salt"))
result = salted_big.join(salted_small, ["key", "salt"]).drop("salt")

# AQE settings (enabled by default in DBR 12+)
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")`,
        keyPoints: [
          "Spark UI for identifying bottlenecks and skew",
          "Broadcast joins for small tables (< 100MB)",
          "Salting technique for skewed join keys",
          "AQE automatic partition coalescing and skew handling",
        ],
      },
      {
        id: 85,
        question: "What governance patterns does Unity Catalog enable?",
        answer:
          "Unity Catalog provides centralized governance: fine-grained access control (table, column, row), data lineage (table and column level, auto-tracked), data classification and tagging, audit logging via system tables, data quality with Lakehouse Monitoring, and Delta Sharing for secure external sharing. All governed by a single metastore spanning multiple workspaces. Implements the principle of least privilege with granular GRANT/REVOKE.",
        codeExample: `-- Fine-grained access control
GRANT SELECT ON TABLE catalog.schema.table TO \`data-analysts\`;
GRANT SELECT (name, email) ON TABLE catalog.schema.customers TO \`marketing\`;

-- Data classification tags
ALTER TABLE catalog.schema.customers
ALTER COLUMN email SET TAGS ('pii' = 'email', 'sensitivity' = 'high');
ALTER COLUMN phone SET TAGS ('pii' = 'phone', 'sensitivity' = 'high');

-- Query lineage via system tables
SELECT * FROM system.access.table_lineage
WHERE target_table_full_name = 'gold.analytics.revenue';

-- Column-level lineage
SELECT source_column_name, target_column_name
FROM system.access.column_lineage
WHERE target_table_full_name = 'gold.analytics.revenue';

-- Audit: who accessed PII data
SELECT user_identity.email, action_name, request_params
FROM system.access.audit
WHERE request_params.full_name_arg LIKE '%.customers%'
  AND event_date >= current_date() - 30;`,
        keyPoints: [
          "Column-level and row-level access control",
          "Auto-tracked lineage at table and column level",
          "Data classification with tags for PII/sensitivity",
          "System tables for audit, lineage, and compliance",
        ],
      },
    ],
  },
]
