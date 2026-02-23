/**
 * Field Operations Validation Engine
 * Executes validation queries and records results.
 */

import { executeSQL } from "../databricks/cli"
import { fieldOpsValidations, getDb } from "../db"
import type {
    DatabricksConnection,
    Industry,
    ValidationConfig,
    ValidationResult,
} from "./types"

/**
 * Get validation queries for an industry.
 * TODO: Load from mission.json files when content is created.
 */
export function getValidationQueries(industry: Industry): ValidationConfig[] {
  const validations: Record<Industry, ValidationConfig[]> = {
    retail: [
      {
        checkName: "Bronze sales data exists",
        description: "Verify sales_transactions table has data",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_bronze.sales_transactions",
        expectedResult: "count",
        expectedValue: 1,
      },
      {
        checkName: "Silver inventory cleaned",
        description: "Verify inventory data is deduplicated",
        query: "SELECT COUNT(DISTINCT sku) as count FROM {catalog}.{schema_prefix}_silver.inventory",
        expectedResult: "count",
        expectedValue: 1,
      },
      {
        checkName: "Gold reorder recommendations exist",
        description: "Verify reorder recommendations table has data",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_gold.reorder_recommendations WHERE recommended_qty > 0",
        expectedResult: "count",
        expectedValue: 1,
      },
    ],
    gaming: [
      {
        checkName: "Bronze events ingested",
        description: "Verify player_events table has data",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_bronze.player_events",
        expectedResult: "count",
        expectedValue: 1,
      },
      {
        checkName: "Silver sessions calculated",
        description: "Verify session metrics exist with valid durations",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_silver.sessions WHERE duration_minutes > 0",
        expectedResult: "count",
        expectedValue: 1,
      },
      {
        checkName: "Gold retention cohorts exist",
        description: "Verify 7-day retention cohorts are calculated",
        query: "SELECT COUNT(DISTINCT cohort_date) as count FROM {catalog}.{schema_prefix}_gold.retention_cohorts",
        expectedResult: "count",
        expectedValue: 1,
      },
    ],
    healthcare: [
      {
        checkName: "Bronze EHR data ingested",
        description: "Verify EHR records table exists with data",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_bronze.ehr_records",
        expectedResult: "count",
        expectedValue: 1,
      },
      {
        checkName: "Silver patients deduplicated",
        description: "Verify patients table has unique patient_id",
        query: "SELECT COUNT(DISTINCT patient_id) as count FROM {catalog}.{schema_prefix}_silver.patients",
        expectedResult: "count",
        expectedValue: 1,
      },
      {
        checkName: "Gold patient_360 with masked PII",
        description: "Verify patient_360 exists with masked SSN",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_gold.patient_360 WHERE masked_ssn LIKE 'XXX-XX-%'",
        expectedResult: "count",
        expectedValue: 1,
      },
    ],
    fintech: [
      {
        checkName: "Bronze transactions ingested",
        description: "Verify transactions table has data",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_bronze.transactions",
        expectedResult: "count",
        expectedValue: 1,
      },
      {
        checkName: "Silver features calculated",
        description: "Verify transaction_features has velocity columns",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_silver.transaction_features WHERE velocity_1h IS NOT NULL",
        expectedResult: "count",
        expectedValue: 1,
      },
      {
        checkName: "Gold alerts generated",
        description: "Verify fraud_alerts table has flagged transactions",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_gold.fraud_alerts WHERE risk_score > 0",
        expectedResult: "count",
        expectedValue: 1,
      },
    ],
    automotive: [
      {
        checkName: "Bronze telemetry ingested",
        description: "Verify telemetry table has data with valid timestamps",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_bronze.vehicle_telemetry WHERE timestamp IS NOT NULL",
        expectedResult: "count",
        expectedValue: 1,
      },
      {
        checkName: "Silver anomalies detected",
        description: "Verify anomaly_events table has detected anomalies",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_silver.anomaly_events",
        expectedResult: "count",
        expectedValue: 1,
      },
      {
        checkName: "Gold maintenance predictions",
        description: "Verify predictive_maintenance table has service predictions",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_gold.predictive_maintenance WHERE days_to_service > 0",
        expectedResult: "count",
        expectedValue: 1,
      },
    ],
    manufacturing: [
      {
        checkName: "Bronze sensor data ingested",
        description: "Verify raw_sensor_readings has parsed timestamps",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_bronze.raw_sensor_readings WHERE timestamp_parsed IS NOT NULL",
        expectedResult: "count",
        expectedValue: 1,
      },
      {
        checkName: "Silver SPC metrics calculated",
        description: "Verify SPC metrics include control limits",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_silver.spc_metrics WHERE ucl IS NOT NULL AND lcl IS NOT NULL",
        expectedResult: "count",
        expectedValue: 1,
      },
      {
        checkName: "Gold batch quality available",
        description: "Verify batch quality summary has defect rate values",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_gold.batch_quality_summary WHERE defect_rate IS NOT NULL",
        expectedResult: "count",
        expectedValue: 1,
      },
    ],
    telecom: [
      {
        checkName: "Bronze cell tower metrics ingested",
        description: "Verify Auto Loader populated cell_tower_metrics",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_bronze.cell_tower_metrics",
        expectedResult: "count",
        expectedValue: 1,
      },
      {
        checkName: "Silver network KPIs calculated",
        description: "Verify network_kpis contains regional metrics",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_silver.network_kpis WHERE region IS NOT NULL",
        expectedResult: "count",
        expectedValue: 1,
      },
      {
        checkName: "Gold regional performance built",
        description: "Verify regional_performance contains region aggregates",
        query: "SELECT COUNT(DISTINCT region) as count FROM {catalog}.{schema_prefix}_gold.regional_performance",
        expectedResult: "count",
        expectedValue: 1,
      },
    ],
    agritech: [
      {
        checkName: "Bronze soil sensors loaded",
        description: "Verify soil_sensors has ingested records",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_bronze.soil_sensors",
        expectedResult: "count",
        expectedValue: 1,
      },
      {
        checkName: "Silver enrichment completed",
        description: "Verify sensor_weather_enriched has weather joins",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_silver.sensor_weather_enriched WHERE weather_temp_max_c IS NOT NULL",
        expectedResult: "count",
        expectedValue: 1,
      },
      {
        checkName: "Gold yield features generated",
        description: "Verify yield_prediction_features has rows",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_gold.yield_prediction_features",
        expectedResult: "count",
        expectedValue: 1,
      },
    ],
  }

  return validations[industry] || []
}

