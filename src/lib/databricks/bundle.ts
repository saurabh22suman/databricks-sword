/**
 * Databricks Asset Bundle (DAB) Management
 * Handles bundle generation, deployment, and cleanup for Field Operations.
 */

import fs from "fs/promises"
import path from "path"
import type { DatabricksConnection, DeploymentResult, Industry } from "../field-ops/types"
import {
    createSchema,
    createVolume,
    createWorkspaceDirectory,
    deleteWorkspaceDirectory,
    dropSchema,
    uploadFile,
    uploadNotebook,
} from "./cli"

/**
 * Generate a Databricks Asset Bundle for a Field Ops mission.
 * Returns the path to the generated bundle directory.
 */
export async function generateBundle(
  industry: Industry,
  userId: string,
  config: DatabricksConnection
): Promise<string> {
  // Generate unique schema prefix
  const timestamp = Date.now().toString(36)
  const userPrefix = userId.substring(0, 8)
  const schemaPrefix = `fo_${industry}_${userPrefix}_${timestamp}`

  // Use /tmp for Docker compatibility (nextjs user can write there)
  const tempDir = path.join("/tmp", "dbsword-bundles", schemaPrefix)
  await fs.mkdir(tempDir, { recursive: true })

  // Generate databricks.yml
  const databricksYml = generateDatabricksYml(industry, schemaPrefix, config)
  await fs.writeFile(path.join(tempDir, "databricks.yml"), databricksYml)

  // Copy mission content
  const contentDir = path.join(process.cwd(), "src", "content", "field-ops", industry)
  
  // Copy notebooks
  try {
    const notebooksDir = path.join(contentDir, "notebooks")
    const targetNotebooksDir = path.join(tempDir, "notebooks")
    await fs.mkdir(targetNotebooksDir, { recursive: true })
    const notebooks = await fs.readdir(notebooksDir)
    for (const notebook of notebooks) {
      await fs.copyFile(
        path.join(notebooksDir, notebook),
        path.join(targetNotebooksDir, notebook)
      )
    }
    console.log(`[Bundle] Copied ${notebooks.length} notebooks`)
  } catch (error) {
    console.warn(`Warning: Could not copy notebooks for ${industry}:`, error)
  }

  // Copy data files
  try {
    const dataDir = path.join(contentDir, "data")
    const targetDataDir = path.join(tempDir, "data")
    await fs.mkdir(targetDataDir, { recursive: true })
    const dataFiles = await fs.readdir(dataDir)
    for (const file of dataFiles) {
      await fs.copyFile(
        path.join(dataDir, file),
        path.join(targetDataDir, file)
      )
    }
    console.log(`[Bundle] Copied ${dataFiles.length} data files`)
  } catch (error) {
    console.warn(`Warning: Could not copy data files for ${industry}:`, error)
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
    // Extract schema prefix from bundle path
    const schemaPrefix = path.basename(bundlePath)
    console.log(`[Deploy] Starting deployment for ${schemaPrefix}`)

    // Create the three schemas
    const schemas = ["bronze", "silver", "gold"]
    for (const schema of schemas) {
      const fullSchemaName = `${schemaPrefix}_${schema}`
      console.log(`[Deploy] Creating schema: ${fullSchemaName}`)
      await createSchema(config, config.catalog, fullSchemaName)
    }

    // Create volume in bronze schema for raw data
    const bronzeSchema = `${schemaPrefix}_bronze`
    const volumeName = "raw_data"
    console.log(`[Deploy] Creating volume: ${bronzeSchema}.${volumeName}`)
    await createVolume(config, config.catalog, bronzeSchema, volumeName)

    // Upload data files to the volume
    const localDataDir = path.join(bundlePath, "data")
    try {
      const dataFiles = await fs.readdir(localDataDir)
      for (const file of dataFiles) {
        const localFilePath = path.join(localDataDir, file)
        const volumePath = `/Volumes/${config.catalog}/${bronzeSchema}/${volumeName}/${file}`
        console.log(`[Deploy] Uploading data file: ${file}`)
        try {
          await uploadFile(config, localFilePath, volumePath)
          console.log(`[Deploy] Successfully uploaded: ${file}`)
        } catch (uploadError) {
          console.error(`[Deploy] Failed to upload ${file}:`, uploadError)
          throw uploadError
        }
      }
    } catch (error) {
      // Only catch readdir failures (no data directory)
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        console.warn(`[Deploy] No data directory found at ${localDataDir}`)
      } else {
        throw error
      }
    }

    // Create workspace directory for notebooks
    // Use schemaPrefix to create unique folder per deployment
    const workspaceDir = `/Workspace/Shared/field-ops/${schemaPrefix}`
    console.log(`[Deploy] Creating workspace directory: ${workspaceDir}`)
    await createWorkspaceDirectory(config, workspaceDir)

    // Upload notebooks
    const localNotebooksDir = path.join(bundlePath, "notebooks")
    try {
      const notebooks = await fs.readdir(localNotebooksDir)
      for (const notebook of notebooks) {
        const localNotebookPath = path.join(localNotebooksDir, notebook)
        const notebookName = notebook.replace(/\.(py|sql|scala|r)$/i, "")
        const language = getNotebookLanguage(notebook)
        const workspacePath = `${workspaceDir}/${notebookName}`
        console.log(`[Deploy] Uploading notebook: ${notebookName}`)
        try {
          await uploadNotebook(config, localNotebookPath, workspacePath, language)
          console.log(`[Deploy] Successfully uploaded notebook: ${notebookName}`)
        } catch (uploadError) {
          console.error(`[Deploy] Failed to upload notebook ${notebookName}:`, uploadError)
          throw uploadError
        }
      }
    } catch (error) {
      // Only catch readdir failures (no notebooks directory)
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        console.warn(`[Deploy] No notebooks directory found at ${localNotebooksDir}`)
      } else {
        throw error
      }
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
 * Drops bronze/silver/gold schemas, deletes workspace notebooks directory,
 * and removes the local bundle directory.
 */
export async function destroyBundle(
  bundlePath: string,
  config: DatabricksConnection
): Promise<void> {
  // Extract schema prefix from bundle path
  const schemaPrefix = path.basename(bundlePath)

  // Drop all schemas (volumes are deleted implicitly with managed schemas)
  const schemas = ["bronze", "silver", "gold"]
  for (const schema of schemas) {
    const fullSchemaName = `${schemaPrefix}_${schema}`
    try {
      console.log(`[Cleanup] Dropping schema: ${config.catalog}.${fullSchemaName}`)
      await dropSchema(config, config.catalog, fullSchemaName)
      console.log(`[Cleanup] Dropped schema: ${fullSchemaName}`)
    } catch (error) {
      console.error(`[Cleanup] Failed to drop schema ${fullSchemaName}:`, error)
    }
  }

  // Delete workspace notebook directory
  const workspaceDir = `/Workspace/Shared/field-ops/${schemaPrefix}`
  try {
    console.log(`[Cleanup] Deleting workspace directory: ${workspaceDir}`)
    await deleteWorkspaceDirectory(config, workspaceDir)
    console.log(`[Cleanup] Deleted workspace directory: ${workspaceDir}`)
  } catch (error) {
    console.error(`[Cleanup] Failed to delete workspace directory:`, error)
  }

  // Clean up local bundle directory
  try {
    await fs.rm(bundlePath, { recursive: true, force: true })
  } catch (error) {
    console.error(`[Cleanup] Failed to remove local bundle directory ${bundlePath}:`, error)
  }
}

/**
 * Generate databricks.yml content for a Field Ops mission.
 */
function generateDatabricksYml(
  industry: Industry,
  schemaPrefix: string,
  config: DatabricksConnection
): string {
  return `# Databricks Asset Bundle for Field Ops: ${industry}
# Generated schema prefix: ${schemaPrefix}

bundle:
  name: field-ops-${industry}-\${schemaPrefix}

workspace:
  host: ${config.workspaceUrl}

resources:
  schemas:
    bronze:
      catalog_name: ${config.catalog}
      name: ${schemaPrefix}_bronze
      comment: "Bronze layer - raw data ingestion"
      
    silver:
      catalog_name: ${config.catalog}
      name: ${schemaPrefix}_silver
      comment: "Silver layer - cleaned and transformed data"
      
    gold:
      catalog_name: ${config.catalog}
      name: ${schemaPrefix}_gold
      comment: "Gold layer - aggregated business-ready data"

targets:
  dev:
    mode: development
    workspace:
      host: ${config.workspaceUrl}
`
}
