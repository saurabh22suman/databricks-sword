/**
 * Field Operations Deploy API
 * POST /api/field-ops/deploy
 * Start a new Field Ops deployment.
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDb, users, databricksConnections } from "@/lib/db"
import { eq } from "drizzle-orm"
import { startDeployment } from "@/lib/field-ops/deployment"
import { getIndustryConfig, isIndustryUnlocked } from "@/lib/field-ops/industries"
import type { Industry } from "@/lib/field-ops/types"

export async function POST(request: NextRequest): Promise<NextResponse> {
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

    // Parse request body
    const body = await request.json()
    const { industry } = body as { industry: Industry }

    if (!industry) {
      return NextResponse.json({ error: "Industry is required" }, { status: 400 })
    }

    // Get industry config and check if unlocked
    const config = getIndustryConfig(industry)
    
    // TODO: Get user XP from sandbox or profile
    const userXp = 0 // Placeholder
    
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

    // TODO: Decrypt PAT
    const databricksConfig = {
      workspaceUrl: connection.workspaceUrl,
      token: connection.encryptedPat, // TODO: Decrypt this
      warehouseId: "", // TODO: Add warehouse ID to connection
      catalog: "default",
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
