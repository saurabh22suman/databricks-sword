/**
 * @file POST /api/progress/stage
 * @description Confirms stage completion by validating against the server-side snapshot.
 * Returns the XP earned and current total XP. Triggers sync if snapshot differs.
 */

import { getUserSandbox } from "@/app/api/user/helpers"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { getRankForXp } from "@/lib/gamification/ranks"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const StageCompleteSchema = z.object({
  missionId: z.string().min(1),
  stageId: z.string().min(1),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest()
  if (!authResult.authenticated) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const parsed = StageCompleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const { missionId, stageId } = parsed.data
    const sandbox = await getUserSandbox(authResult.userId)

    if (!sandbox) {
      return NextResponse.json({ error: "No progress data found" }, { status: 404 })
    }

    const missionProgress = sandbox.missionProgress[missionId]
    const stageProgress = missionProgress?.stageProgress[stageId]
    const rank = getRankForXp(sandbox.userStats.totalXp)

    return NextResponse.json({
      confirmed: !!stageProgress?.completed,
      xpEarned: stageProgress?.xpEarned ?? 0,
      totalXp: sandbox.userStats.totalXp,
      rank,
    })
  } catch (error) {
    console.error("Error confirming stage progress:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
