import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { isMockAuth } from "@/lib/auth/mockSession"
import { calculateStreak } from "@/lib/gamification/streaks"
import { getDb } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"
import {
  couponRedemptions,
  fieldOpsCompletions,
  sandboxSnapshots,
  xpAwards,
} from "@/lib/db/schema"
import { ACHIEVEMENTS } from "@/lib/gamification/achievements"
import { encryptSandbox, decryptSandbox } from "@/lib/sandbox/encryption"
import type { SandboxData } from "@/lib/sandbox/types"
import { SandboxDataSchema } from "@/lib/sandbox/types"
import { desc, eq, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { NextRequest, NextResponse } from "next/server"

type SanitizeSandboxOptions = {
  couponXp: number
  fieldOpsXp: number
  /** Authoritative XP aggregates from the xp_awards ledger. */
  ledger: {
    totalXp: number
    byType: {
      stage: { totalXp: number; count: number }
      mission: { totalXp: number; count: number }
      challenge: { totalXp: number; count: number }
      achievement: { totalXp: number; count: number }
    }
  }
}

type LedgerAggregateRow = {
  sourceType: string
  totalXp: number
  awardCount: number
}

const EMPTY_LEDGER: SanitizeSandboxOptions["ledger"] = {
  totalXp: 0,
  byType: {
    stage: { totalXp: 0, count: 0 },
    mission: { totalXp: 0, count: 0 },
    challenge: { totalXp: 0, count: 0 },
    achievement: { totalXp: 0, count: 0 },
  },
}

function sanitizeSandboxAggregates(
  sandbox: SandboxData,
  options: SanitizeSandboxOptions,
): SandboxData {
  const { ledger, couponXp, fieldOpsXp } = options

  // XP comes from the authoritative ledger (xp_awards) plus the
  // server-controlled coupon/field-ops tables. The client's per-mission
  // and per-challenge XP fields in the sandbox are NOT trusted.
  const totalXp = ledger.totalXp + couponXp + fieldOpsXp

  const totalMissionsCompleted = ledger.byType.mission.count
  const totalChallengesCompleted = ledger.byType.challenge.count
  const totalAchievements = ledger.byType.achievement.count

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
      totalAchievements,
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
    },
  }
}

/**
 * Computes the legacy-mode XP aggregate from a client sandbox. Used as a
 * one-time bootstrap when a user has no xp_awards rows yet (e.g. existing
 * users who completed missions before the claim endpoints existed).
 */
function legacySandboxAggregate(sandbox: SandboxData): {
  totalXp: number
  missionXp: number
  challengeXp: number
  achievementXp: number
  missionsCompleted: number
  challengesCompleted: number
} {
  const missionXp = Object.values(sandbox.missionProgress).reduce(
    (sum, mission) => sum + mission.totalXpEarned,
    0,
  )
  const challengeXp = Object.values(sandbox.challengeResults).reduce(
    (sum, challenge) => sum + challenge.xpEarned,
    0,
  )
  const achievementXp = sandbox.achievements.reduce((sum, id) => {
    const a = ACHIEVEMENTS.find((item) => item.id === id)
    return sum + (a?.xpBonus ?? 0)
  }, 0)
  const missionsCompleted = Object.values(sandbox.missionProgress).filter(
    (m) => m.completed,
  ).length
  const challengesCompleted = Object.values(sandbox.challengeResults).filter(
    (c) => c.completed,
  ).length
  return {
    totalXp: missionXp + challengeXp + achievementXp,
    missionXp,
    challengeXp,
    achievementXp,
    missionsCompleted,
    challengesCompleted,
  }
}

/**
 * Fetches the user's xp_awards aggregation from the DB. Returns an empty
 * ledger if the user has no awards (so the caller can decide whether to
 * fall back to legacy sandbox-derived values).
 */
async function fetchLedgerAggregate(
  userId: string,
): Promise<SanitizeSandboxOptions["ledger"]> {
  const rows = (await getDb()
    .select({
      sourceType: xpAwards.sourceType,
      totalXp: sql<number>`coalesce(sum(${xpAwards.xpAmount}), 0)`,
      awardCount: sql<number>`count(*)`,
    })
    .from(xpAwards)
    .where(eq(xpAwards.userId, userId))
    .groupBy(xpAwards.sourceType)) as unknown as LedgerAggregateRow[]

  if (rows.length === 0) return EMPTY_LEDGER

  const byType = {
    stage: { totalXp: 0, count: 0 },
    mission: { totalXp: 0, count: 0 },
    challenge: { totalXp: 0, count: 0 },
    achievement: { totalXp: 0, count: 0 },
  } as SanitizeSandboxOptions["ledger"]["byType"]

  let totalXp = 0
  for (const row of rows) {
    const key = row.sourceType as keyof typeof byType
    if (key in byType) {
      byType[key] = { totalXp: row.totalXp, count: row.awardCount }
      totalXp += row.totalXp
    }
  }

  return { totalXp, byType }
}

