/**
 * @file /api/user/profile
 * @description Returns full user profile data derived from sandbox snapshot.
 * Includes user info, rank, XP, completed missions, rank progress.
 */

import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { getDb } from "@/lib/db/client"
import { users } from "@/lib/db/schema"
import { getRankForXp, getRankProgress, getXpToNextRank } from "@/lib/gamification/ranks"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUserSandbox } from "../helpers"

const UpdateProfileSchema = z.object({
  leaderboardOptIn: z.boolean(),
})

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest()
  if (!authResult.authenticated) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const [userRow] = await getDb()
      .select({ leaderboardOptIn: users.leaderboardOptIn })
      .from(users)
      .where(eq(users.id, authResult.userId))
      .limit(1)

    const leaderboardOptIn = userRow?.leaderboardOptIn ?? true
    const sandbox = await getUserSandbox(authResult.userId)

    if (!sandbox) {
      return NextResponse.json(null, { status: 200 })
    }

    const { userStats, streakData, achievements, missionProgress, challengeResults } = sandbox
    const rank = getRankForXp(userStats.totalXp)

    const completedMissions = Object.entries(missionProgress)
      .filter(([, progress]) => progress.completed)
      .map(([slug]) => slug)

    const completedChallenges = Object.entries(challengeResults)
      .filter(([, result]) => result.completed)
      .map(([id]) => id)

    return NextResponse.json({
      user: {
        id: authResult.userId,
        name: authResult.userName,
        image: authResult.userImage,
      },
      leaderboardOptIn,
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

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest()
  if (!authResult.authenticated) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const parsed = UpdateProfileSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const updatedRows = await getDb()
      .update(users)
      .set({ leaderboardOptIn: parsed.data.leaderboardOptIn })
      .where(eq(users.id, authResult.userId))
      .returning({ leaderboardOptIn: users.leaderboardOptIn })

    return NextResponse.json({ leaderboardOptIn: updatedRows[0]?.leaderboardOptIn ?? parsed.data.leaderboardOptIn })
  } catch (error) {
    console.error("Error updating user profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
