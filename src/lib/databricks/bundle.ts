/**
 * Databricks Asset Bundle (DAB) Management
 * Handles bundle generation, deployment, and cleanup for Field Operations.
 */

import fs from "fs/promises"
import path from "path"
import yaml from "js-yaml"
import { loadFieldOpsContent } from "../field-ops/content"
import type {
    CleanupFailure,
    CleanupResult,
    DatabricksConnection,
    DeploymentResult,
    Industry,
} from "../field-ops/types"
import {
    runCli,
} from "./cli"

async function assertRequiredAssets(
  industry: Industry,
  contentDir: string
): Promise<{ missingNotebooks: string[]; missingDataFiles: string[] }> {
  const mission = await loadFieldOpsContent(industry)

  const [missingNotebooks, missingDataFiles] = await Promise.all([
    Promise.all(
      mission.notebooks.map(async (notebook) => {
        const notebookPath = path.join(contentDir, "notebooks", notebook)
        try {
          await fs.access(notebookPath)
          return null
        } catch {
          return notebook
        }
      })
    ).then((items) => items.filter((item): item is string => Boolean(item))),
    Promise.all(
      mission.dataFiles.map(async (dataFile) => {
        const dataPath = path.join(contentDir, "data", dataFile)
        try {
          await fs.access(dataPath)
          return null
        } catch {
          return dataFile
        }
      })
    ).then((items) => items.filter((item): item is string => Boolean(item))),
  ])

  return { missingNotebooks, missingDataFiles }
}

/**
 * Generate a Databricks Asset Bundle for a Field Ops mission.
 * Returns the path to the generated bundle directory.
 */
export async function generateBundle(
  industry: Industry,
  userId: string,
  config: DatabricksConnection
): Promise<string> {
  const timestamp = Date.now().toString(36)
  const userPrefix = userId.substring(0, 8)
  const schemaPrefix = `fo_${industry}_${userPrefix}_${timestamp}`

  const tempDir = path.join("/tmp", "dbsword-bundles", schemaPrefix)
  await fs.mkdir(tempDir, { recursive: true })

  const databricksYml = generateDatabricksYml(industry)
  await fs.writeFile(path.join(tempDir, "databricks.yml"), databricksYml)

  const contentDir = path.join(process.cwd(), "src", "content", "field-ops", industry)
  const mission = await loadFieldOpsContent(industry)

  const requiredAssetCheck = await assertRequiredAssets(industry, contentDir)
  if (requiredAssetCheck.missingDataFiles.length > 0 || requiredAssetCheck.missingNotebooks.length > 0) {
    throw new Error(
      JSON.stringify({
        code: "MISSING_REQUIRED_ASSETS",
        missingDataFiles: requiredAssetCheck.missingDataFiles,
        missingNotebooks: requiredAssetCheck.missingNotebooks,
      })
    )
  }

  const targetNotebooksDir = path.join(tempDir, "notebooks")
  await fs.mkdir(targetNotebooksDir, { recursive: true })

  // Substitute deployment-specific placeholders so notebooks are usable
  // as-is when uploaded to Databricks. Without this, cells like
  // `catalog = "{catalog}"` would deploy literally and fail with
  // NO_SUCH_CATALOG_EXCEPTION on first run.
  const substitutions: Record<string, string> = {
    "{catalog}": config.catalog,
    "{schema_prefix}": schemaPrefix,
  }

  for (const notebook of mission.notebooks) {
    const srcPath = path.join(contentDir, "notebooks", notebook)
    const dstPath = path.join(targetNotebooksDir, notebook)
    const raw = await fs.readFile(srcPath, "utf-8")
    let rendered = raw
    for (const [placeholder, value] of Object.entries(substitutions)) {
      // split/join is used (not replaceAll) to avoid regex-escape pitfalls
      // and to support Node versions predating replaceAll.
      rendered = rendered.split(placeholder).join(value)
    }
    await fs.writeFile(dstPath, rendered, "utf-8")
  }

  const targetDataDir = path.join(tempDir, "data")
  await fs.mkdir(targetDataDir, { recursive: true })
  for (const file of mission.dataFiles) {
    await fs.copyFile(
      path.join(contentDir, "data", file),
      path.join(targetDataDir, file)
    )
  }

  return tempDir
}

/**
 * Deploy a generated bundle to Databricks using DAB CLI.
 * Runs `databricks bundle deploy` and optionally starts DLT pipelines.
 */
export async function deployBundle(
  bundlePath: string,
  industry: Industry,
  config: DatabricksConnection
): Promise<DeploymentResult> {
  const schemaPrefix = path.basename(bundlePath)

  const deployResult = await runCli(
    config,
    [
      "bundle", "deploy",
      "--target", "dev",
      "--var", `catalog=${config.catalog}`,
      "--var", `schema_prefix=${schemaPrefix}`,
    ],
    { cwd: bundlePath, timeoutMs: 300_000 }
  )
  if (!deployResult.success) {
    return { success: false, errorMessage: deployResult.stderr }
  }

  if (industry === "manufacturing") {
    const startResult = await runCli(
      config,
      ["bundle", "run", "manufacturing_quality"],
      { cwd: bundlePath, timeoutMs: 60_000 }
    )
    if (!startResult.success) {
      return { success: false, errorMessage: startResult.stderr || "DLT pipeline start failed" }
    }
    // We do NOT wait for the pipeline to complete. It runs in the background.
  }

  return { success: true, bundlePath }
}