/**
 * POST /api/user/sync
 * Syncs browser sandbox data to the database.
 *
 * XP and achievement aggregates are recomputed server-side from the
 * `xp_awards` ledger (plus coupon / field-ops tables). The client's
 * per-mission / per-challenge XP values in the sandbox are NOT trusted —
 * the sandbox is kept only for non-XP client UI state (code attempts,
 * quiz scores, hints used, etc.).
 *
 * Legacy/transition: if the user has no xp_awards rows yet (e.g. existing
 * users from before the claim endpoints shipped), the route falls back to
 * the sandbox's own aggregates for one-time bootstrap. Once a single
 * award is written, the ledger takes over permanently.
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
    let ledger = EMPTY_LEDGER

    try {
      const [couponXpResult, fieldOpsXpResult, ledgerResult] = await Promise.all([
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
        fetchLedgerAggregate(userId),
      ])

      couponXp = couponXpResult[0]?.totalCouponXp ?? 0
      fieldOpsXp = fieldOpsXpResult[0]?.totalFieldOpsXp ?? 0
      ledger = ledgerResult
    } catch (error) {
      console.error("[SYNC] Error fetching XP from DB:", error)
      if (!isMockAuth) {
        throw error
      }
    }

    // If the ledger is empty for this user, fall back to legacy sandbox
    // aggregates so existing users don't lose progress on first sync after
    // the upgrade. The next claim through the new endpoints will switch
    // them to ledger-mode permanently.
    let effectiveLedger = ledger
    if (ledger.totalXp === 0) {
      const legacy = legacySandboxAggregate(sandboxData)
      if (legacy.totalXp > 0) {
        // We don't know per-source-type counts from the legacy sandbox, so
        // we attribute everything to "stage" to keep the totals correct
        // without inventing fake mission/challenge completion counts.
        effectiveLedger = {
          totalXp: legacy.totalXp,
          byType: {
            stage: { totalXp: legacy.totalXp, count: 0 },
            mission: { totalXp: 0, count: legacy.missionsCompleted },
            challenge: { totalXp: 0, count: legacy.challengesCompleted },
            achievement: { totalXp: 0, count: sandboxData.achievements.length },
          },
        }
      }
    }

    const sanitizedSandboxData = sanitizeSandboxAggregates(sandboxData, {
      couponXp,
      fieldOpsXp,
      ledger: effectiveLedger,
    })

    // Encrypt sandbox data before storing
    const encryptedSnapshot = encryptSandbox(JSON.stringify(sanitizedSandboxData))

    // Upsert sandbox snapshot with retry logic for transient failures
    try {
      const snapshotId = nanoid()

      // Wrap database operation with retry for transient failures
      await withDbRetry(async () => {
        await getDb()
          .insert(sandboxSnapshots)
          .values({
            id: snapshotId,
            userId,
            snapshotData: encryptedSnapshot,
            totalXp: sanitizedSandboxData.userStats.totalXp,
            currentStreak: sanitizedSandboxData.streakData.currentStreak,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: sandboxSnapshots.userId,
            set: {
              snapshotData: encryptedSnapshot,
              totalXp: sanitizedSandboxData.userStats.totalXp,
              currentStreak: sanitizedSandboxData.streakData.currentStreak,
              updatedAt: new Date(),
            },
          })
      })
    } catch (upsertError) {
      console.error("[SYNC] Upsert error after retries:", upsertError)
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
    // The POST handler stores snapshot.snapshotData ENCRYPTED via
    // encryptSandbox. We must decrypt before parsing, otherwise
    // JSON.parse throws on ciphertext and every GET 500s. Without this
    // fix, clients on a fresh device (or after a localStorage wipe)
    // never see server-side XP (e.g. redeemed coupons, server-tracked
    // field-ops completions) because the pull always fails.
    const sandboxData = JSON.parse(decryptSandbox(snapshot.snapshotData))

    return NextResponse.json(sandboxData, { status: 200 })
  } catch (error) {
    console.error("Error fetching sandbox data:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
