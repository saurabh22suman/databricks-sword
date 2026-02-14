/**
 * @file GET /api/leaderboard
 * @description Returns the top players leaderboard from sandbox snapshots.
 * Scans all snapshots, extracts totalXp + user info, sorts descending.
 */

import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { getDb } from "@/lib/db/client"
import { sandboxSnapshots, users } from "@/lib/db/schema"
import { getRankForXp } from "@/lib/gamification/ranks"
import { SandboxDataSchema } from "@/lib/sandbox/types"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest()
  if (!authResult.authenticated) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    // Fetch all snapshots with user info
    const rows = await getDb()
      .select({
        snapshotData: sandboxSnapshots.snapshotData,
        userId: sandboxSnapshots.userId,
        userName: users.name,
        userImage: users.image,
      })
      .from(sandboxSnapshots)
      .innerJoin(users, eq(sandboxSnapshots.userId, users.id))

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

    // Sort by totalXp descending
    entries.sort((a, b) => b.totalXp - a.totalXp)

    // Return top 50
    return NextResponse.json({
      entries: entries.slice(0, 50),
      totalPlayers: entries.length,
    })
  } catch (error) {
    console.error("Error fetching leaderboard:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
