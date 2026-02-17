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
  // Placeholder - will be loaded from content files
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
      },
      {
        checkName: "Gold reorder recommendations",
        description: "Verify reorder recommendations table exists",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_gold.reorder_recommendations",
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
        description: "Verify session metrics are computed",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_silver.sessions",
        expectedResult: "count",
        expectedValue: 1,
      },
      {
        checkName: "Gold retention cohorts",
        description: "Verify retention cohorts exist",
        query: "SELECT COUNT(*) as count FROM {catalog}.{schema_prefix}_gold.retention_cohorts",
        expectedResult: "count",
        expectedValue: 1,
      },
    ],
    healthcare: [],
    fintech: [],
    automotive: [],
    manufacturing: [],
    telecom: [],
    agritech: [],
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
