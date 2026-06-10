/**
 * @file GET /api/leaderboard
 * @description Returns paginated leaderboard with cursor-based pagination.
 * Supports cursor-based pagination for scalability.
 */

import { apiError, apiOk } from "@/lib/api/responses"
import { MOCK_USER_ID } from "@/lib/auth/mockSession"
import { getDb } from "@/lib/db/client"
import { sandboxSnapshots, users } from "@/lib/db/schema"
import { getRankForXp } from "@/lib/gamification/ranks"
import { SandboxDataSchema } from "@/lib/sandbox/types"
import { and, desc, eq, ne, sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

type LeaderboardEntry = {
  userId: string
  name: string | null
  image: string | null
  totalXp: number
  rank: ReturnType<typeof getRankForXp>
  missionsCompleted: number
  currentStreak: number
}

type LeaderboardResponse = {
  entries: LeaderboardEntry[]
  pagination: {
    cursor: string | null
    hasMore: boolean
    totalPlayers: number
  }
}

function isMissingLeaderboardOptInColumnError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }
  return error.message.includes("leaderboard_opt_in")
}

function mapLeaderboardEntries(
  rows: Array<{
    snapshotData: string | null
    userId: string
    userName: string | null
    userImage: string | null
  }>
): LeaderboardEntry[] {
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

// XP extraction SQL helper
const xpExtractor = sql<number>`
  coalesce(
    cast(json_extract(${sandboxSnapshots.snapshotData}, '$.userStats.totalXp') as integer),
    0
  )
`

export async function GET(request?: NextRequest): Promise<NextResponse> {
  try {
    // Handle case where request might be undefined (test scenarios)
    const url = request?.url
    const searchParams = url ? new URL(url).searchParams : new URLSearchParams()

    // Parse pagination parameters
    const cursor = searchParams.get("cursor")
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10),
      MAX_PAGE_SIZE
    )

    const db = getDb()

    let totalPlayers = 0

    // Get total count first
    try {
      const [countRow] = await db
        .select({ totalPlayers: sql<number>`count(*)` })
        .from(users)
        .where(and(ne(users.id, MOCK_USER_ID), eq(users.leaderboardOptIn, true)))

      totalPlayers = countRow?.totalPlayers ?? 0
    } catch {
      // Column might not exist yet
      totalPlayers = -1
    }

    // Build query with cursor-based pagination
    let rows: Array<{
      snapshotData: string | null
      userId: string
      userName: string | null
      userImage: string | null
    }> = []

    const cursorXp = cursor ? parseFloat(cursor) : null
    const hasCursor = cursorXp !== null && !isNaN(cursorXp)

    try {
      // Query with opt-in column
      const baseWhere = and(
        ne(users.id, MOCK_USER_ID),
        eq(users.leaderboardOptIn, true),
        hasCursor ? sql`${xpExtractor} < ${cursorXp}` : undefined
      )

      rows = await db
        .select({
          snapshotData: sandboxSnapshots.snapshotData,
          userId: users.id,
          userName: users.name,
          userImage: users.image,
        })
        .from(users)
        .leftJoin(sandboxSnapshots, eq(sandboxSnapshots.userId, users.id))
        .where(baseWhere)
        .orderBy(desc(xpExtractor))
        .limit(pageSize + 1)
    } catch (error) {
      // Fallback without opt-in column
      if (!isMissingLeaderboardOptInColumnError(error)) {
        console.error("Leaderboard query error:", error)
      }

      const baseWhere = hasCursor
        ? and(ne(users.id, MOCK_USER_ID), sql`${xpExtractor} < ${cursorXp}`)
        : ne(users.id, MOCK_USER_ID)

      rows = await db
        .select({
          snapshotData: sandboxSnapshots.snapshotData,
          userId: users.id,
          userName: users.name,
          userImage: users.image,
        })
        .from(users)
        .leftJoin(sandboxSnapshots, eq(sandboxSnapshots.userId, users.id))
        .where(baseWhere)
        .orderBy(desc(xpExtractor))
        .limit(pageSize + 1)
    }

    // Check if there are more results
    let nextCursor: string | null = null
    let hasMore = false

    if (rows.length > pageSize) {
      hasMore = true
      rows = rows.slice(0, pageSize)
      // Set cursor to the last user's XP value
      const lastRow = rows[rows.length - 1]
      if (lastRow.snapshotData) {
        try {
          const lastSandbox = JSON.parse(lastRow.snapshotData)
          nextCursor = String(lastSandbox.userStats.totalXp)
        } catch {
          nextCursor = null
        }
      }
    }

    return apiOk({
      entries: mapLeaderboardEntries(rows),
      pagination: {
        cursor: nextCursor,
        hasMore,
        totalPlayers,
      },
    } satisfies LeaderboardResponse)
  } catch (error) {
    console.error("Error fetching leaderboard:", error)
    return apiError("Internal server error", 500, "INTERNAL_ERROR")
  }
}