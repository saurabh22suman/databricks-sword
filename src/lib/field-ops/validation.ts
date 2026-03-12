/**
 * Field Operations Validation Engine
 * Executes validation queries and records results.
 */

import { executeSQL } from "../databricks/cli"
import { fieldOpsValidations, getDb } from "../db"
import { getCheckKey, loadFieldOpsContent } from "./content"
import type {
  DatabricksConnection,
  Industry,
  ValidationConfig,
  ValidationResult,
} from "./types"

export async function getValidationQueries(industry: Industry): Promise<ValidationConfig[]> {
  const mission = await loadFieldOpsContent(industry)
  return mission.validations
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
    const query = validation.query
      .replace(/{catalog}/g, catalog)
      .replace(/{schema_prefix}/g, schemaPrefix)

    const rawResult = await executeSQL(config, query)
    const result = rawResult as unknown[][] | null

    if (!result || result.length === 0) {
      return {
        passed: false,
        errorMessage: "Query returned no results",
      }
    }

    if (validation.expectedResult === "exists") {
      return { passed: true }
    }

    if (validation.expectedResult === "count") {
      const count = Number(result[0]?.[0] ?? 0)
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
): Promise<{ runId: string; results: ValidationResult[] }> {
  const validations = await getValidationQueries(industry)
  const results: ValidationResult[] = []
  const runId = crypto.randomUUID()

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
        runId,
        checkKey: validation.checkKey || getCheckKey(validation.checkName),
        checkName: validation.checkName,
        query: validation.query,
        passed,
        errorMessage,
      })
      .returning()

    results.push(result as ValidationResult)
  }

  return { runId, results }
}
