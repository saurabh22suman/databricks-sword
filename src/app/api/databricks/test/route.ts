/**
 * Databricks Connection Test API
 * POST /api/databricks/test
 * Test Databricks connection with provided credentials.
 */

import { apiError, apiOk } from "@/lib/api/responses"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { testConnection } from "@/lib/databricks/cli"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const testConnectionRequestSchema = z.object({
  workspaceUrl: z.string().url(),
  token: z.string().min(1),
  warehouseId: z.string().min(1),
  catalog: z.string().min(1).optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await authenticateApiRequest()
    if (!authResult.authenticated) {
      return apiError(authResult.error, authResult.status, "UNAUTHORIZED")
    }

    const parsedBody = testConnectionRequestSchema.safeParse(await request.json())
    if (!parsedBody.success) {
      return apiError("Invalid Databricks connection payload", 400, "VALIDATION_ERROR")
    }
    const { workspaceUrl, token, warehouseId, catalog } = parsedBody.data

    // Test connection
    const result = await testConnection({
      workspaceUrl,
      token,
      warehouseId,
      catalog: catalog || "default",
    })

    if (result.success) {
      return apiOk({
        message: "Connection successful",
      })
    }

    return apiError(result.errorMessage || "Connection failed", 400, "BAD_REQUEST")
  } catch (error) {
    console.error("Connection test error:", error)
    return apiError(error instanceof Error ? error.message : "Connection test failed", 500, "INTERNAL_ERROR")
  }
}
