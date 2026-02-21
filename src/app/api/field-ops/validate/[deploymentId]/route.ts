/**
 * Field Operations Validate API
 * POST /api/field-ops/validate/[deploymentId]
 * Run validation queries for a deployment.
 */

import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { decryptPat } from "@/lib/databricks"
import { databricksConnections, getDb } from "@/lib/db"
import { getDeploymentStatus, updateDeploymentStatus } from "@/lib/field-ops/deployment"
import { runValidation } from "@/lib/field-ops/validation"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

type RouteContext = {
  params: Promise<{ deploymentId: string }>
}

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  let deploymentId: string | null = null
  let shouldRecoverToDeployed = false

  try {
    const authResult = await authenticateApiRequest()
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const db = getDb()
    const userId = authResult.userId

    const params = await context.params
    deploymentId = params.deploymentId

    // Get deployment
    const deployment = await getDeploymentStatus(deploymentId)
    if (!deployment) {
      return NextResponse.json({ error: "Deployment not found" }, { status: 404 })
    }

    // Check deployment belongs to user
    if (deployment.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check deployment is in correct state
    if (deployment.status !== "deployed") {
      return NextResponse.json(
        { error: "Deployment must be in 'deployed' state" },
        { status: 400 }
      )
    }

    // Get Databricks connection
    const [connection] = await db
      .select()
      .from(databricksConnections)
      .where(eq(databricksConnections.userId, userId))
      .limit(1)

    if (!connection) {
      return NextResponse.json(
        { error: "Databricks connection not configured" },
        { status: 400 }
      )
    }

    const databricksConfig = {
      workspaceUrl: connection.workspaceUrl.replace(/\/+$/, ""),
      token: decryptPat(connection.encryptedPat),
      warehouseId: connection.warehouseId ?? "",
      catalog: deployment.catalogName,
    }

    // Update status to validating
    await updateDeploymentStatus(deploymentId, "validating")
    shouldRecoverToDeployed = true

    // Run validations
    const results = await runValidation(
      deploymentId,
      deployment.industry,
      deployment.catalogName,
      deployment.schemaPrefix,
      databricksConfig
    )

    // Update status back to deployed
    await updateDeploymentStatus(deploymentId, "deployed")
    shouldRecoverToDeployed = false

    return NextResponse.json({
      success: true,
      results: results.map((r) => ({
        checkName: r.checkName,
        passed: r.passed,
        errorMessage: r.errorMessage,
      })),
      allPassed: results.every((r) => r.passed),
    })
  } catch (error) {
    if (deploymentId && shouldRecoverToDeployed) {
      try {
        await updateDeploymentStatus(deploymentId, "deployed")
      } catch (recoveryError) {
        console.error("Validation status recovery error:", recoveryError)
      }
    }

    console.error("Validation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Validation failed" },
      { status: 500 }
    )
  }
}
