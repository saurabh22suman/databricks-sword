/**
 * Field Operations Status API
 * GET /api/field-ops/status/[deploymentId]
 * Get deployment status and validation results.
 */

import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { getDeploymentStatus, getValidationResults } from "@/lib/field-ops/deployment"
import { NextRequest, NextResponse } from "next/server"

type RouteContext = {
  params: Promise<{ deploymentId: string }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const authResult = await authenticateApiRequest()
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { deploymentId } = await context.params

    // Get deployment
    const deployment = await getDeploymentStatus(deploymentId)
    if (!deployment) {
      return NextResponse.json({ error: "Deployment not found" }, { status: 404 })
    }

    if (deployment.userId !== authResult.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get validation results
    const validations = await getValidationResults(deploymentId)

    return NextResponse.json({
      deployment: {
        id: deployment.id,
        industry: deployment.industry,
        status: deployment.status,
        schemaPrefix: deployment.schemaPrefix,
        deployedAt: deployment.deployedAt,
        completedAt: deployment.completedAt,
        errorMessage: deployment.errorMessage,
        // Connection info for dynamic links
        workspaceUrl: deployment.workspaceUrl,
        catalogName: deployment.catalogName,
        warehouseId: deployment.warehouseId,
      },
      validations: validations.map((v: { checkName: string; passed: boolean; executedAt: Date; errorMessage?: string | null }) => ({
        checkName: v.checkName,
        passed: v.passed,
        executedAt: v.executedAt,
        errorMessage: v.errorMessage,
      })),
    })
  } catch (error) {
    console.error("Status error:", error)
    return NextResponse.json(
      { error: "Failed to fetch deployment status" },
      { status: 500 }
    )
  }
}