/**
 * Execute a single validation check.
 */
export async function executeValidation(
  config: DatabricksConnection,
  validation: ValidationConfig,
  catalog: string,
  schemaPrefix: string
): Promise<{ passed: boolean; errorMessage?: string }> {
  try {
    // Replace placeholders in query
    const query = validation.query
      .replace(/{catalog}/g, catalog)
      .replace(/{schema_prefix}/g, schemaPrefix)

    // Execute query
    const rawResult = await executeSQL(config, query)

    // Cast result to expected format (array of rows)
    const result = rawResult as unknown[][] | null

    if (!result || result.length === 0) {
      return {
        passed: false,
        errorMessage: "Query returned no results",
      }
    }

    // Check result based on expected type
    if (validation.expectedResult === "exists") {
      return { passed: true }
    }

    if (validation.expectedResult === "count") {
      const count = Number(result[0]?.[0] ?? 0) // First row, first column
      const expectedCount = validation.expectedValue !== undefined 
        ? Number(validation.expectedValue) 
        : 1
      const passed = count >= expectedCount
      return {
        passed,
        errorMessage: passed ? undefined : `Expected count >= ${expectedCount}, got ${count}`,
      }
    }

    if (validation.expectedResult === "value") {
      const value = result[0]?.[0]
      const passed = value === validation.expectedValue
      return {
        passed,
        errorMessage: passed ? undefined : `Expected ${validation.expectedValue}, got ${value}`,
      }
    }

    return { passed: true }
  } catch (error) {
    return {
      passed: false,
      errorMessage: error instanceof Error ? error.message : "Validation failed",
    }
  }
}

/**
 * Run all validation queries for a deployment.
 */
export async function runValidation(
  deploymentId: string,
  industry: Industry,
  catalog: string,
  schemaPrefix: string,
  config: DatabricksConnection
): Promise<ValidationResult[]> {
  const validations = getValidationQueries(industry)
  const results: ValidationResult[] = []

  const db = getDb()
  for (const validation of validations) {
    const { passed, errorMessage } = await executeValidation(
      config,
      validation,
      catalog,
      schemaPrefix
    )

    const [result] = await db
      .insert(fieldOpsValidations)
      .values({
        deploymentId,
        checkName: validation.checkName,
        query: validation.query,
        passed,
        errorMessage,
      })
      .returning()

    results.push(result as ValidationResult)
  }

  return results
}
