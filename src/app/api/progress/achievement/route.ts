/**
 * @file POST /api/progress/achievement
 * @description Claims XP for a newly-unlocked achievement.
 *
 * Idempotent on (userId, "achievement", achievementId). The XP amount is
 * the achievement's `xpBonus` from the static achievement definitions —
 * achievements do not get the streak multiplier.
 *
 * Replaces the client-only path that added `xpBonus` to local
 * `userStats.totalXp` without recording it in the ledger, which meant
 * the next `/api/user/sync` recompute silently dropped the bonus.
 */

import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { claimAchievementXp } from "@/lib/gamification/serverXpService"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const AchievementClaimSchema = z.object({
  achievementId: z.string().min(1),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest()
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    )
  }

  try {
    const body = await request.json()
    const parsed = AchievementClaimSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const result = await claimAchievementXp({
      userId: authResult.userId,
      achievementId: parsed.data.achievementId,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error claiming achievement XP:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}