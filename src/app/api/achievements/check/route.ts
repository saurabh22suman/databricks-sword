/**
 * @file POST /api/achievements/check
 * @description Checks all achievement conditions against the user's current profile.
 * Returns newly unlocked achievements since the last check.
 */

import { getUserSandbox } from "@/app/api/user/helpers"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { ACHIEVEMENTS, checkAchievement } from "@/lib/gamification/achievements"
import { getRankForXp } from "@/lib/gamification/ranks"
import type { UserProfile } from "@/lib/gamification/types"
import { NextRequest, NextResponse } from "next/server"

export async function POST(_request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest()
  if (!authResult.authenticated) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const sandbox = await getUserSandbox(authResult.userId)

    if (!sandbox) {
      return NextResponse.json({ newlyUnlocked: [] }, { status: 200 })
    }

    // Derive side quest count from all mission progress
    const completedSideQuests = Object.values(sandbox.missionProgress)
      .reduce((sum, p) => sum + (p.sideQuestsCompleted?.length ?? 0), 0)

    // Derive perfect quiz count from stage progress (quizScore === 100)
    const perfectQuizzes = Object.values(sandbox.missionProgress)
      .reduce((sum, mp) => {
        const stageQuizPerfects = Object.values(mp.stageProgress)
          .filter((sp) => sp.quizScore === 100).length
        return sum + stageQuizPerfects
      }, 0)

    // Build a UserProfile from sandbox data for achievement checking
    const profile: UserProfile = {
      id: authResult.userId,
      displayName: authResult.userName ?? "Unknown",
      avatarUrl: authResult.userImage ?? undefined,
      rank: getRankForXp(sandbox.userStats.totalXp),
      totalXp: sandbox.userStats.totalXp,
      achievements: sandbox.achievements,
      streakData: sandbox.streakData,
      completedMissions: Object.entries(sandbox.missionProgress)
        .filter(([, p]) => p.completed)
        .map(([slug]) => slug),
      completedChallenges: Object.entries(sandbox.challengeResults)
        .filter(([, r]) => r.completed)
        .map(([id]) => id),
      perfectQuizzes,
      completedSideQuests,
      createdAt: new Date().toISOString(),
    }

    // Check all achievements, find newly unlocked ones
    const alreadyUnlocked = new Set(sandbox.achievements)
    const newlyUnlocked: string[] = []

    for (const achievement of ACHIEVEMENTS) {
      if (alreadyUnlocked.has(achievement.id)) continue
      if (checkAchievement(achievement.condition, profile)) {
        newlyUnlocked.push(achievement.id)
      }
    }

    return NextResponse.json({ newlyUnlocked })
  } catch (error) {
    console.error("Error checking achievements:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
