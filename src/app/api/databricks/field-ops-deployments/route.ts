/**
 * GET /api/databricks/field-ops-deployments
 * Lists all Field Ops deployments in user's Databricks workspace
 */

import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { decryptPat } from "@/lib/databricks"
import { listFieldOpsSchemas } from "@/lib/databricks/cli"
import { getDb, databricksConnections } from "@/lib/db"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate via session
    const authResult = await authenticateApiRequest()
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }
    const { userId } = authResult

    // Get user's connection
    const db = getDb()
    const [connection] = await db
      .select()
      .from(databricksConnections)
      .where(eq(databricksConnections.userId, userId))
      .limit(1)

    if (!connection) {
      return NextResponse.json({ deployments: [], error: "No Databricks connection" })
    }

    const config = {
      workspaceUrl: connection.workspaceUrl.replace(/\/+$/, ""),
      token: decryptPat(connection.encryptedPat),
      warehouseId: connection.warehouseId ?? "",
      catalog: connection.catalogName ?? "main",
    }

    // Get all Field Ops schemas
    const deployments = await listFieldOpsSchemas(config, config.catalog)

    return NextResponse.json({ deployments })
  } catch (error) {
    console.error("[api/field-ops-deployments] Error:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: "Failed to fetch deployments", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
