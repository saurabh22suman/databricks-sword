/**
 * Databricks CLI Interface
 * Uses the Databricks CLI for reliable Unity Catalog operations.
 */

import { execFile } from "child_process"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { promisify } from "util"
import type { DatabricksConnection } from "../field-ops/types"

const execFileAsync = promisify(execFile)

/**
 * Execute a Databricks CLI command with the given connection config.
 * Creates a temporary .databrickscfg file for authentication.
 * Uses execFile (not exec) to pass args as an array directly,
 * avoiding shell interpretation and quoting issues.
 */
async function runCli(
  config: DatabricksConnection,
  args: string[]
): Promise<string> {
  // Create a secure temporary config file for authentication
  const configContent = `[DEFAULT]
host = ${config.workspaceUrl}
token = ${config.token}
`
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "dbsword-databricks-"))
  const tempConfigPath = path.join(tempDir, ".databrickscfg")
  await fs.writeFile(tempConfigPath, configContent, { mode: 0o600 })

  try {
    console.log(`[CLI] Running: databricks ${args.join(" ")}`)
    const { stdout, stderr } = await execFileAsync("databricks", args, {
      timeout: 60000,
      env: { ...process.env, DATABRICKS_CONFIG_FILE: tempConfigPath },
    })
    if (stderr) {
      console.warn(`[CLI] stderr: ${stderr}`)
    }
    return stdout.trim()
  } finally {
    // Clean up temp config directory and file
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}

/**
 * Test Databricks connection by listing catalogs.
 */
export async function testConnection(
  config: DatabricksConnection
): Promise<{ success: boolean; errorMessage?: string }> {
  try {
    await runCli(config, ["catalogs", "list"])
    return { success: true }
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : "Connection failed",
    }
  }
}

/**
 * Execute a SQL query against Databricks SQL Warehouse.
 * Note: Requires a warehouse to be running.
 */
export async function executeSQL(
  config: DatabricksConnection,
  query: string
): Promise<unknown> {
  const baseUrl = config.workspaceUrl.replace(/\/+$/, "")
  const url = `${baseUrl}/api/2.0/sql/statements`

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
 * Upload a file to Databricks Unity Catalog Volumes using CLI fs cp command.
 * Requires dbfs: scheme prefix for both DBFS and UC Volume paths per CLI docs.
 */
export async function uploadFile(
  config: DatabricksConnection,
  localFilePath: string,
  volumePath: string
): Promise<void> {
  await runCli(config, ["fs", "cp", "--overwrite", localFilePath, `dbfs:${volumePath}`])
}

/**
 * List schemas in a catalog using CLI.
 */
export async function listSchemas(
  config: DatabricksConnection,
  catalog: string
): Promise<string[]> {
  try {
    const output = await runCli(config, ["schemas", "list", catalog, "-o", "json"])
    const schemas = JSON.parse(output)
    return schemas.map((s: { name: string }) => s.name)
  } catch {
    return []
  }
}

/**
 * Drop a schema using CLI.
 * Uses --force to delete even if schema contains objects (tables, volumes).
 */
export async function dropSchema(
  config: DatabricksConnection,
  catalog: string,
  schema: string
): Promise<void> {
  try {
    await runCli(config, ["schemas", "delete", `${catalog}.${schema}`, "--force"])
  } catch (error) {
    // Ignore "not found" errors
    if (
      error instanceof Error &&
      !error.message.includes("SCHEMA_DOES_NOT_EXIST")
    ) {
      throw error
    }
  }
}

/**
 * Create a schema using CLI.
 * CLI syntax: databricks schemas create NAME CATALOG_NAME [flags]
 */
export async function createSchema(
  config: DatabricksConnection,
  catalog: string,
  schema: string
): Promise<void> {
  try {
    await runCli(config, [
      "schemas",
      "create",
      schema,    // NAME comes first
      catalog,   // CATALOG_NAME comes second
      "--comment",
      "Field Ops deployment schema",
    ])
  } catch (error) {
    // Ignore "already exists" errors
    if (
      error instanceof Error &&
      !error.message.includes("SCHEMA_ALREADY_EXISTS")
    ) {
      throw error
    }
  }
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

/**
 * Create a Unity Catalog volume for storing data files using CLI.
 */
export async function createVolume(
  config: DatabricksConnection,
  catalog: string,
  schema: string,
  volumeName: string
): Promise<void> {
  try {
    await runCli(config, [
      "volumes",
      "create",
      catalog,
      schema,
      volumeName,
      "MANAGED",
      "--comment",
      "Field Ops data volume",
    ])
  } catch (error) {
    // Ignore "already exists" errors
    if (
      error instanceof Error &&
      !error.message.includes("ALREADY_EXISTS")
    ) {
      throw error
    }
  }
}

/**
 * Upload a notebook to the Databricks workspace using CLI.
 */
export async function uploadNotebook(
  config: DatabricksConnection,
  localFilePath: string,
  workspacePath: string,
  language: "PYTHON" | "SQL" | "SCALA" | "R" = "PYTHON"
): Promise<void> {
  await runCli(config, [
    "workspace",
    "import",
    "--file",
    localFilePath,
    "--language",
    language,
    "--format",
    "SOURCE",
    "--overwrite",
    workspacePath,
  ])
}

/**
 * Create a directory in the Databricks workspace using CLI.
 */
export async function createWorkspaceDirectory(
  config: DatabricksConnection,
  workspacePath: string
): Promise<void> {
  await runCli(config, ["workspace", "mkdirs", workspacePath])
}

/**
 * Recursively delete a directory in the Databricks workspace using CLI.
 */
export async function deleteWorkspaceDirectory(
  config: DatabricksConnection,
  workspacePath: string
): Promise<void> {
  try {
    await runCli(config, ["workspace", "delete", "--recursive", workspacePath])
  } catch (error) {
    // Ignore "not found" errors
    if (
      error instanceof Error &&
      !error.message.includes("RESOURCE_DOES_NOT_EXIST")
    ) {
      throw error
    }
  }
}
