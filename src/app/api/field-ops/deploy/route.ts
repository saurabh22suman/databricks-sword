/**
 * Field Operations Deploy API
 * POST /api/field-ops/deploy
 * Start a new Field Ops deployment.
 */

import { getUserSandbox } from "@/app/api/user/helpers"
import { auth } from "@/lib/auth"
import { decryptPat } from "@/lib/databricks"
import { databricksConnections, getDb, users } from "@/lib/db"
import { startDeployment } from "@/lib/field-ops/deployment"
import { getIndustryConfig, isIndustryUnlocked } from "@/lib/field-ops/industries"
import type { Industry } from "@/lib/field-ops/types"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get user from database
    const db = getDb()
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { industry } = body as { industry: Industry }

    if (!industry) {
      return NextResponse.json({ error: "Industry is required" }, { status: 400 })
    }

    // Get industry config and check if unlocked
    const config = getIndustryConfig(industry)
    
    // Get user XP from sandbox
    let userXp = 0
    try {
      const sandbox = await getUserSandbox(userId)
      if (sandbox) {
        userXp = sandbox.userStats.totalXp
      }
    } catch (error) {
      console.error("Error fetching user sandbox:", error)
    }
    
    if (!isIndustryUnlocked(industry, userXp)) {
      return NextResponse.json(
        { error: `Industry locked. Requires ${config.xpRequired} XP.` },
        { status: 403 }
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

    // Decrypt PAT and build config
    const databricksConfig = {
      workspaceUrl: connection.workspaceUrl.replace(/\/+$/, ""),
      token: decryptPat(connection.encryptedPat),
      warehouseId: connection.warehouseId ?? "",
      catalog: "dev", // Use dev catalog for Field Ops
    }

    // Start deployment
    const deployment = await startDeployment(user.id, industry, databricksConfig)

    return NextResponse.json({
      success: true,
      deployment: {
        id: deployment.id,
        industry: deployment.industry,
        status: deployment.status,
        schemaPrefix: deployment.schemaPrefix,
      },
    })
  } catch (error) {
    console.error("Deploy error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Deployment failed" },
      { status: 500 }
    )
  }
}
