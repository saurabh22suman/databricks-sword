/**
 * Field Operations Status API
 * GET /api/field-ops/status/[deploymentId]
 * Get deployment status and validation results.
 */

import { apiError, apiOk } from "@/lib/api/responses"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import {
  getDeploymentOperations,
  getDeploymentStatus,
  getLatestValidationRun,
  markStaleDeploymentOperations,
} from "@/lib/field-ops/deployment"
import { NextRequest, NextResponse } from "next/server"

type RouteContext = {
  params: Promise<{ deploymentId: string }>
}

function resolveRequestId(request: NextRequest): string {
  return request.headers.get("x-request-id")?.trim() || crypto.randomUUID()
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const authResult = await authenticateApiRequest()
    if (!authResult.authenticated) {
      return apiError(authResult.error, authResult.status, "UNAUTHORIZED")
    }

    const requestId = resolveRequestId(request)
    const { deploymentId } = await context.params

    const deployment = await getDeploymentStatus(deploymentId)
    if (!deployment) {
      return apiError("Deployment not found", 404, "NOT_FOUND")
    }

    if (deployment.userId !== authResult.userId) {
      return apiError("Forbidden", 403, "FORBIDDEN")
    }

    const staleMarked = await markStaleDeploymentOperations(deploymentId)
    const latestRun = await getLatestValidationRun(deploymentId)
    const operations = await getDeploymentOperations(deploymentId, 5)

    return apiOk({
      deployment: {
        id: deployment.id,
        industry: deployment.industry,
        status: deployment.status,
        schemaPrefix: deployment.schemaPrefix,
        deployedAt: deployment.deployedAt,
        completedAt: deployment.completedAt,
        errorMessage: deployment.errorMessage,
        workspaceUrl: deployment.workspaceUrl,
        catalogName: deployment.catalogName,
        warehouseId: deployment.warehouseId,
      },
      validationRun: latestRun
        ? {
            runId: latestRun.runId,
            totalChecks: latestRun.results.length,
            passedChecks: latestRun.results.filter((result) => result.passed).length,
          }
        : null,
      validations: (latestRun?.results ?? []).map((v) => ({
        checkKey: v.checkKey,
        checkName: v.checkName,
        passed: v.passed,
        executedAt: v.executedAt,
        errorMessage: v.errorMessage,
      })),
      operations: operations.map((operation) => ({
        id: operation.id,
        type: operation.operationType,
        state: operation.state,
        requestId: operation.requestId,
        correlationId: operation.correlationId,
        startedAt: operation.startedAt,
        completedAt: operation.completedAt,
        durationMs: operation.durationMs,
        failureClass: operation.failureClass,
        retryCount: operation.retryCount,
      })),
      metadata: {
        requestId,
        staleOperationsMarked: staleMarked,
      },
    })
  } catch (error) {
    console.error("Status error", {
      message: error instanceof Error ? error.message : "Failed to fetch deployment status",
    })
    return apiError("Failed to fetch deployment status", 500, "INTERNAL_ERROR")
  }
}
