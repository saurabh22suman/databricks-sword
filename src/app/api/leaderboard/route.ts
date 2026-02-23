/**
 * @file GET /api/leaderboard
 * @description Returns the top players leaderboard from sandbox snapshots.
 * Scans all snapshots, extracts totalXp + user info, sorts descending.
 */

import { apiError, apiOk } from "@/lib/api/responses"
import { getDb } from "@/lib/db/client"
import { sandboxSnapshots, users } from "@/lib/db/schema"
import { MOCK_USER_ID } from "@/lib/auth/mockSession"
import { getRankForXp } from "@/lib/gamification/ranks"
import { SandboxDataSchema } from "@/lib/sandbox/types"
import { desc, eq, sql } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(): Promise<NextResponse> {
  try {
    // Fetch all real users and include snapshot stats when available.
    // Keep ordering by snapshot_data JSON extraction for backward compatibility
    // with DBs that have not yet applied total_xp/current_streak columns.
    const rows = await getDb()
      .select({
        snapshotData: sandboxSnapshots.snapshotData,
        userId: users.id,
        userName: users.name,
        userImage: users.image,
      })
      .from(users)
      .leftJoin(sandboxSnapshots, eq(sandboxSnapshots.userId, users.id))
      .where(sql`${users.id} != ${MOCK_USER_ID}`)
      .orderBy(desc(sql<number>`coalesce(cast(json_extract(${sandboxSnapshots.snapshotData}, '$.userStats.totalXp') as integer), 0)`))

    const [countRow] = await getDb()
      .select({ totalPlayers: sql<number>`count(*)` })
      .from(users)
      .where(sql`${users.id} != ${MOCK_USER_ID}`)

    type LeaderboardEntry = {
      userId: string
      name: string | null
      image: string | null
      totalXp: number
      rank: ReturnType<typeof getRankForXp>
      missionsCompleted: number
      currentStreak: number
    }

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

    return apiOk({
      entries,
      totalPlayers: countRow?.totalPlayers ?? 0,
    })
  } catch (error) {
    console.error("Error fetching leaderboard:", error)
    return apiError("Internal server error", 500, "INTERNAL_ERROR")
  }
}
