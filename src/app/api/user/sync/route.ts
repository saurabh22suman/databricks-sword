import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { isMockAuth } from "@/lib/auth/mockSession"
import { calculateStreak } from "@/lib/gamification/streaks"
import { getDb } from "@/lib/db/client"
import {
  couponRedemptions,
  fieldOpsCompletions,
  sandboxSnapshots,
} from "@/lib/db/schema"
import { ACHIEVEMENTS } from "@/lib/gamification/achievements"
import type { SandboxData } from "@/lib/sandbox/types"
import { SandboxDataSchema } from "@/lib/sandbox/types"
import { desc, eq, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { NextRequest, NextResponse } from "next/server"

type SanitizeSandboxOptions = {
  couponXp: number
  fieldOpsXp: number
}

function sanitizeSandboxAggregates(
  sandbox: SandboxData,
  options: SanitizeSandboxOptions,
): SandboxData {
  const missionXp = Object.values(sandbox.missionProgress).reduce(
    (sum, mission) => sum + mission.totalXpEarned,
    0,
  )

  const challengeXp = Object.values(sandbox.challengeResults).reduce(
    (sum, challenge) => sum + challenge.xpEarned,
    0,
  )

  const achievementXp = sandbox.achievements.reduce((sum, achievementId) => {
    const achievement = ACHIEVEMENTS.find((item) => item.id === achievementId)
    return sum + (achievement?.xpBonus ?? 0)
  }, 0)

  const totalXp =
    missionXp +
    challengeXp +
    achievementXp +
    options.fieldOpsXp +
    options.couponXp

  const totalMissionsCompleted = Object.values(sandbox.missionProgress).filter(
    (mission) => mission.completed,
  ).length

  const totalChallengesCompleted = Object.values(
    sandbox.challengeResults,
  ).filter((challenge) => challenge.completed).length

  // Server-side streak validation
  const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD
  let streakData = { ...sandbox.streakData }

  if (sandbox.streakData.lastActiveDate) {
    const result = calculateStreak(sandbox.streakData.lastActiveDate, today, {
      freezesAvailable: sandbox.streakData.freezesAvailable,
    })

    if (result.freezeUsed) {
      streakData.freezesAvailable -= 1
      streakData.freezesUsed += 1
    }

    streakData.currentStreak = result.newStreak
    streakData.lastActiveDate = today

    if (streakData.currentStreak > streakData.longestStreak) {
      streakData.longestStreak = streakData.currentStreak
    }
  }

  return {
    ...sandbox,
    streakData,
    userStats: {
      ...sandbox.userStats,
      totalXp,
      totalMissionsCompleted,
      totalChallengesCompleted,
      totalAchievements: sandbox.achievements.length,
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
    },
  }
}

/**
 * POST /api/user/sync
 * Syncs browser sandbox data to the database.
 * Requires authentication.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const authResult = await authenticateApiRequest()
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    )
  }

  try {
    // Parse and validate request body
    const body = await request.json()
    const validationResult = SandboxDataSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid sandbox data" },
        { status: 400 },
      )
    }

    const sandboxData = validationResult.data
    const userId = authResult.userId

    if (isMockAuth) {
      const lastSynced = new Date().toISOString()
      return NextResponse.json(
        { success: true, lastSynced } satisfies {
          success: boolean
          lastSynced: string
        },
        { status: 200 },
      )
    }

    let couponXp = 0
    let fieldOpsXp = 0

    // Note: Verbose logging removed for production. Use error logs only.

    try {
      const [couponXpResult, fieldOpsXpResult] = await Promise.all([
        getDb()
          .select({
            totalCouponXp: sql<number>`coalesce(sum(${couponRedemptions.xpAwarded}), 0)`,
          })
          .from(couponRedemptions)
          .where(eq(couponRedemptions.userId, userId)),
        getDb()
          .select({
            totalFieldOpsXp: sql<number>`coalesce(sum(${fieldOpsCompletions.xpAwarded}), 0)`,
          })
          .from(fieldOpsCompletions)
          .where(eq(fieldOpsCompletions.userId, userId)),
      ])

      couponXp = couponXpResult[0]?.totalCouponXp ?? 0
      fieldOpsXp = fieldOpsXpResult[0]?.totalFieldOpsXp ?? 0
    } catch (error) {
      console.error("[SYNC] Error fetching XP from DB:", error)
      if (!isMockAuth) {
        throw error
      }
    }

    const sanitizedSandboxData = sanitizeSandboxAggregates(sandboxData, {
      couponXp,
      fieldOpsXp,
    })

    // Upsert sandbox snapshot
    try {
      const snapshotId = nanoid()

      await getDb()
        .insert(sandboxSnapshots)
        .values({
          id: snapshotId,
          userId,
          snapshotData: JSON.stringify(sanitizedSandboxData),
          totalXp: sanitizedSandboxData.userStats.totalXp,
          currentStreak: sanitizedSandboxData.streakData.currentStreak,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: sandboxSnapshots.userId,
          set: {
            snapshotData: JSON.stringify(sanitizedSandboxData),
            totalXp: sanitizedSandboxData.userStats.totalXp,
            currentStreak: sanitizedSandboxData.streakData.currentStreak,
            updatedAt: new Date(),
          },
        })

    } catch (upsertError) {
      console.error("[SYNC] Upsert error:", upsertError)
      throw upsertError
    }

    const lastSynced = new Date().toISOString()

    return NextResponse.json(
      { success: true, lastSynced } satisfies {
        success: boolean
        lastSynced: string
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error syncing sandbox data:", error)
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack",
    )
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

/**
 * GET /api/user/sync
 * Retrieves the latest sandbox snapshot for the authenticated user.
 * Requires authentication.
 * Returns null if no snapshot exists.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const authResult = await authenticateApiRequest()
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    )
  }

  try {
    const userId = authResult.userId

    // Fetch latest snapshot
    const snapshots = await getDb()
      .select()
      .from(sandboxSnapshots)
      .where(eq(sandboxSnapshots.userId, userId))
      .orderBy(desc(sandboxSnapshots.updatedAt))
      .limit(1)

    if (snapshots.length === 0) {
      return NextResponse.json(null, { status: 200 })
    }

    const snapshot = snapshots[0]
    const sandboxData = JSON.parse(snapshot.snapshotData)

    return NextResponse.json(sandboxData, { status: 200 })
  } catch (error) {
    console.error("Error fetching sandbox data:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
