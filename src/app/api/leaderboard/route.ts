/**
 * @file GET /api/leaderboard
 * @description Returns the top players leaderboard from sandbox snapshots.
 * Scans all snapshots, extracts totalXp + user info, sorts descending.
 */

import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { apiError, apiOk } from "@/lib/api/responses"
import { getDb } from "@/lib/db/client"
import { sandboxSnapshots, users } from "@/lib/db/schema"
import { getRankForXp } from "@/lib/gamification/ranks"
import { SandboxDataSchema } from "@/lib/sandbox/types"
import { desc, eq, sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest()
  if (!authResult.authenticated) {
    return apiError(authResult.error, authResult.status, "UNAUTHORIZED")
  }

  try {
    const xpExpr = sql<number>`cast(json_extract(${sandboxSnapshots.snapshotData}, '$.userStats.totalXp') as integer)`

    // Fetch top players by XP directly in SQL to avoid full in-memory sort/scan work.
    const rows = await getDb()
      .select({
        snapshotData: sandboxSnapshots.snapshotData,
        userId: sandboxSnapshots.userId,
        userName: users.name,
        userImage: users.image,
      })
      .from(sandboxSnapshots)
      .innerJoin(users, eq(sandboxSnapshots.userId, users.id))
      .orderBy(desc(xpExpr))
      .limit(50)

    const [countRow] = await getDb()
      .select({ totalPlayers: sql<number>`count(*)` })
      .from(sandboxSnapshots)

    type LeaderboardEntry = {
      userId: string
      name: string | null
      image: string | null
      totalXp: number
      rank: ReturnType<typeof getRankForXp>
      missionsCompleted: number
    }

    const entries: LeaderboardEntry[] = []

    for (const row of rows) {
      try {
        const sandbox = SandboxDataSchema.parse(JSON.parse(row.snapshotData))
        entries.push({
          userId: row.userId,
          name: row.userName,
          image: row.userImage,
          totalXp: sandbox.userStats.totalXp,
          rank: getRankForXp(sandbox.userStats.totalXp),
          missionsCompleted: sandbox.userStats.totalMissionsCompleted,
        })
      } catch {
        // Skip invalid snapshots
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
