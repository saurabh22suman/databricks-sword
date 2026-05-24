/**
 * @file page.tsx
 * @description Quick Reference Cheat Sheet - Databricks 2025 Syntax
 */

import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Quick Reference | Databricks Sword",
  description: "Quick syntax reference for Databricks 2025 - DLT, Delta Lake, MLflow, Unity Catalog",
}

const sections = [
  {
    title: "DLT Table Types (2025)",
    items: [
      {
        name: "STREAMING TABLE",
        syntax: "CREATE OR REFRESH STREAMING TABLE name AS SELECT ...",
        desc: "Continuously ingests from cloud files (Auto Loader)",
        useCase: "Raw data ingestion from S3/ADLS/GCS",
      },
      {
        name: "MATERIALIZED VIEW",
        syntax: "CREATE OR REFRESH MATERIALIZED VIEW name AS SELECT ...",
        desc: "Pre-computed, refreshed on schedule",
        useCase: "Complex aggregations, historical metrics",
      },
      {
        name: "LIVE TABLE",
        syntax: "CREATE OR REFRESH LIVE TABLE name AS SELECT ...",
        desc: "Real-time updates as source changes",
        useCase: "Latest data, recent activity",
      },
    ],
  },
  {
    title: "Delta Lake",
    items: [
      {
        name: "MERGE",
        syntax: "MERGE INTO table USING source WHEN MATCHED THEN UPDATE ...",
        desc: "Upsert/update/delete in one operation",
      },
      {
        name: "OPTIMIZE",
        syntax: "OPTIMIZE table [WHERE partition = 'x'] [ZORDER BY col]",
        desc: "Compact small files, optional Z-order for faster queries",
      },
      {
        name: "VACUUM",
        syntax: "VACUUM table [RETAIN <n> HOURS]",
        desc: "Remove orphaned files, default retention 168 hours",
      },
      {
        name: "LIQUID CLUSTERING",
        syntax: "ALTER TABLE t CLUSTER BY (col1, col2)",
        desc: "Replace partitioning for high-cardinality columns",
      },
      {
        name: "CHANGE DATA FEED",
        syntax: "tblproperties delta.enableChangeDataFeed = true",
        desc: "Track row-level changes (inserts, updates, deletes)",
      },
    ],
  },
  {
    title: "Unity Catalog",
    items: [
      {
        name: "Namespace",
        syntax: "catalog.schema.table",
        desc: "Three-level hierarchy",
      },
      {
        name: "Row Filter",
        syntax: "CREATE POLICY name ON table ROW FILTER TO users EXCEPT group WHERE predicate",
        desc: "Filter rows based on user/group",
      },
      {
        name: "Column Mask",
        syntax: "CREATE POLICY name ON table COLUMN MASK col TO users EXCEPT group AS expr",
        desc: "Mask sensitive columns (SSN, salary)",
      },
      {
        name: "Lineage",
        syntax: "SELECT * FROM system.access.table_lineage WHERE ...",
        desc: "Track upstream/downstream dependencies",
      },
    ],
  },
  {
    title: "MLflow",
    items: [
      {
        name: "Autolog",
        syntax: "mlflow.sklearn.autolog()",
        desc: "Auto-log parameters, metrics, models",
      },
      {
        name: "Register Model",
        syntax: "mlflow.register_model('models:/name@staging', 'catalog.schema.model')",
        desc: "Register to Unity Catalog",
      },
      {
        name: "Load Model",
        syntax: "mlflow.spark.load_model('models:/path')",
        desc: "Load model for inference",
      },
    ],
  },
  {
    title: "Structured Streaming",
    items: [
      {
        name: "Watermark",
        syntax: ".withWatermark('event_time', '10 minutes')",
        desc: "Handle late data, minimize state",
      },
      {
        name: "Trigger",
        syntax: ".trigger(availableNow=True)",
        desc: "Process once and exit vs continuous",
      },
      {
        name: "ForeachBatch",
        syntax: ".foreachBatch(df => df.write(...))",
        desc: "Run arbitrary code on micro-batch",
      },
      {
        name: "Auto Loader",
        syntax: "spark.readStream.format('cloudFiles').option('path', 's3://...')",
        desc: "Ingest from cloud storage incrementally",
      },
    ],
  },
]

export default function CheatSheetPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-anime-950 cyber-grid pt-20 pb-20">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl font-bold text-anime-accent mb-2">
            Quick Reference
          </h1>
          <p className="text-anime-200 text-sm">
            Databricks 2025 syntax • Last verified: May 2025
          </p>
        </div>

        {/* Sections */}
        <div className="grid gap-8">
          {sections.map((section) => (
            <section key={section.title} className="bg-anime-900/50 rounded-lg p-6 border border-anime-700">
              <h2 className="font-heading text-xl font-bold text-anime-accent mb-4">
                {section.title}
              </h2>
              <div className="space-y-4">
                {section.items.map((item) => (
                  <div
                    key={item.name}
                    className="grid md:grid-cols-12 gap-4 text-sm"
                  >
                    <div className="md:col-span-3">
                      <span className="text-anime-100 font-mono font-semibold">
                        {item.name}
                      </span>
                    </div>
                    <div className="md:col-span-5">
                      <code className="text-anime-300 font-mono text-xs break-all">
                        {item.syntax}
                      </code>
                    </div>
                    <div className="md:col-span-4 text-anime-400">{item.desc}</div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center text-anime-400 text-sm">
          <p>Need more detail? Visit the missions for hands-on practice.</p>
        </div>
      </div>
    </div>
  )
}