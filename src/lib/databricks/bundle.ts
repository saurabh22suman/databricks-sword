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
    createSchema,
    createVolume,
    createWorkspaceDirectory,
    deleteWorkspaceDirectory,
    dropSchema,
    uploadFile,
    uploadNotebook,
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
 * Deploy a generated bundle to Databricks.
 * Creates schemas, volumes, uploads data files and notebooks.
 */
export async function deployBundle(
  bundlePath: string,
  config: DatabricksConnection
): Promise<DeploymentResult> {
  try {
    const schemaPrefix = path.basename(bundlePath)
    console.log(`[Deploy] Starting deployment for ${schemaPrefix}`)

    const schemas = ["bronze", "silver", "gold"]
    for (const schema of schemas) {
      const fullSchemaName = `${schemaPrefix}_${schema}`
      console.log(`[Deploy] Creating schema: ${fullSchemaName}`)
      await createSchema(config, config.catalog, fullSchemaName)
    }

    const bronzeSchema = `${schemaPrefix}_bronze`
    const volumeName = "raw_data"
    console.log(`[Deploy] Creating volume: ${bronzeSchema}.${volumeName}`)
    await createVolume(config, config.catalog, bronzeSchema, volumeName)

    const localDataDir = path.join(bundlePath, "data")
    const dataFiles = await fs.readdir(localDataDir)
    for (const file of dataFiles) {
      const localFilePath = path.join(localDataDir, file)
      const volumePath = `/Volumes/${config.catalog}/${bronzeSchema}/${volumeName}/${file}`
      console.log(`[Deploy] Uploading data file: ${file}`)
      await uploadFile(config, localFilePath, volumePath)
      console.log(`[Deploy] Successfully uploaded: ${file}`)
    }

    const workspaceDir = `/Workspace/Shared/field-ops/${schemaPrefix}`
    console.log(`[Deploy] Creating workspace directory: ${workspaceDir}`)
    await createWorkspaceDirectory(config, workspaceDir)

    const localNotebooksDir = path.join(bundlePath, "notebooks")
    const notebooks = await fs.readdir(localNotebooksDir)
    for (const notebook of notebooks) {
      const localNotebookPath = path.join(localNotebooksDir, notebook)
      const notebookName = notebook.replace(/\.(py|sql|scala|r)$/i, "")
      const language = getNotebookLanguage(notebook)
      const workspacePath = `${workspaceDir}/${notebookName}`
      console.log(`[Deploy] Uploading notebook: ${notebookName}`)
      await uploadNotebook(config, localNotebookPath, workspacePath, language)
      console.log(`[Deploy] Successfully uploaded notebook: ${notebookName}`)
    }

    console.log(`[Deploy] Deployment complete for ${schemaPrefix}`)
    return {
      success: true,
      bundlePath,
    }
  } catch (error) {
    console.error(`[Deploy] Deployment failed:`, error)
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : "Deployment failed",
    }
  }
}

/**
 * Get notebook language from file extension.
 */
function getNotebookLanguage(filename: string): "PYTHON" | "SQL" | "SCALA" | "R" {
  const ext = path.extname(filename).toLowerCase()
  switch (ext) {
    case ".sql":
      return "SQL"
    case ".scala":
      return "SCALA"
    case ".r":
      return "R"
    default:
      return "PYTHON"
  }
}

/**
 * Destroy a deployed bundle and clean up all resources.
 */
export async function destroyBundle(
  bundlePath: string,
  config: DatabricksConnection
): Promise<CleanupResult> {
  const schemaPrefix = path.basename(bundlePath)
  const failures: CleanupFailure[] = []

  console.log(`[Cleanup] Destroying bundle with schemaPrefix: ${schemaPrefix}`)
  console.log(`[Cleanup] Catalog: ${config.catalog}, WorkspaceUrl: ${config.workspaceUrl}`)

  const schemas = ["bronze", "silver", "gold"]
  for (const schema of schemas) {
    const fullSchemaName = `${schemaPrefix}_${schema}`
    try {
      console.log(`[Cleanup] Dropping schema: ${config.catalog}.${fullSchemaName}`)
      await dropSchema(config, config.catalog, fullSchemaName)
      console.log(`[Cleanup] Dropped schema: ${fullSchemaName}`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to drop schema"
      console.log(`[Cleanup] Schema drop error for ${fullSchemaName}: ${msg}`)
      failures.push({
        resourceType: "schema",
        resourceName: `${config.catalog}.${fullSchemaName}`,
        errorMessage: msg,
      })
    }
  }

  const workspaceDir = `/Workspace/Shared/field-ops/${schemaPrefix}`
  try {
    console.log(`[Cleanup] Deleting workspace directory: ${workspaceDir}`)
    await deleteWorkspaceDirectory(config, workspaceDir)
    console.log(`[Cleanup] Deleted workspace directory: ${workspaceDir}`)
  } catch (error) {
    failures.push({
      resourceType: "workspace_dir",
      resourceName: workspaceDir,
      errorMessage: error instanceof Error ? error.message : "Failed to delete workspace directory",
    })
  }

  try {
    await fs.rm(bundlePath, { recursive: true, force: true })
  } catch (error) {
    failures.push({
      resourceType: "local_bundle",
      resourceName: bundlePath,
      errorMessage: error instanceof Error ? error.message : "Failed to remove local bundle directory",
    })
  }

  return {
    success: failures.length === 0,
    failures,
  }
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
