/**
 * Mission Evaluation Module
 * Runs evaluation queries against Databricks and compares results to expected values
 */

import { executeStatement } from "./client";
import type { EvaluationQuery, EvaluationResult } from "./types";

/**
 * Evaluates a mission by running SQL queries and comparing results to expected values
 *
 * @param workspaceUrl - The Databricks workspace URL
 * @param pat - Personal Access Token
 * @param queries - Array of evaluation queries to run
 * @param warehouseId - Optional warehouse ID. If not provided, auto-discovers.
 * @returns Array of EvaluationResult objects with pass/fail status for each query
 */
export async function evaluateMission(
  workspaceUrl: string,
  pat: string,
  queries: EvaluationQuery[],
  warehouseId?: string
): Promise<EvaluationResult[]> {
  const results: EvaluationResult[] = [];

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    const result = await evaluateSingleQuery(
      workspaceUrl,
      pat,
      query,
      i,
      warehouseId
    );
    results.push(result);
  }

  return results;
}

/**
 * Evaluates a single query
 */
async function evaluateSingleQuery(
  workspaceUrl: string,
  pat: string,
  query: EvaluationQuery,
  index: number,
  warehouseId?: string
): Promise<EvaluationResult> {
  try {
    const response = await executeStatement(
      workspaceUrl,
      pat,
      query.sql,
      warehouseId
    );

    // Check for execution errors
    if (response.status === "FAILED" || response.status === "CANCELED" || response.status === "CLOSED") {
      return {
        queryIndex: index,
        description: query.description,
        passed: false,
        expected: query.expectedResult,
        actual: null,
        error: response.error?.message ?? `Statement ${response.status}`,
      };
    }

    // Extract actual value from result
    const actual = extractActualValue(response.result?.dataArray);

    // Compare with expected
    const passed = compareResults(
      actual,
      query.expectedResult,
      query.tolerance
    );

    return {
      queryIndex: index,
      description: query.description,
      passed,
      expected: query.expectedResult,
      actual,
    };
  } catch (error) {
    return {
      queryIndex: index,
      description: query.description,
      passed: false,
      expected: query.expectedResult,
      actual: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Extracts the actual value from the result data array
 * For single scalar results, returns the value directly
 * For multiple rows/columns, returns the full array
 */
function extractActualValue(dataArray: unknown[][] | undefined): unknown {
  if (!dataArray || dataArray.length === 0) {
    return [];
  }

  // Single row, single column - return scalar
  if (dataArray.length === 1 && dataArray[0].length === 1) {
    return dataArray[0][0];
  }

  // Return full array for multiple rows or columns
  return dataArray;
}

/**
 * Compares actual result with expected value
 * Supports tolerance for numeric comparisons
 */
function compareResults(
  actual: unknown,
  expected: unknown,
  tolerance?: number
): boolean {
  // Handle null/undefined
  if (actual === null && expected === null) {
    return true;
  }
  if (actual === undefined && expected === undefined) {
    return true;
  }

  // Numeric comparison with tolerance
  if (typeof actual === "number" && typeof expected === "number") {
    if (tolerance !== undefined && tolerance > 0) {
      return Math.abs(actual - expected) <= tolerance;
    }
    return actual === expected;
  }

  // Array comparison
  if (Array.isArray(actual) && Array.isArray(expected)) {
    return compareArrays(actual, expected, tolerance);
  }

  // Boolean comparison
  if (typeof actual === "boolean" && typeof expected === "boolean") {
    return actual === expected;
  }

  // String comparison
  if (typeof actual === "string" && typeof expected === "string") {
    return actual === expected;
  }

  // Fallback to deep equality
  return JSON.stringify(actual) === JSON.stringify(expected);
}

/**
 * Deep comparison of arrays with optional numeric tolerance
 */
function compareArrays(actual: unknown[], expected: unknown[], tolerance?: number): boolean {
  if (actual.length !== expected.length) {
    return false;
  }

  for (let i = 0; i < actual.length; i++) {
    const actualItem = actual[i];
    const expectedItem = expected[i];

    if (Array.isArray(actualItem) && Array.isArray(expectedItem)) {
      if (!compareArrays(actualItem, expectedItem, tolerance)) {
        return false;
      }
    } else if (typeof actualItem === "number" && typeof expectedItem === "number") {
      if (tolerance !== undefined && tolerance > 0) {
        if (Math.abs(actualItem - expectedItem) > tolerance) {
          return false;
        }
      } else if (actualItem !== expectedItem) {
        return false;
      }
    } else if (actualItem !== expectedItem) {
      return false;
    }
  }

  return true;
}
