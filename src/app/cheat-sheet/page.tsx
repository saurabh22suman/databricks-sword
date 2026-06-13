/**
 * @file page.tsx
 * @description Quick Reference Cheat Sheet - Databricks 2025+ Syntax
 */

import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Quick Reference | Databricks Sword",
  description: "Quick syntax reference for Databricks 2025 - Delta Lake, Spark Declarative Pipelines, Unity Catalog, MLflow, Streaming",
}

const sections = [
  {
    title: "SDP / Pipelines (formerly DLT)",
    items: [
      {
        name: "STREAMING TABLE",
        syntax: "CREATE STREAMING TABLE name (...)\nAS SELECT * FROM STREAM read_files('path')",
        desc: "Continuously ingests from cloud files (Auto Loader)",
        useCase: "Raw data ingestion from S3/ADLS/GCS",
      },
      {
        name: "MATERIALIZED VIEW",
        syntax: "CREATE MATERIALIZED VIEW name\nAS SELECT ... [REFRESH EVERY 1 HOUR]",
        desc: "Pre-computed, refreshed on schedule via pipeline",
        useCase: "Complex aggregations, historical metrics",
      },
      {
        name: "EXPECTATION",
        syntax: "CONSTRAINT name EXPECT (col IS NOT NULL)\nON VIOLATION DROP ROW",
        desc: "Data quality constraint, drops/fails on violation",
        useCase: "Validate incoming data quality",
      },
      {
        name: "AUTO LOADER",
        syntax: "spark.readStream.format('cloudFiles')\n.option('path','s3://bucket/').load()",
        desc: "Incremental load from cloud storage",
        useCase: "CDR, IoT, file ingestion",
      },
      {
        name: "CDC FLOW",
        syntax: "FLOW { INSERT BY NAME query |\nAUTO CDC auto_cdc_flow_spec }",
        desc: "Change data capture from source DB",
        useCase: "Replicate changed records",
      },
    ],
  },
  {
    title: "Delta Lake",
    items: [
      {
        name: "MERGE",
        syntax: "MERGE INTO target USING src\nON t.id = s.id\nWHEN MATCHED THEN UPDATE SET *\nWHEN NOT MATCHED THEN INSERT *",
        desc: "Upsert/update/delete in one atomic operation",
      },
      {
        name: "MERGE (Delete)",
        syntax: "MERGE INTO t USING s ON t.id = s.id\nWHEN MATCHED AND s.deleted = TRUE\nTHEN DELETE",
        desc: "Delete matched rows via MERGE",
      },
      {
        name: "OPTIMIZE",
        syntax: "OPTIMIZE table [WHERE x='y']\nZORDER BY (col1, col2)",
        desc: "Compact small files, co-locate filtered columns",
      },
      {
        name: "LIQUID CLUSTERING",
        syntax: "CREATE TABLE t (...)\nCLUSTER BY (col1, col2)\n-- or ALTER TABLE t CLUSTER BY (col1)",
        desc: "Adaptive clustering, replaces static partitioning",
      },
      {
        name: "VACUUM",
        syntax: "VACUUM table [RETAIN 24 HOURS]",
        desc: "Remove orphaned files (default 168h retention)",
      },
      {
        name: "CHANGE DATA FEED",
        syntax: "ALTER TABLE t SET TBLPROPERTIES\ndelta.enableChangeDataFeed = true",
        desc: "Track row-level changes (inserts, updates, deletes)",
      },
      {
        name: "COPY INTO",
        syntax: "COPY INTO table FROM 'path'\nFILEFORMAT = PARQUET",
        desc: "Load from cloud files idempotently",
      },
      {
        name: "RESTORE",
        syntax: "RESTORE TABLE t TO VERSION AS OF 5",
        desc: "Restore table to previous version",
      },
      {
        name: "HISTORY",
        syntax: "DESCRIBE HISTORY t",
        desc: "View table change history",
      },
    ],
  },
  {
    title: "Unity Catalog",
    items: [
      {
        name: "Namespace",
        syntax: "catalog.schema.table",
        desc: "Three-level object reference namespace (metastore is the top-level container above catalogs)",
      },
      {
        name: "External Location",
        syntax: "CREATE EXTERNAL LOCATION name\nURL 's3://bucket'\nWITH STORAGE CREDENTIAL cred",
        desc: "Grant access to cloud storage paths",
      },
      {
        name: "Row Filter",
        syntax: "CREATE POLICY name ON tbl\nROW FILTER fn TO user GROUP eng\nFOR TABLES WHEN has_tag('pii')",
        desc: "Filter rows by user/tag (ABAC)",
      },
      {
        name: "Column Mask",
        syntax: "CREATE POLICY mask_ssn ON tbl\nCOLUMN MASK fn ON COLUMN ssn\nTO user GROUP eng",
        desc: "Redact sensitive columns (SSN, salary)",
      },
      {
        name: "Lineage",
        syntax: "SELECT * FROM system.access\n.table_lineage WHERE source = 'tbl'",
        desc: "Track upstream/downstream deps",
      },
      {
        name: "Tags",
        syntax: "ALTER TABLE t SET TAG sensitivity='high'\nALTER TABLE t UNSET TAG temp",
        desc: "Apply tag-based governance",
      },
    ],
  },
  {
    title: "MLflow",
    items: [
      {
        name: "Autolog",
        syntax: "mlflow.sklearn.autolog()\n# or mlflow.<framework>.autolog()",
        desc: "Auto-log parameters, metrics, models",
      },
      {
        name: "Register Model",
        syntax: "mlflow.register_model(\n'models:/name@staging', 'cat.schema.model')",
        desc: "Register to Unity Catalog",
      },
      {
        name: "Load for Inference",
        syntax: "model = mlflow.spark\n.load_model('models:/path')\npredictions = model.transform(input_df)",
        desc: "Load model for batch scoring",
      },
      {
        name: "Stage Transition",
        syntax: "client.transition_model_version_stage(\nname='model', version=1, stage='Production')",
        desc: "Move model through stages (None→Staging→Production→Archived)",
      },
      {
        name: "Model Serving",
        syntax: "mlflow.deployments.get_deployment(\n'transformer', inputs=inputs)",
        desc: "Query served model via AI Gateway",
      },
    ],
  },
  {
    title: "Streaming",
    items: [
      {
        name: "Watermark",
        syntax: ".withWatermark('event_time',\n'10 minutes')",
        desc: "Handle late data, trigger-based aggregation",
      },
      {
        name: "Trigger",
        syntax: ".trigger(availableNow=True)\n# or .trigger(continuous='30 seconds')",
        desc: "Batch_once vs continuous processing",
      },
      {
        name: "ForeachBatch",
        syntax: ".foreachBatch(df => {\n  df.write(...)\n})",
        desc: "Run arbitrary code per micro-batch",
      },
      {
        name: "Append Mode",
        syntax: ".outputMode('append')\n# or .outputMode('complete', 'update')",
        desc: "How to emit results",
      },
      {
        name: "State Migration",
        syntax: "spark.conf.set('sql.statesInStreamingJoin','true')",
        desc: "Enable streaming state migration",
      },
    ],
  },
  {
    title: "Lakehouse Monitor",
    items: [
      {
        name: "Create Monitor",
        syntax: "CREATE MONITOR TABLE cat.schema.table\nAS SELECT * FROM source",
        desc: "Create time-series monitor for data quality",
      },
      {
        name: "Snapshot Mode",
        syntax: "CREATE OR REFRESH MONITOR...\nMODE SNAPSHOT\nFOR FRESHNESS drift_threshold = 300",
        desc: "Monitor data freshness (seconds)",
      },
      {
        name: "Metrics Profile",
        syntax: "... MODE METRICS\nINCLUDE FRESHNESS VIOLATIONS",
        desc: "Statistical profiling + drift detection",
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
            Databricks 2025+ syntax • Last verified: May 2026
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