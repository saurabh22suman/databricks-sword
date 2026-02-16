/**
 * Databricks Asset Bundle (DAB) Management
 * Handles bundle generation, deployment, and cleanup for Field Operations.
 */

import fs from "fs/promises"
import path from "path"
import type { Industry, DeploymentResult, DatabricksConnection } from "../field-ops/types"
import { createSchema, dropSchema } from "./cli"

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

  // Create temp directory for bundle
  const tempDir = path.join(process.cwd(), ".temp", "bundles", schemaPrefix)
  await fs.mkdir(tempDir, { recursive: true })

  // Generate databricks.yml
  const databricksYml = generateDatabricksYml(industry, schemaPrefix, config)
  await fs.writeFile(path.join(tempDir, "databricks.yml"), databricksYml)

  // Copy mission content
  const contentDir = path.join(process.cwd(), "src", "content", "field-ops", industry)
  
  try {
    // Copy notebooks
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

    // Copy data files
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
  } catch (error) {
    // Content might not exist yet - that's ok for now
    console.warn(`Warning: Could not copy content for ${industry}:`, error)
  }

  return tempDir
}

/**
 * Deploy a generated bundle to Databricks.
 * Creates schemas and runs initial setup.
 */
export async function deployBundle(
  bundlePath: string,
  config: DatabricksConnection
): Promise<DeploymentResult> {
  try {
    // Extract schema prefix from bundle path
    const schemaPrefix = path.basename(bundlePath)

    // Create the three schemas
    const schemas = ["bronze", "silver", "gold"]
    for (const schema of schemas) {
      const fullSchemaName = `${schemaPrefix}_${schema}`
      await createSchema(config, config.catalog, fullSchemaName)
    }

    return {
      success: true,
      bundlePath,
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : "Deployment failed",
    }
  }
}

/**
 * Destroy a deployed bundle and clean up all resources.
 */
export async function destroyBundle(
  bundlePath: string,
  config: DatabricksConnection
): Promise<void> {
  // Extract schema prefix from bundle path
  const schemaPrefix = path.basename(bundlePath)

  // Drop all schemas
  const schemas = ["bronze", "silver", "gold"]
  for (const schema of schemas) {
    const fullSchemaName = `${schemaPrefix}_${schema}`
    try {
      await dropSchema(config, config.catalog, fullSchemaName)
    } catch (error) {
      console.error(`Failed to drop schema ${fullSchemaName}:`, error)
    }
  }

  // Clean up local bundle directory
  try {
    await fs.rm(bundlePath, { recursive: true, force: true })
  } catch (error) {
    console.error(`Failed to remove bundle directory ${bundlePath}:`, error)
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
