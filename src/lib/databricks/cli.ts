/**
 * Databricks CLI Interface
 * Uses the Databricks CLI for reliable Unity Catalog operations.
 */

import { execFile as nodeExecFile } from "child_process"
import fs from "fs/promises"
import os from "os"
import path from "path"
import type { DatabricksConnection } from "../field-ops/types"

export type RunCliResult = {
  success: boolean
  stdout: string
  stderr: string
  errorCategory?: "authFailed" | "resourceNotFound" | "commandFailed"
}

export type RunCliExecutor = (
  command: string,
  args: string[],
  options: { cwd?: string; timeoutMs?: number; env: NodeJS.ProcessEnv }
) => Promise<{ stdout: string; stderr: string }>

const defaultExecutor: RunCliExecutor = (command, args, options) =>
  new Promise((resolve, reject) => {
    nodeExecFile(command, args, options, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${error.message}\n${stderr}`))
      } else {
        resolve({ stdout, stderr })
      }
    })
  })

let executor: RunCliExecutor = defaultExecutor

/** @internal — used for tests only */
export function _setRunCliExecutor(e: RunCliExecutor): void {
  executor = e
}

/** @internal — used for tests only */
export function _resetRunCliExecutor(): void {
  executor = defaultExecutor
}

function classifyError(message: string): RunCliResult["errorCategory"] {
  if (/401|Unauthorized|PERMISSION_DENIED|invalid.?token/i.test(message)) return "authFailed"
  if (/RESOURCE_DOES_NOT_EXIST|SCHEMA_DOES_NOT_EXIST|404/i.test(message)) return "resourceNotFound"
  return "commandFailed"
}

/**
 * Execute a Databricks CLI command with the given connection config.
 * Creates a temporary .databrickscfg file for authentication.
 * Uses execFile (not exec) to pass args as an array directly,
 * avoiding shell interpretation and quoting issues.
 */
export async function runCli(
  config: DatabricksConnection,
  args: string[],
  options: { cwd?: string; timeoutMs?: number } = {}
): Promise<RunCliResult> {
  // Create a secure temporary config file for authentication
  const configContent = `[DEFAULT]
host = ${config.workspaceUrl}
token = ${config.token}
`
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "dbsword-databricks-"))
  const tempConfigPath = path.join(tempDir, ".databrickscfg")
  await fs.writeFile(tempConfigPath, configContent, { mode: 0o600 })

  const timeoutMs = options.timeoutMs ?? 60000
  const env = { ...process.env, DATABRICKS_CONFIG_FILE: tempConfigPath }
  const execOptions = { cwd: options.cwd, env, timeout: timeoutMs }

  console.log(`[CLI] Running: databricks ${args.join(" ")}`)
  try {
    const { stdout, stderr } = await executor("databricks", args, execOptions)
    if (stderr) console.warn(`[CLI] stderr: ${stderr}`)
    return { success: true, stdout: stdout.trim(), stderr }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown CLI error"
    return { success: false, stdout: "", stderr: message, errorCategory: classifyError(message) }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}

/**
 * Test Databricks connection by listing catalogs.
 */
export async function testConnection(
  config: DatabricksConnection
): Promise<{ success: boolean; errorMessage?: string }> {
  const r = await runCli(config, ["catalogs", "list"])
  if (r.success) {
    return { success: true }
  }
  return { success: false, errorMessage: r.stderr }
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
  const r = await runCli(config, ["fs", "cp", "--overwrite", localFilePath, `dbfs:${volumePath}`])
  if (!r.success) {
    throw new Error(r.stderr)
  }
}

/**
 * List schemas in a catalog using CLI.
 */
export async function listSchemas(
  config: DatabricksConnection,
  catalog: string
): Promise<string[]> {
  const r = await runCli(config, ["schemas", "list", catalog, "-o", "json"])
  if (!r.success) {
    return []
  }
  try {
    const schemas = JSON.parse(r.stdout)
    return schemas.map((s: { name: string }) => s.name)
  } catch {
    return []
  }
}

/**
 * List Field Ops schemas (with 'fo_' prefix) in a catalog.
 * Returns array of schema names and their industry/ID info.
 */
export async function listFieldOpsSchemas(
  config: DatabricksConnection,
  catalog: string
): Promise<{ schemaName: string; industry: string; userId: string; timestamp: string }[]> {
  const allSchemas = await listSchemas(config, catalog)

  // Filter schemas with 'fo_' prefix (Field Ops deployments)
  const foSchemas = allSchemas.filter((s) => s.startsWith("fo_"))

  // Parse schema name to extract info: fo_{industry}_{userId}_{timestamp}
  return foSchemas.map((schemaName) => {
    const parts = schemaName.split("_")
    // parts: [fo, industry, userId, timestamp]
    const industry = parts[1] || "unknown"
    const userId = parts[2] || ""
    const timestamp = parts.slice(3).join("_") || ""

    return { schemaName, industry, userId, timestamp }
  })
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
  const r = await runCli(config, ["schemas", "delete", `${catalog}.${schema}`, "--force"])
  // Success if command succeeded OR if schema doesn't exist
  if (!r.success && r.errorCategory !== "resourceNotFound" && !r.stderr.includes("SCHEMA_DOES_NOT_EXIST")) {
    throw new Error(r.stderr)
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
  const r = await runCli(config, [
    "schemas",
    "create",
    schema, // NAME comes first
    catalog, // CATALOG_NAME comes second
    "--comment",
    "Field Ops deployment schema",
  ])
  // Success if command succeeded OR if already exists
  if (!r.success && !r.stderr.includes("SCHEMA_ALREADY_EXISTS")) {
    throw new Error(r.stderr)
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
  const r = await runCli(config, [
    "volumes",
    "create",
    catalog,
    schema,
    volumeName,
    "MANAGED",
    "--comment",
    "Field Ops data volume",
  ])
  // Success if command succeeded OR if already exists
  if (!r.success && !r.stderr.includes("ALREADY_EXISTS")) {
    throw new Error(r.stderr)
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
  const r = await runCli(config, [
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
  if (!r.success) {
    throw new Error(r.stderr)
  }
}

/**
 * Create a directory in the Databricks workspace using CLI.
 */
export async function createWorkspaceDirectory(
  config: DatabricksConnection,
  workspacePath: string
): Promise<void> {
  const r = await runCli(config, ["workspace", "mkdirs", workspacePath])
  if (!r.success) {
    throw new Error(r.stderr)
  }
}

/**
 * Recursively delete a directory in the Databricks workspace using CLI.
 */
export async function deleteWorkspaceDirectory(
  config: DatabricksConnection,
  workspacePath: string
): Promise<void> {
  const r = await runCli(config, ["workspace", "delete", "--recursive", workspacePath])
  // Success if command succeeded OR if resource doesn't exist
  if (!r.success && r.errorCategory !== "resourceNotFound" && !r.stderr.includes("RESOURCE_DOES_NOT_EXIST")) {
    throw new Error(r.stderr)
  }
}