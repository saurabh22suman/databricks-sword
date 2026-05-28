/**
 * POST /api/databricks/field-ops-deployments/delete
 * Delete selected Field Ops deployments
 */

import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { decryptPat } from "@/lib/databricks"
import { dropSchema } from "@/lib/databricks/cli"
import { getDb, databricksConnections } from "@/lib/db"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const deleteRequestSchema = z.object({
  schemaNames: z.array(z.string()).min(1),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate via session
    const authResult = await authenticateApiRequest()
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }
    const { userId } = authResult

    // Parse request
    const body = await request.json()
    const parsed = deleteRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
    }
    const { schemaNames } = parsed.data

    // Get user's connection
    const db = getDb()
    const [connection] = await db
      .select()
      .from(databricksConnections)
      .where(eq(databricksConnections.userId, userId))
      .limit(1)

    if (!connection) {
      return NextResponse.json({ error: "No Databricks connection" }, { status: 400 })
    }

    const config = {
      workspaceUrl: connection.workspaceUrl.replace(/\/+$/, ""),
      token: decryptPat(connection.encryptedPat),
      warehouseId: connection.warehouseId ?? "",
      catalog: connection.catalogName ?? "main",
    }

    // Import dynamically to avoid issues
    const { dropSchema } = await import("@/lib/databricks/cli")

    const results: { schemaName: string; success: boolean; error?: string }[] = []

    // Delete each schema
    for (const schemaName of schemaNames) {
      try {
        console.log(`[Delete] Dropping schema: ${config.catalog}.${schemaName}`)
        await dropSchema(config, config.catalog, schemaName)
        results.push({ schemaName, success: true })
      } catch (error) {
        results.push({
          schemaName,
          success: false,
          error: error instanceof Error ? error.message : "Failed to delete",
        })
      }
    }

    const failed = results.filter((r) => !r.success)
    if (failed.length > 0) {
      return NextResponse.json(
        {
          message: `Deleted ${results.length - failed.length}/${results.length} deployments`,
          results,
        },
        { status: 207 } // 207 Multi-Status
      )
    }

    return NextResponse.json({
      message: `Successfully deleted ${results.length} deployments`,
      results,
    })
  } catch (error) {
    console.error("[api/field-ops-deployments/delete] Error:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: "Failed to delete deployments", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
