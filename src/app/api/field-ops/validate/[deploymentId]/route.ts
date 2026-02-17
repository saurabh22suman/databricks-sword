/**
 * Field Operations Validate API
 * POST /api/field-ops/validate/[deploymentId]
 * Run validation queries for a deployment.
 */

import { auth } from "@/lib/auth"
import { decryptPat } from "@/lib/databricks"
import { databricksConnections, getDb, users } from "@/lib/db"
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
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user from database
    const db = getDb()
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { deploymentId } = await context.params

    // Get deployment
    const deployment = await getDeploymentStatus(deploymentId)
    if (!deployment) {
      return NextResponse.json({ error: "Deployment not found" }, { status: 404 })
    }

    // Check deployment belongs to user
    if (deployment.userId !== user.id) {
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
      .where(eq(databricksConnections.userId, user.id))
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
    console.error("Validation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Validation failed" },
      { status: 500 }
    )
  }
}
