/**
 * Field Operations Complete API
 * POST /api/field-ops/complete/[deploymentId]
 * Mark mission as complete and award XP.
 */

import { authenticateApiRequest } from "@/lib/auth/api-auth"
import {
    allValidationsPassed,
    completeDeployment,
    getDeploymentStatus,
} from "@/lib/field-ops/deployment"
import { getIndustryConfig } from "@/lib/field-ops/industries"
import { NextRequest, NextResponse } from "next/server"

type RouteContext = {
  params: Promise<{ deploymentId: string }>
}

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const authResult = await authenticateApiRequest()
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const userId = authResult.userId

    const { deploymentId } = await context.params

    // Get deployment
    const deployment = await getDeploymentStatus(deploymentId)
    if (!deployment) {
      return NextResponse.json({ error: "Deployment not found" }, { status: 404 })
    }

    // Check deployment belongs to user
    if (deployment.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check all validations passed
    const passed = await allValidationsPassed(deploymentId)
    if (!passed) {
      return NextResponse.json(
        { error: "All validations must pass before completing" },
        { status: 400 }
      )
    }

    // Mark as complete
    const completed = await completeDeployment(deploymentId)

    // Get industry config for XP reward
    const config = getIndustryConfig(deployment.industry)

    // TODO: Award XP to user profile
    // TODO: Apply streak multiplier
    // TODO: Check for badge unlock

    return NextResponse.json({
      success: true,
      xpAwarded: config.xpReward,
      completedAt: completed.completedAt,
    })
  } catch (error) {
    console.error("Complete error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete mission" },
      { status: 500 }
    )
  }
}
