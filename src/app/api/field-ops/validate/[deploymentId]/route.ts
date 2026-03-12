/**
 * Field Operations Validate API
 * POST /api/field-ops/validate/[deploymentId]
 * Run validation queries for a deployment.
 */

import { apiError, apiOk } from "@/lib/api/responses"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { decryptPat } from "@/lib/databricks"
import { databricksConnections, getDb } from "@/lib/db"
import {
  DeploymentConflictError,
  getDeploymentStatus,
  validateDeployment,
} from "@/lib/field-ops/deployment"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

type RouteContext = {
  params: Promise<{ deploymentId: string }>
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

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const authResult = await authenticateApiRequest()
    if (!authResult.authenticated) {
      return apiError(authResult.error, authResult.status, "UNAUTHORIZED")
    }

    const db = getDb()
    const userId = authResult.userId
    const requestContextResult = resolveRequestContext(request)
    if (!requestContextResult.ok) {
      return requestContextResult.response
    }
    const requestContext = requestContextResult.value

    const params = await context.params
    const deploymentId = params.deploymentId

    const deployment = await getDeploymentStatus(deploymentId)
    if (!deployment) {
      return apiError("Deployment not found", 404, "NOT_FOUND")
    }

    if (deployment.userId !== userId) {
      return apiError("Forbidden", 403, "FORBIDDEN")
    }

    const [connection] = await db
      .select()
      .from(databricksConnections)
      .where(eq(databricksConnections.userId, userId))
      .limit(1)

    if (!connection) {
      return apiError("Databricks connection not configured", 400, "BAD_REQUEST")
    }

    const databricksConfig = {
      workspaceUrl: connection.workspaceUrl.replace(/\/+$/, ""),
      token: decryptPat(connection.encryptedPat),
      warehouseId: connection.warehouseId ?? "",
      catalog: deployment.catalogName,
    }

    const validation = await validateDeployment(deploymentId, userId, databricksConfig, requestContext)

    return apiOk({
      runId: validation.runId,
      results: validation.results.map((r) => ({
        checkKey: r.checkKey,
        checkName: r.checkName,
        passed: r.passed,
        errorMessage: r.errorMessage,
      })),
      allPassed: validation.allPassed,
      metadata: {
        requestId: validation.requestId,
        correlationId: validation.correlationId,
        operationId: validation.operationId,
        replayed: validation.replayed,
      },
    })
  } catch (error) {
    if (error instanceof DeploymentConflictError) {
      return apiError(error.message, 409, "CONFLICT")
    }

    console.error("Validation error", {
      message: error instanceof Error ? error.message : "Validation failed",
    })
    return apiError(error instanceof Error ? error.message : "Validation failed", 500, "INTERNAL_ERROR")
  }
}
