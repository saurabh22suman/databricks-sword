/**
 * Field Operations Cleanup API
 * POST /api/field-ops/cleanup/[deploymentId]
 * Clean up deployment resources (drop schemas, remove bundle).
 */

import { apiError, apiOk } from "@/lib/api/responses"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { decryptPat } from "@/lib/databricks"
import { databricksConnections, getDb } from "@/lib/db"
import {
  cleanupDeployment,
  DeploymentConflictError,
  getDeploymentStatus,
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

    const { deploymentId } = await context.params

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

    const cleanup = await cleanupDeployment(deploymentId, userId, databricksConfig, requestContext)

    if (!cleanup.result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Cleanup partially failed",
          errorCode: "CONFLICT",
          failures: cleanup.result.failures,
          metadata: {
            requestId: cleanup.requestId,
            correlationId: cleanup.correlationId,
            operationId: cleanup.operationId,
            replayed: cleanup.replayed,
          },
        },
        { status: 409 }
      )
    }

    return apiOk({
      message: "Deployment cleaned up successfully",
      failures: [],
      metadata: {
        requestId: cleanup.requestId,
        correlationId: cleanup.correlationId,
        operationId: cleanup.operationId,
        replayed: cleanup.replayed,
      },
    })
  } catch (error) {
    if (error instanceof DeploymentConflictError) {
      return apiError(error.message, 409, "CONFLICT")
    }

    console.error("Cleanup error", {
      message: error instanceof Error ? error.message : "Cleanup failed",
    })
    return apiError(error instanceof Error ? error.message : "Cleanup failed", 500, "INTERNAL_ERROR")
  }
}
