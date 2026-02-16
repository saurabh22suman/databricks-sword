/**
 * Databricks CLI Interface
 * Low-level interface for Databricks REST API interactions.
 */

import type { DatabricksConnection } from "../field-ops/types"

/**
 * Test Databricks connection by executing a simple query.
 */
export async function testConnection(
  config: DatabricksConnection
): Promise<{ success: boolean; errorMessage?: string }> {
  try {
    const result = await executeSQL(config, "SELECT 1 as test")
    return { success: result !== null }
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : "Connection failed",
    }
  }
}

/**
 * Execute a SQL query against Databricks SQL Warehouse.
 */
export async function executeSQL(
  config: DatabricksConnection,
  query: string
): Promise<any> {
  const url = `${config.workspaceUrl}/api/2.0/sql/statements`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      warehouse_id: config.warehouseId,
      statement: query,
      wait_timeout: "30s",
      catalog: config.catalog,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      `SQL execution failed: ${response.statusText} - ${JSON.stringify(error)}`
    )
  }

  const data = await response.json()

  // Handle different response states
  if (data.status?.state === "FAILED") {
    throw new Error(data.status.error?.message || "Query failed")
  }

  return data.result?.data_array || null
}

/**
 * Upload a file to Databricks Volumes (Unity Catalog).
 */
export async function uploadFile(
  config: DatabricksConnection,
  localContent: string,
  volumePath: string
): Promise<void> {
  const url = `${config.workspaceUrl}/api/2.0/fs/files${volumePath}`

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/octet-stream",
    },
    body: localContent,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      `File upload failed: ${response.statusText} - ${JSON.stringify(error)}`
    )
  }
}

/**
 * List schemas in a catalog.
 */
export async function listSchemas(
  config: DatabricksConnection,
  catalog: string
): Promise<string[]> {
  const query = `SHOW SCHEMAS IN ${catalog}`
  const result = await executeSQL(config, query)

  if (!result || !Array.isArray(result)) {
    return []
  }

  // Result format: [[schema_name, ...], ...]
  return result.map((row: any[]) => row[0])
}

/**
 * Drop a schema (cascade).
 */
export async function dropSchema(
  config: DatabricksConnection,
  catalog: string,
  schema: string
): Promise<void> {
  const query = `DROP SCHEMA IF EXISTS ${catalog}.${schema} CASCADE`
  await executeSQL(config, query)
}

/**
 * Create a schema if it doesn't exist.
 */
export async function createSchema(
  config: DatabricksConnection,
  catalog: string,
  schema: string
): Promise<void> {
  const query = `CREATE SCHEMA IF NOT EXISTS ${catalog}.${schema}`
  await executeSQL(config, query)
}

/**
 * Execute multiple SQL statements in sequence.
 */
export async function executeSQLBatch(
  config: DatabricksConnection,
  queries: string[]
): Promise<void> {
  for (const query of queries) {
    await executeSQL(config, query)
  }
}
