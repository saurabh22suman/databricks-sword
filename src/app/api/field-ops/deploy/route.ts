/**
 * Field Operations Deploy API
 * POST /api/field-ops/deploy
 * Start a new Field Ops deployment.
 */

import { getUserSandbox } from "@/app/api/user/helpers"
import { apiError, apiOk } from "@/lib/api/responses"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { decryptPat } from "@/lib/databricks"
import { databricksConnections, getDb } from "@/lib/db"
import { startDeployment } from "@/lib/field-ops/deployment"
import { getIndustryConfig, isIndustryUnlocked } from "@/lib/field-ops/industries"
import type { Industry } from "@/lib/field-ops/types"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const deployRequestSchema = z.object({
  industry: z.enum([
    "retail",
    "gaming",
    "healthcare",
    "fintech",
    "automotive",
    "manufacturing",
    "telecom",
    "agritech",
  ]),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await authenticateApiRequest()
    if (!authResult.authenticated) {
      return apiError(authResult.error, authResult.status, "UNAUTHORIZED")
    }

    const userId = authResult.userId

    const db = getDb()
    const parsedBody = deployRequestSchema.safeParse(await request.json())
    if (!parsedBody.success) {
      return apiError("Invalid deploy request payload", 400, "VALIDATION_ERROR")
    }
    const { industry } = parsedBody.data as { industry: Industry }

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
      return apiError(`Industry locked. Requires ${config.xpRequired} XP.`, 403, "FORBIDDEN")
    }

    // Get Databricks connection
    const [connection] = await db
      .select()
      .from(databricksConnections)
      .where(eq(databricksConnections.userId, userId))
      .limit(1)

    if (!connection) {
      return apiError("Databricks connection not configured", 400, "BAD_REQUEST")
    }

    // Decrypt PAT and build config
    const databricksConfig = {
      workspaceUrl: connection.workspaceUrl.replace(/\/+$/, ""),
      token: decryptPat(connection.encryptedPat),
      warehouseId: connection.warehouseId ?? "",
      catalog: "dev", // Use dev catalog for Field Ops
    }

    // Start deployment
    const deployment = await startDeployment(userId, industry, databricksConfig)

    return apiOk({
      deployment: {
        id: deployment.id,
        industry: deployment.industry,
        status: deployment.status,
        schemaPrefix: deployment.schemaPrefix,
      },
    })
  } catch (error) {
    console.error("Deploy error:", error)
    return apiError(error instanceof Error ? error.message : "Deployment failed", 500, "INTERNAL_ERROR")
  }
}
