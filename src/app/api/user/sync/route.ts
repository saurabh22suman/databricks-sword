import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { calculateStreak } from "@/lib/gamification/streaks"
import { getDb } from "@/lib/db/client"
import { sandboxSnapshots } from "@/lib/db/schema"
import type { SandboxData } from "@/lib/sandbox/types"
import { SandboxDataSchema } from "@/lib/sandbox/types"
import { desc, eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { NextRequest, NextResponse } from "next/server"

function sanitizeSandboxAggregates(sandbox: SandboxData): SandboxData {
  let totalXp = 0
  let totalMissionsCompleted = 0
  let totalChallengesCompleted = 0

  for (const mission of Object.values(sandbox.missionProgress)) {
    for (const stage of Object.values(mission.stageProgress)) {
      totalXp += stage.xpEarned
    }

    if (mission.completed) {
      totalMissionsCompleted += 1
    }
  }

  for (const challenge of Object.values(sandbox.challengeResults)) {
    totalXp += challenge.xpEarned

    if (challenge.completed) {
      totalChallengesCompleted += 1
    }
  }

  totalXp += sandbox.achievements.length

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
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    // Parse and validate request body
    const body = await request.json()
    const validationResult = SandboxDataSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({ error: "Invalid sandbox data" }, { status: 400 })
    }

    const sandboxData = validationResult.data
    const sanitizedSandboxData = sanitizeSandboxAggregates(sandboxData)
    const userId = authResult.userId

    // Upsert sandbox snapshot
    await getDb()
      .insert(sandboxSnapshots)
      .values({
        id: nanoid(),
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

    const lastSynced = new Date().toISOString()

    return NextResponse.json(
      { success: true, lastSynced } satisfies { success: boolean; lastSynced: string },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error syncing sandbox data:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
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
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
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
      { status: 500 }
    )
  }
}
