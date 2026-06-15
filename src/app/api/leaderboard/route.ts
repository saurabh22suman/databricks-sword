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
  isCurrentUser?: boolean
}

type LeaderboardResponse = {
  entries: LeaderboardEntry[]
  pagination: {
    cursor: string | null
    hasMore: boolean
    totalPlayers: number
  }
  scope?: "top" | "nearby"
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
  }>,
  options?: { markCurrentUserByXp?: number }
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

  if (options?.markCurrentUserByXp !== undefined) {
    for (const entry of entries) {
      if (entry.totalXp === options.markCurrentUserByXp) {
        entry.isCurrentUser = true
        break
      }
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

    // Parse scope parameter
    const scopeParam = searchParams.get("scope")
    const scope: "top" | "nearby" = scopeParam === "nearby" ? "nearby" : "top"

    // Parse currentXp for nearby scope
    const currentXpStr = searchParams.get("currentXp")
    const currentXp = currentXpStr ? parseInt(currentXpStr, 10) : null
    const isValidCurrentXp = currentXp !== null && !isNaN(currentXp) && currentXp >= 0

    // For nearby scope, we need currentXp to be valid
    const useNearby = scope === "nearby" && isValidCurrentXp

    // Parse pagination parameters
    const cursor = searchParams.get("cursor")
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10),
      MAX_PAGE_SIZE
    )

    const db = getDb()

    let totalPlayers = 0

    // Handle nearby scope
    if (useNearby) {
      // For nearby scope, we don't need total count upfront - compute it from results
      // Load all opted-in users (limit to 100 to avoid OOM)
      let nearbyRows: Array<{
        snapshotData: string | null
        userId: string
        userName: string | null
        userImage: string | null
      }> = []

      const nearbyPageSize = 100

      try {
        const baseWhere = and(
          ne(users.id, MOCK_USER_ID),
          eq(users.leaderboardOptIn, true)
        )

        nearbyRows = await db
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
          .limit(nearbyPageSize)
      } catch (error) {
        if (!isMissingLeaderboardOptInColumnError(error)) {
          console.error("Leaderboard query error:", error)
        }

        nearbyRows = await db
          .select({
            snapshotData: sandboxSnapshots.snapshotData,
            userId: users.id,
            userName: users.name,
            userImage: users.image,
          })
          .from(users)
          .leftJoin(sandboxSnapshots, eq(sandboxSnapshots.userId, users.id))
          .where(ne(users.id, MOCK_USER_ID))
          .orderBy(desc(xpExtractor))
          .limit(nearbyPageSize)
      }

      // Map entries to get XP values
      const mappedEntries = mapLeaderboardEntries(nearbyRows)

      // Find the position of current user
      const allEntries = mappedEntries
      let userPosition = -1
      for (let i = 0; i < allEntries.length; i++) {
        if (allEntries[i].totalXp === currentXp) {
          userPosition = i + 1 // 1-based position
          break
        }
      }

      // If user not found by exact XP match, find closest position
      if (userPosition === -1) {
        for (let i = 0; i < allEntries.length; i++) {
          if (allEntries[i].totalXp <= currentXp) {
            userPosition = i + 1
            break
          }
        }
        if (userPosition === -1 && allEntries.length > 0) {
          userPosition = allEntries.length
        }
      }

      // If no players found or position invalid, fall back to top
      if (allEntries.length === 0 || userPosition === -1) {
        const topEntries = mapLeaderboardEntries(
          nearbyRows.slice(0, 10),
          { markCurrentUserByXp: currentXp ?? undefined }
        )
        return apiOk({
          entries: topEntries,
          pagination: {
            cursor: null,
            hasMore: false,
            totalPlayers: nearbyRows.length,
          },
          scope: "top",
        } satisfies LeaderboardResponse)
      }

      // Calculate window: 5 above, current, 5 below
      const windowStart = Math.max(0, userPosition - 6) // userPosition is 1-based, want 5 above
      const windowEnd = Math.min(allEntries.length, userPosition + 5)

      // Adjust if we're at the boundaries
      let finalStart = windowStart
      let finalEnd = windowEnd

      // If we can't get 5 above, extend below
      if (userPosition <= 6) {
        finalEnd = Math.min(allEntries.length, userPosition + 5 + (6 - userPosition))
      }
      // If we can't get 5 below, extend above
      if (userPosition + 5 > allEntries.length) {
        finalStart = Math.max(0, windowStart - ((userPosition + 5) - allEntries.length))
      }

      finalStart = Math.max(0, finalStart)
      finalEnd = Math.min(allEntries.length, finalEnd)

      const windowEntries = allEntries.slice(finalStart, finalEnd)

      // Mark current user
      for (const entry of windowEntries) {
        if (entry.totalXp === currentXp) {
          entry.isCurrentUser = true
          break
        }
      }

      return apiOk({
        entries: windowEntries,
        pagination: {
          cursor: null,
          hasMore: allEntries.length > finalEnd,
          totalPlayers: allEntries.length,
        },
        scope: "nearby",
      } satisfies LeaderboardResponse)
    }

    // Get total count for top scope
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

    // Build query with cursor-based pagination (top scope)
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
      scope: "top",
    } satisfies LeaderboardResponse)
  } catch (error) {
    console.error("Error fetching leaderboard:", error)
    return apiError("Internal server error", 500, "INTERNAL_ERROR")
  }
}