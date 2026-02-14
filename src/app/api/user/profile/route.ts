/**
 * @file GET /api/user/profile
 * @description Returns full user profile data derived from sandbox snapshot.
 * Includes user info, rank, XP, completed missions, rank progress.
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

    const { userStats, streakData, achievements, missionProgress, challengeResults } = sandbox
    const rank = getRankForXp(userStats.totalXp)

    // Extract completed mission slugs
    const completedMissions = Object.entries(missionProgress)
      .filter(([, progress]) => progress.completed)
      .map(([slug]) => slug)

    // Extract completed challenge IDs
    const completedChallenges = Object.entries(challengeResults)
      .filter(([, result]) => result.completed)
      .map(([id]) => id)

    return NextResponse.json({
      user: {
        id: authResult.userId,
        name: authResult.userName,
        image: authResult.userImage,
      },
      totalXp: userStats.totalXp,
      rank,
      rankProgress: getRankProgress(userStats.totalXp),
      xpToNextRank: getXpToNextRank(userStats.totalXp),
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      completedMissions,
      completedChallenges,
      achievements,
      totalTimeSpentMinutes: userStats.totalTimeSpentMinutes,
    })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
