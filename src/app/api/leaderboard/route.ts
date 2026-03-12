/**
 * @file GET /api/leaderboard
 * @description Returns the top players leaderboard from sandbox snapshots.
 * Scans all snapshots, extracts totalXp + user info, sorts descending.
 */

import { apiError, apiOk } from "@/lib/api/responses"
import { MOCK_USER_ID } from "@/lib/auth/mockSession"
import { getDb } from "@/lib/db/client"
import { sandboxSnapshots, users } from "@/lib/db/schema"
import { getRankForXp } from "@/lib/gamification/ranks"
import { SandboxDataSchema } from "@/lib/sandbox/types"
import { and, desc, eq, ne, sql } from "drizzle-orm"
import { NextResponse } from "next/server"

type LeaderboardRow = {
  snapshotData: string | null
  userId: string
  userName: string | null
  userImage: string | null
}

type LeaderboardEntry = {
  userId: string
  name: string | null
  image: string | null
  totalXp: number
  rank: ReturnType<typeof getRankForXp>
  missionsCompleted: number
  currentStreak: number
}

function isMissingLeaderboardOptInColumnError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  return error.message.includes("leaderboard_opt_in")
}

function mapLeaderboardEntries(rows: LeaderboardRow[]): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = []

  for (const row of rows) {
    const baseEntry = {
      userId: row.userId,
      name: row.userName,
      image: row.userImage,
      totalXp: 0,
      rank: getRankForXp(0),
      missionsCompleted: 0,
      currentStreak: 0,
    }

    if (!row.snapshotData) {
      entries.push(baseEntry)
      continue
    }

    try {
      const sandbox = SandboxDataSchema.parse(JSON.parse(row.snapshotData))
      const totalXp = sandbox.userStats.totalXp
      entries.push({
        ...baseEntry,
        totalXp,
        rank: getRankForXp(totalXp),
        missionsCompleted: sandbox.userStats.totalMissionsCompleted,
        currentStreak: sandbox.streakData.currentStreak,
      })
    } catch {
      entries.push(baseEntry)
    }
  }

  return entries
}

export async function GET(): Promise<NextResponse> {
  try {
    const db = getDb()

    let rows: LeaderboardRow[] = []
    let totalPlayers = 0

    try {
      rows = await db
        .select({
          snapshotData: sandboxSnapshots.snapshotData,
          userId: users.id,
          userName: users.name,
          userImage: users.image,
        })
        .from(users)
        .leftJoin(sandboxSnapshots, eq(sandboxSnapshots.userId, users.id))
        .where(and(ne(users.id, MOCK_USER_ID), eq(users.leaderboardOptIn, true)))
        .orderBy(desc(sql<number>`coalesce(cast(json_extract(${sandboxSnapshots.snapshotData}, '$.userStats.totalXp') as integer), 0)`))

      const [countRow] = await db
        .select({ totalPlayers: sql<number>`count(*)` })
        .from(users)
        .where(and(ne(users.id, MOCK_USER_ID), eq(users.leaderboardOptIn, true)))

      totalPlayers = countRow?.totalPlayers ?? 0
    } catch (error) {
      if (!isMissingLeaderboardOptInColumnError(error)) {
        throw error
      }

      rows = await db
        .select({
          snapshotData: sandboxSnapshots.snapshotData,
          userId: users.id,
          userName: users.name,
          userImage: users.image,
        })
        .from(users)
        .leftJoin(sandboxSnapshots, eq(sandboxSnapshots.userId, users.id))
        .where(ne(users.id, MOCK_USER_ID))
        .orderBy(desc(sql<number>`coalesce(cast(json_extract(${sandboxSnapshots.snapshotData}, '$.userStats.totalXp') as integer), 0)`))

      const [countRow] = await db
        .select({ totalPlayers: sql<number>`count(*)` })
        .from(users)
        .where(ne(users.id, MOCK_USER_ID))

      totalPlayers = countRow?.totalPlayers ?? 0
    }

    return apiOk({
      entries: mapLeaderboardEntries(rows),
      totalPlayers,
    })
  } catch (error) {
    console.error("Error fetching leaderboard:", error)
    return apiError("Internal server error", 500, "INTERNAL_ERROR")
  }
}
