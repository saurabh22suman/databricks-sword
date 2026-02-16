/**
 * Field Operations Deployment Management
 * Orchestrates the deployment lifecycle for Field Ops missions.
 */

import { getDb, fieldOpsDeployments, fieldOpsValidations } from "../db"
import { eq, and } from "drizzle-orm"
import type {
  Industry,
  Deployment,
  DeploymentStatus,
  DatabricksConnection,
} from "./types"
import { generateBundle, deployBundle, destroyBundle } from "../databricks/bundle"

/**
 * Start a new Field Ops deployment.
 */
export async function startDeployment(
  userId: string,
  industry: Industry,
  config: DatabricksConnection
): Promise<Deployment> {
  // Generate and deploy bundle
  const bundlePath = await generateBundle(industry, userId, config)
  const schemaPrefix = bundlePath.split("/").pop()!

  // Create deployment record
  const db = getDb()
  const [deployment] = await db
    .insert(fieldOpsDeployments)
    .values({
      userId,
      industry,
      status: "deploying",
      catalogName: config.catalog,
      schemaPrefix,
      warehouseId: config.warehouseId,
      workspaceUrl: config.workspaceUrl,
      bundlePath,
    })
    .returning()

  // Deploy the bundle
  try {
    const result = await deployBundle(bundlePath, config)

    if (result.success) {
      // Update status to deployed
      const [updated] = await db
        .update(fieldOpsDeployments)
        .set({
          status: "deployed",
          deployedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(fieldOpsDeployments.id, deployment.id))
        .returning()

      return updated as Deployment
    } else {
      // Mark as failed
      await db
        .update(fieldOpsDeployments)
        .set({
          status: "failed",
          errorMessage: result.errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(fieldOpsDeployments.id, deployment.id))

      throw new Error(result.errorMessage || "Deployment failed")
    }
  } catch (error) {
    // Mark as failed
    await db
      .update(fieldOpsDeployments)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        updatedAt: new Date(),
      })
      .where(eq(fieldOpsDeployments.id, deployment.id))

    throw error
  }
}

/**
 * Get deployment status and details.
 */
export async function getDeploymentStatus(
  deploymentId: string
): Promise<Deployment | null> {
  const db = getDb()
  const [deployment] = await db
    .select()
    .from(fieldOpsDeployments)
    .where(eq(fieldOpsDeployments.id, deploymentId))
    .limit(1)

  return (deployment as Deployment) || null
}

/**
 * Get active deployment for a user and industry.
 */
export async function getActiveDeployment(
  userId: string,
  industry: Industry
): Promise<Deployment | null> {
  const db = getDb()
  const [deployment] = await db
    .select()
    .from(fieldOpsDeployments)
    .where(
      and(
        eq(fieldOpsDeployments.userId, userId),
        eq(fieldOpsDeployments.industry, industry),
        eq(fieldOpsDeployments.status, "deployed")
      )
    )
    .limit(1)

  return (deployment as Deployment) || null
}

/**
 * Update deployment status.
 */
export async function updateDeploymentStatus(
  deploymentId: string,
  status: DeploymentStatus,
  errorMessage?: string
): Promise<void> {
  const db = getDb()
  await db
    .update(fieldOpsDeployments)
    .set({
      status,
      errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(fieldOpsDeployments.id, deploymentId))
}

/**
 * Mark deployment as completed and award XP.
 */
export async function completeDeployment(
  deploymentId: string
): Promise<Deployment> {
  const db = getDb()
  const [updated] = await db
    .update(fieldOpsDeployments)
    .set({
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(fieldOpsDeployments.id, deploymentId))
    .returning()

  return updated as Deployment
}

/**
 * Clean up a deployment (drop schemas, remove bundle).
 */
export async function cleanupDeployment(
  deploymentId: string,
  config: DatabricksConnection
): Promise<void> {
  const deployment = await getDeploymentStatus(deploymentId)
  if (!deployment || !deployment.bundlePath) {
    throw new Error("Deployment not found or already cleaned up")
  }

  // Update status to cleaning_up
  await updateDeploymentStatus(deploymentId, "cleaning_up")

  try {
    // Destroy bundle and drop schemas
    await destroyBundle(deployment.bundlePath, config)

    const db = getDb()
    // Update status to cleaned_up
    await db
      .update(fieldOpsDeployments)
      .set({
        status: "cleaned_up",
        cleanedUpAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(fieldOpsDeployments.id, deploymentId))
  } catch (error) {
    await updateDeploymentStatus(
      deploymentId,
      "failed",
      `Cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`
    )
    throw error
  }
}

/**
 * Get validation results for a deployment.
 */
export async function getValidationResults(deploymentId: string) {
  const db = getDb()
  return await db
    .select()
    .from(fieldOpsValidations)
    .where(eq(fieldOpsValidations.deploymentId, deploymentId))
}

/**
 * Check if all validations have passed.
 */
export async function allValidationsPassed(deploymentId: string): Promise<boolean> {
  const results = await getValidationResults(deploymentId)
  return results.length > 0 && results.every((r: { passed: boolean }) => r.passed)
}
