/**
 * @file GET /api/user/stats
 * @description Returns aggregated user stats derived from sandbox snapshot.
 * Includes XP, rank, streak, missions/challenges completed, and achievements.
 */

import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { getRankForXp, getRankProgress, getXpToNextRank } from "@/lib/gamification/ranks"
import { NextRequest, NextResponse } from "next/server"
import { getUserSandbox } from "../helpers"

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest()
  if (!authResult.authenticated) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const sandbox = await getUserSandbox(authResult.userId)

    if (!sandbox) {
      return NextResponse.json(null, { status: 200 })
    }

    const { userStats, streakData, achievements } = sandbox
    const rank = getRankForXp(userStats.totalXp)

    return NextResponse.json({
      totalXp: userStats.totalXp,
      rank,
      rankProgress: getRankProgress(userStats.totalXp),
      xpToNextRank: getXpToNextRank(userStats.totalXp),
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      missionsCompleted: userStats.totalMissionsCompleted,
      challengesCompleted: userStats.totalChallengesCompleted,
      achievements,
    })
  } catch (error) {
    console.error("Error fetching user stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
