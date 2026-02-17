/**
 * Field Operations Cleanup API
 * POST /api/field-ops/cleanup/[deploymentId]
 * Clean up deployment resources (drop schemas, remove bundle).
 */

import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { decryptPat } from "@/lib/databricks"
import { databricksConnections, getDb } from "@/lib/db"
import { cleanupDeployment, getDeploymentStatus } from "@/lib/field-ops/deployment"
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
    const authResult = await authenticateApiRequest()
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const db = getDb()
    const userId = authResult.userId

    const { deploymentId } = await context.params

    // Get deployment
    const deployment = await getDeploymentStatus(deploymentId)
    if (!deployment) {
      return NextResponse.json({ error: "Deployment not found" }, { status: 404 })
    }

    // Check deployment belongs to user
    if (deployment.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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

    // Clean up deployment
    await cleanupDeployment(deploymentId, databricksConfig)

    return NextResponse.json({
      success: true,
      message: "Deployment cleaned up successfully",
    })
  } catch (error) {
    console.error("Cleanup error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cleanup failed" },
      { status: 500 }
    )
  }
}
