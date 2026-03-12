/**
 * Field Operations Bulk Cleanup API
 * POST /api/field-ops/cleanup
 * Cleans up all eligible deployment assets for the authenticated user.
 */

import { apiError, apiOk } from "@/lib/api/responses"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { decryptPat } from "@/lib/databricks"
import { databricksConnections, fieldOpsDeployments, getDb } from "@/lib/db"
import { cleanupDeployment, DeploymentConflictError } from "@/lib/field-ops/deployment"
import type { CleanupFailure } from "@/lib/field-ops/types"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

type DeploymentFailure = {
  deploymentId: string
  industry: string
  error: string
  failures?: CleanupFailure[]
}

function resolveRequestContext(
  request: Request
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

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const authResult = await authenticateApiRequest()
    if (!authResult.authenticated) {
      return apiError(authResult.error, authResult.status, "UNAUTHORIZED")
    }

    const requestContextResult = resolveRequestContext(request)
    if (!requestContextResult.ok) {
      return requestContextResult.response
    }

    const requestContext = requestContextResult.value

    const db = getDb()
    const userId = authResult.userId

    const [connection] = await db
      .select()
      .from(databricksConnections)
      .where(eq(databricksConnections.userId, userId))
      .limit(1)

    if (!connection) {
      return apiError("Databricks connection not configured", 400, "BAD_REQUEST")
    }

    const deployments = await db
      .select()
      .from(fieldOpsDeployments)
      .where(eq(fieldOpsDeployments.userId, userId))

    const eligibleDeployments = deployments.filter(
      (deployment) =>
        Boolean(deployment.bundlePath) &&
        deployment.status !== "cleaned_up" &&
        deployment.status !== "cleaning_up"
    )

    if (eligibleDeployments.length === 0) {
      return apiOk({
        message: "No eligible deployments found for cleanup.",
        attempted: 0,
        cleaned: 0,
        failed: 0,
        failures: [],
        metadata: {
          requestId: requestContext.requestId,
          correlationId: requestContext.correlationId,
        },
      })
    }

    const token = decryptPat(connection.encryptedPat)

    let cleaned = 0
    const failures: DeploymentFailure[] = []

    for (const deployment of eligibleDeployments) {
      const perDeploymentContext = {
        idempotencyKey: `${requestContext.idempotencyKey}:${deployment.id}`,
        requestId: requestContext.requestId,
        correlationId: requestContext.correlationId,
      }

      try {
        const cleanup = await cleanupDeployment(
          deployment.id,
          userId,
          {
            workspaceUrl: connection.workspaceUrl.replace(/\/+$/, ""),
            token,
            warehouseId: connection.warehouseId ?? "",
            catalog: deployment.catalogName,
          },
          perDeploymentContext
        )

        if (cleanup.result.success) {
          cleaned += 1
          continue
        }

        failures.push({
          deploymentId: deployment.id,
          industry: deployment.industry,
          error: "Cleanup partially failed",
          failures: cleanup.result.failures,
        })
      } catch (error) {
        const message =
          error instanceof DeploymentConflictError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Cleanup failed"

        failures.push({
          deploymentId: deployment.id,
          industry: deployment.industry,
          error: message,
        })
      }
    }

    const attempted = eligibleDeployments.length
    const failed = failures.length

    if (failed > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cleanup partially failed",
          errorCode: "CONFLICT",
          attempted,
          cleaned,
          failed,
          failures,
          metadata: {
            requestId: requestContext.requestId,
            correlationId: requestContext.correlationId,
          },
        },
        { status: 409 }
      )
    }

    return apiOk({
      message: `Cleaned up ${cleaned} deployment${cleaned === 1 ? "" : "s"}.`,
      attempted,
      cleaned,
      failed,
      failures: [],
      metadata: {
        requestId: requestContext.requestId,
        correlationId: requestContext.correlationId,
      },
    })
  } catch (error) {
    console.error("Bulk cleanup error", {
      message: error instanceof Error ? error.message : "Bulk cleanup failed",
    })
    return apiError(error instanceof Error ? error.message : "Bulk cleanup failed", 500, "INTERNAL_ERROR")
  }
}
