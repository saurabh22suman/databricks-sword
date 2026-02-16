/**
 * Field Operations Complete API
 * POST /api/field-ops/complete/[deploymentId]
 * Mark mission as complete and award XP.
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDb, users } from "@/lib/db"
import { eq } from "drizzle-orm"
import {
  getDeploymentStatus,
  completeDeployment,
  allValidationsPassed,
} from "@/lib/field-ops/deployment"
import { getIndustryConfig } from "@/lib/field-ops/industries"

type RouteContext = {
  params: Promise<{ deploymentId: string }>
}

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user from database
    const db = getDb()
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { deploymentId } = await context.params

    // Get deployment
    const deployment = await getDeploymentStatus(deploymentId)
    if (!deployment) {
      return NextResponse.json({ error: "Deployment not found" }, { status: 404 })
    }

    // Check deployment belongs to user
    if (deployment.userId !== user.id) {
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