/**
 * Destroy a deployed bundle and clean up all resources.
 * Uses DAB CLI (databricks bundle destroy) for deployments with databricks.yml.
 * Falls back to legacy CLI for pre-DAB deployments (no databricks.yml).
 */
export async function destroyBundle(
  bundlePath: string,
  config: DatabricksConnection
): Promise<CleanupResult> {
  // Detect legacy deployment: no databricks.yml at the bundle root.
  const ymlPath = path.join(bundlePath, "databricks.yml")
  const isLegacy = !(await fs.access(ymlPath).then(() => true).catch(() => false))
  if (isLegacy) {
    return legacyDestroyBundle(bundlePath, path.basename(bundlePath), config)
  }

  const schemaPrefix = path.basename(bundlePath)
  const failures: CleanupFailure[] = []

  console.log(`[Cleanup] Destroying bundle with DAB CLI: ${schemaPrefix}`)

  const result = await runCli(
    config,
    [
      "bundle", "destroy",
      "--target", "dev",
      "--auto-approve",
      "--purge",
    ],
    { cwd: bundlePath, timeoutMs: 180_000 }
  )
  if (!result.success) {
    failures.push({
      resourceType: "bundle",
      resourceName: bundlePath,
      errorMessage: result.stderr,
    })
  }

  await fs.rm(bundlePath, { recursive: true, force: true }).catch(() => {})

  return { success: failures.length === 0, failures }
}

/**
 * Legacy cleanup for pre-DAB deployments.
 * Uses raw CLI to delete schemas and workspace directory.
 * Used for deployments that don't have a databricks.yml file.
 */
export async function legacyDestroyBundle(
  bundlePath: string,
  schemaPrefix: string,
  config: DatabricksConnection
): Promise<CleanupResult> {
  const failures: CleanupFailure[] = []
  const schemas = ["bronze", "silver", "gold"]

  console.log(`[Cleanup] Legacy destroy for prefix: ${schemaPrefix}`)

  for (const schema of schemas) {
    const fullSchema = `${schemaPrefix}_${schema}`
    const r = await runCli(
      config,
      ["schemas", "delete", `${config.catalog}.${fullSchema}`, "--force"]
    )
    if (!r.success && !r.stderr.includes("SCHEMA_DOES_NOT_EXIST") && r.errorCategory !== "resourceNotFound") {
      failures.push({ resourceType: "schema", resourceName: `${config.catalog}.${fullSchema}`, errorMessage: r.stderr })
    }
  }

  const workspaceDir = `/Workspace/Shared/field-ops/${schemaPrefix}`
  const wd = await runCli(config, ["workspace", "delete", "--recursive", workspaceDir])
  if (!wd.success && !wd.stderr.includes("RESOURCE_DOES_NOT_EXIST") && wd.errorCategory !== "resourceNotFound") {
    failures.push({ resourceType: "workspace_dir", resourceName: workspaceDir, errorMessage: wd.stderr })
  }

  await fs.rm(bundlePath, { recursive: true, force: true }).catch(() => {})

  return { success: failures.length === 0, failures }
}

/**
 * Build a Databricks Asset Bundle object with DAB variable references.
 * Only bundle.name is hardcoded with the industry name.
 */
function buildDatabricksYmlObject(industry: Industry): Record<string, unknown> {
  const isManufacturing = industry === "manufacturing"

  const yml: Record<string, unknown> = {
    bundle: {
      name: `field-ops-${industry}`,
      uuid: "${bundle.uuid}",
    },
    workspace: {
      host: "${workspace.host}",
    },
    variables: {
      catalog: {
        description: "Unity Catalog name",
      },
      schema_prefix: {
        description: "Per-deployment unique prefix",
      },
    },
    resources: {
      schemas: {
        bronze: {
          catalog_name: "${var.catalog}",
          name: "${var.schema_prefix}_bronze",
          comment: "Bronze layer — raw data ingestion",
        },
        silver: {
          catalog_name: "${var.catalog}",
          name: "${var.schema_prefix}_silver",
          comment: "Silver layer — cleaned and transformed data",
        },
        gold: {
          catalog_name: "${var.catalog}",
          name: "${var.schema_prefix}_gold",
          comment: "Gold layer — aggregated business-ready data",
        },
      },
      volumes: {
        raw_data: {
          catalog_name: "${var.catalog}",
          schema_name: "${var.schema_prefix}_bronze",
          name: "raw_data",
          volume_type: "MANAGED",
          comment: "Field Ops data volume",
        },
      },
    },
    targets: {
      dev: { mode: "development" },
    },
  }

  if (isManufacturing) {
    const resources = yml.resources as Record<string, Record<string, unknown>>
    resources.pipelines = {
      manufacturing_quality: {
        name: "field-ops-manufacturing-${var.schema_prefix}-quality",
        catalog: "${var.catalog}",
        target: "${var.schema_prefix}_bronze",
        libraries: [
          { notebook: { path: "notebooks/01_dlt_bronze.py" } },
          { notebook: { path: "notebooks/02_dlt_silver_spc.py" } },
          { notebook: { path: "notebooks/03_dlt_gold_quality.py" } },
        ],
        configuration: {
          "bundle.sourcePath": "notebooks",
        },
        development: true,
        photon: false,
        continuous: false,
      },
    }
  }

  return yml
}

/**
 * Generate databricks.yml content for a Field Ops mission.
 */
function generateDatabricksYml(industry: Industry): string {
  const obj = buildDatabricksYmlObject(industry)
  return yaml.dump(obj, { lineWidth: 120, noRefs: true })
}
