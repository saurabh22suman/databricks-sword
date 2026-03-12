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
import { DeploymentConflictError, startDeployment } from "@/lib/field-ops/deployment"
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

function parseAssetError(error: unknown):
  | { missingNotebooks: string[]; missingDataFiles: string[] }
  | null {
  if (!(error instanceof Error)) {
    return null
  }

  try {
    const parsed = JSON.parse(error.message) as {
      code?: string
      missingNotebooks?: string[]
      missingDataFiles?: string[]
    }

    if (parsed.code === "MISSING_REQUIRED_ASSETS") {
      return {
        missingNotebooks: parsed.missingNotebooks ?? [],
        missingDataFiles: parsed.missingDataFiles ?? [],
      }
    }

    return null
  } catch {
    return null
  }
}

function resolveRequestContext(
  request: NextRequest
):
  | {
      ok: true
      value: {
        idempotencyKey: string
        requestId: string
        correlationId: string
      }
    }
  | {
      ok: false
      response: NextResponse
    } {
  const idempotencyKey = request.headers.get("idempotency-key")?.trim()
  if (!idempotencyKey) {
    return {
      ok: false,
      response: apiError("Missing required Idempotency-Key header", 400, "BAD_REQUEST"),
    }
  }

  const requestId = request.headers.get("x-request-id")?.trim() || crypto.randomUUID()
  const correlationId = request.headers.get("x-correlation-id")?.trim() || requestId

  return {
    ok: true,
    value: { idempotencyKey, requestId, correlationId },
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await authenticateApiRequest()
    if (!authResult.authenticated) {
      return apiError(authResult.error, authResult.status, "UNAUTHORIZED")
    }

    const userId = authResult.userId
    const requestContextResult = resolveRequestContext(request)
    if (!requestContextResult.ok) {
      return requestContextResult.response
    }
    const context = requestContextResult.value

    const db = getDb()
    const parsedBody = deployRequestSchema.safeParse(await request.json())
    if (!parsedBody.success) {
      return apiError("Invalid deploy request payload", 400, "VALIDATION_ERROR")
    }
    const { industry } = parsedBody.data as { industry: Industry }

    const config = getIndustryConfig(industry)

    let userXp = 0
    try {
      const sandbox = await getUserSandbox(userId)
      if (sandbox) {
        userXp = sandbox.userStats.totalXp
      }
    } catch (error) {
      console.error("Error fetching user sandbox", {
        requestId: context.requestId,
        correlationId: context.correlationId,
        message: error instanceof Error ? error.message : "Unknown sandbox fetch error",
      })
    }

    if (!isIndustryUnlocked(industry, userXp)) {
      return apiError(`Industry locked. Requires ${config.xpRequired} XP.`, 403, "FORBIDDEN")
    }

    const [connection] = await db
      .select()
      .from(databricksConnections)
      .where(eq(databricksConnections.userId, userId))
      .limit(1)

    if (!connection) {
      return apiError("Databricks connection not configured", 400, "BAD_REQUEST")
    }

    const warehouseId = connection.warehouseId?.trim()
    if (!warehouseId) {
      return apiError(
        "Databricks warehouse is required. Configure a SQL warehouse in Settings.",
        400,
        "BAD_REQUEST"
      )
    }

    const catalogName = connection.catalogName?.trim()
    if (!catalogName) {
      return apiError(
        "Databricks catalog is required. Configure a Unity Catalog in Settings.",
        400,
        "BAD_REQUEST"
      )
    }

    const databricksConfig = {
      workspaceUrl: connection.workspaceUrl.replace(/\/+$/, ""),
      token: decryptPat(connection.encryptedPat),
      warehouseId,
      catalog: catalogName,
    }

    const orchestration = await startDeployment(userId, industry, databricksConfig, context)

    return apiOk({
      deployment: {
        id: orchestration.deployment.id,
        industry: orchestration.deployment.industry,
        status: orchestration.deployment.status,
        schemaPrefix: orchestration.deployment.schemaPrefix,
      },
      metadata: {
        requestId: orchestration.requestId,
        correlationId: orchestration.correlationId,
        operationId: orchestration.operationId,
        replayed: orchestration.replayed,
      },
    })
  } catch (error) {
    const assetError = parseAssetError(error)
    if (assetError) {
      return apiError("Required mission assets are missing", 400, "VALIDATION_ERROR")
    }

    if (error instanceof DeploymentConflictError) {
      return apiError(error.message, 409, "CONFLICT")
    }

    console.error("Deploy error", {
      message: error instanceof Error ? error.message : "Unknown deploy error",
    })
    return apiError(error instanceof Error ? error.message : "Deployment failed", 500, "INTERNAL_ERROR")
  }
}
