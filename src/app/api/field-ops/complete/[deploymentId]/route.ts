/**
 * Field Operations Complete API
 * POST /api/field-ops/complete/[deploymentId]
 * Mark mission as complete and award XP.
 */

import { apiError, apiOk } from "@/lib/api/responses"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { fieldOpsCompletions, getDb } from "@/lib/db"
import {
  allValidationsPassed,
  completeDeployment,
  getDeploymentStatus,
} from "@/lib/field-ops/deployment"
import { getIndustryConfig } from "@/lib/field-ops/industries"
import { and, eq } from "drizzle-orm"
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

    const requestContextResult = resolveRequestContext(request)
    if (!requestContextResult.ok) {
      return requestContextResult.response
    }

    const requestContext = requestContextResult.value
    const userId = authResult.userId

    const { deploymentId } = await context.params

    const deployment = await getDeploymentStatus(deploymentId)
    if (!deployment) {
      return apiError("Deployment not found", 404, "NOT_FOUND")
    }

    if (deployment.userId !== userId) {
      return apiError("Forbidden", 403, "FORBIDDEN")
    }

    const passed = await allValidationsPassed(deploymentId)
    if (!passed) {
      return apiError(
        "All validations from the latest run must pass before completing",
        400,
        "BAD_REQUEST"
      )
    }

    const config = getIndustryConfig(deployment.industry)
    const db = getDb()

    const existing = await db
      .select()
      .from(fieldOpsCompletions)
      .where(
        and(
          eq(fieldOpsCompletions.userId, userId),
          eq(fieldOpsCompletions.industry, deployment.industry)
        )
      )
      .limit(1)

    const alreadyAwarded = existing.length > 0

    if (!alreadyAwarded) {
      await db
        .insert(fieldOpsCompletions)
        .values({
          userId,
          deploymentId,
          industry: deployment.industry,
          xpAwarded: config.xpReward,
        })
        .onConflictDoNothing({
          target: [fieldOpsCompletions.userId, fieldOpsCompletions.industry],
        })
    }

    const completed = await completeDeployment(deploymentId)

    const [ledger] = await db
      .select()
      .from(fieldOpsCompletions)
      .where(
        and(
          eq(fieldOpsCompletions.userId, userId),
          eq(fieldOpsCompletions.industry, deployment.industry)
        )
      )
      .limit(1)

    return apiOk({
      xpAwarded: ledger?.xpAwarded ?? config.xpReward,
      alreadyAwarded,
      completedAt: completed.completedAt,
      metadata: {
        requestId: requestContext.requestId,
        correlationId: requestContext.correlationId,
      },
    })
  } catch (error) {
    console.error("Complete error:", error)
    return apiError(
      error instanceof Error ? error.message : "Failed to complete mission",
      500,
      "INTERNAL_ERROR"
    )
  }
}
