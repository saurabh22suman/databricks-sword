/**
 * Field Operations Cleanup API
 * POST /api/field-ops/cleanup/[deploymentId]
 * Clean up deployment resources (drop schemas, remove bundle).
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDb, users, databricksConnections } from "@/lib/db"
import { eq } from "drizzle-orm"
import { getDeploymentStatus, cleanupDeployment } from "@/lib/field-ops/deployment"

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
      workspaceUrl: connection.workspaceUrl,
      token: connection.encryptedPat, // TODO: Decrypt
      warehouseId: "", // TODO: Add to schema
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
