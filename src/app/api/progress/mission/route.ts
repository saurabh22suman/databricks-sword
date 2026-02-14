/**
 * @file POST /api/progress/mission
 * @description Confirms mission completion from the server-side snapshot.
 * Returns mission XP, rank, and whether a rank-up occurred.
 */

import { getUserSandbox } from "@/app/api/user/helpers"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { getRankForXp } from "@/lib/gamification/ranks"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const MissionCompleteSchema = z.object({
  missionId: z.string().min(1),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest()
  if (!authResult.authenticated) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const parsed = MissionCompleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const { missionId } = parsed.data
    const sandbox = await getUserSandbox(authResult.userId)

    if (!sandbox) {
      return NextResponse.json({ error: "No progress data found" }, { status: 404 })
    }

    const missionProgress = sandbox.missionProgress[missionId]
    const rank = getRankForXp(sandbox.userStats.totalXp)

    return NextResponse.json({
      confirmed: !!missionProgress?.completed,
      totalXpEarned: missionProgress?.totalXpEarned ?? 0,
      totalXp: sandbox.userStats.totalXp,
      rank,
      completedAt: missionProgress?.completedAt ?? null,
    })
  } catch (error) {
    console.error("Error confirming mission progress:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
