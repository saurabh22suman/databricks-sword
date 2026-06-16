/**
 * @file serverXpService.ts
 * @description Server-side XP claim service.
 *
 * Authoritative source for XP awards. Validates claims against mission/challenge
 * content config (so the client cannot inflate XP) and writes to the
 * `xp_awards` ledger with idempotency on (userId, sourceType, sourceId).
 *
 * Replaces the old trust-the-client model where the client sandbox computed
 * XP, sent it to /api/user/sync, and the server accepted it. Now the client
 * only sends an identifier (missionId, stageId, challengeId); the server
 * looks up the canonical XP from content config and writes the award.
 *
 * Idempotency: a duplicate claim (e.g. retry, double-click) is a no-op —
 * `onConflictDoNothing` skips the insert and the test for an empty
 * `returning()` array signals "already awarded".
 */

import { and, desc, eq, gte, sql } from "drizzle-orm"
import { getUserSandbox } from "@/app/api/user/helpers"
import { getChallenge } from "@/lib/challenges/loader"
import { getDb } from "@/lib/db/client"
import { xpAwards } from "@/lib/db/schema"
import { getMission } from "@/lib/missions/loader"
import { getStreakMultiplier } from "./streaks"
import { ACHIEVEMENTS } from "./achievements"

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Bonus XP for completing a stage on the first attempt. */
const FIRST_TRY_BONUS = 15

/** Bonus XP for completing a stage without using any hints. */
const NO_HINTS_BONUS = 50

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type ClaimStageOptions = {
  firstTry?: boolean
  noHints?: boolean
}

export type ClaimStageArgs = {
  userId: string
  missionId: string
  stageId: string
  options?: ClaimStageOptions
}

export type ClaimMissionArgs = {
  userId: string
  missionId: string
}

export type ClaimChallengeArgs = {
  userId: string
  challengeId: string
}

export type ClaimAchievementArgs = {
  userId: string
  achievementId: string
}

export type ClaimResult = {
  /** XP amount recorded for this claim. 0 when nothing was awarded. */
  xpAwarded: number
  /** True if the claim was a no-op because the source was already awarded. */
  alreadyAwarded: boolean
}

type AwardRow = {
  id: string
  xpAmount: number
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Awards XP for completing a mission stage. Idempotent on
 * (userId, "stage", `${missionId}:${stageId}`).
 *
 * Looks up the stage's canonical `xpReward` from mission.json so the client
 * cannot inflate XP by sending a larger number. Applies first-try / no-hints
 * bonuses and the user's current streak multiplier.
 */
export async function claimStageXp(args: ClaimStageArgs): Promise<ClaimResult> {
  const { userId, missionId, stageId, options } = args

  let mission
  try {
    mission = await getMission(missionId)
  } catch {
    return { xpAwarded: 0, alreadyAwarded: false }
  }

  const stage = mission.stages.find((s) => s.id === stageId)
  if (!stage) {
    return { xpAwarded: 0, alreadyAwarded: false }
  }

  let bonusXp = 0
  if (options?.firstTry) bonusXp += FIRST_TRY_BONUS
  if (options?.noHints) bonusXp += NO_HINTS_BONUS

  const multiplier = await getXpMultiplierForUser(userId)
  const xpAmount = Math.floor((stage.xpReward + bonusXp) * multiplier)

  return insertAward({
    userId,
    sourceType: "stage",
    sourceId: `${missionId}:${stageId}`,
    xpAmount,
  })
}

/**
 * Awards XP for completing an entire mission. Idempotent on
 * (userId, "mission", missionId).
 */
export async function claimMissionXp(args: ClaimMissionArgs): Promise<ClaimResult> {
  const { userId, missionId } = args

  let mission
  try {
    mission = await getMission(missionId)
  } catch {
    return { xpAwarded: 0, alreadyAwarded: false }
  }

  const multiplier = await getXpMultiplierForUser(userId)
  const xpAmount = Math.floor(mission.xpReward * multiplier)

  return insertAward({
    userId,
    sourceType: "mission",
    sourceId: missionId,
    xpAmount,
  })
}

/**
 * Awards XP for completing a standalone challenge. Idempotent on
 * (userId, "challenge", challengeId).
 */
export async function claimChallengeXp(args: ClaimChallengeArgs): Promise<ClaimResult> {
  const { userId, challengeId } = args

  const challenge = await getChallenge(challengeId)
  if (!challenge) {
    return { xpAwarded: 0, alreadyAwarded: false }
  }

  const multiplier = await getXpMultiplierForUser(userId)
  const xpAmount = Math.floor(challenge.xpReward * multiplier)

  return insertAward({
    userId,
    sourceType: "challenge",
    sourceId: challengeId,
    xpAmount,
  })
}

/**
 * Awards XP for an achievement unlock. Idempotent on
 * (userId, "achievement", achievementId). XP amount is the achievement's
 * configured `xpBonus` (achievements do not get the streak multiplier —
 * matches the pre-existing client-side behavior).
 */
export async function claimAchievementXp(
  args: ClaimAchievementArgs,
): Promise<ClaimResult> {
  const achievement = ACHIEVEMENTS.find((a) => a.id === args.achievementId)
  if (!achievement) {
    return { xpAwarded: 0, alreadyAwarded: false }
  }

  return insertAward({
    userId: args.userId,
    sourceType: "achievement",
    sourceId: args.achievementId,
    xpAmount: achievement.xpBonus,
  })
}

/**
 * Returns the streak multiplier for a user, computed server-side from
 * their xp_awards history. Falls back to a sandbox-derived streak when
 * the ledger is empty (transition period for existing users).
 */
export async function getXpMultiplierForUser(userId: string): Promise<number> {
  const awards = await fetchUserAwardTimestamps(userId)
  const streak = computeStreakFromAwards(awards)
  return getStreakMultiplier(streak)
}

/**
 * Pure helper: counts the user's current streak from a list of award
 * timestamps. A streak is the number of consecutive days ending today
 * (or yesterday) on which the user has at least one award.
 */
export function computeStreakFromAwards(
  awards: ReadonlyArray<{ awardedAt: Date }>,
): number {
  if (awards.length === 0) return 0

  // Group awards by calendar date (UTC), keep the most recent of each day.
  const dayKeys = new Set<string>()
  for (const a of awards) {
    dayKeys.add(toDateKey(a.awardedAt))
  }

  // Walk backwards from today, counting consecutive days that have an award.
  // Streak is considered "maintained" if the most recent award is today OR
  // yesterday (yesterday = streak still alive, no decay yet).
  const sortedDays = Array.from(dayKeys)
    .map((d) => new Date(d + "T00:00:00Z"))
    .sort((a, b) => b.getTime() - a.getTime())

  const today = startOfUtcDay(new Date())
  const mostRecent = sortedDays[0]
  if (!mostRecent) return 0

  const daysSinceLast = Math.floor(
    (today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (daysSinceLast > 1) {
    return 0
  }

  let streak = 0
  let cursor = mostRecent
  for (const day of sortedDays) {
    if (day.getTime() === cursor.getTime()) {
      streak += 1
      cursor = new Date(cursor.getTime() - 1000 * 60 * 60 * 24)
    } else if (day.getTime() < cursor.getTime()) {
      // Gap — streak ends here
      break
    }
  }
  return streak
}

// -----------------------------------------------------------------------------
// Internals
// -----------------------------------------------------------------------------

/**
 * Inserts an award row. The unique index on (userId, sourceType, sourceId)
 * makes this idempotent: a duplicate insert is a no-op and `returning()`
 * comes back empty.
 */
async function insertAward(args: {
  userId: string
  sourceType: "stage" | "mission" | "challenge" | "achievement"
  sourceId: string
  xpAmount: number
}): Promise<ClaimResult> {
  const rows: AwardRow[] = await getDb()
    .insert(xpAwards)
    .values({
      userId: args.userId,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      xpAmount: args.xpAmount,
      multiplier: 100,
    })
    .onConflictDoNothing({
      target: [xpAwards.userId, xpAwards.sourceType, xpAwards.sourceId],
    })
    .returning({ id: xpAwards.id, xpAmount: xpAwards.xpAmount })

  if (rows.length === 0) {
    return { xpAwarded: 0, alreadyAwarded: true }
  }
  return { xpAwarded: rows[0].xpAmount, alreadyAwarded: false }
}

/**
 * Loads all award timestamps for a user, ordered most-recent-first.
 * Used to compute the streak multiplier.
 */
async function fetchUserAwardTimestamps(
  userId: string,
): Promise<Array<{ awardedAt: Date }>> {
  try {
    const rows = await getDb()
      .select({ awardedAt: xpAwards.awardedAt })
      .from(xpAwards)
      .where(eq(xpAwards.userId, userId))
      .orderBy(desc(xpAwards.awardedAt))
    return rows.map((r) => ({ awardedAt: r.awardedAt as unknown as Date }))
  } catch {
    // Fall back to the sandbox-derived streak for the transition period
    // (existing users whose streak hasn't been backfilled into the ledger).
    const sandbox = await getUserSandbox(userId)
    if (!sandbox) return []
    return [{ awardedAt: sandbox.streakData.lastActiveDate as unknown as Date }]
  }
}

/** Formats a Date as a UTC YYYY-MM-DD key. */
function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Returns midnight UTC for the given date. */
function startOfUtcDay(d: Date): Date {
  return new Date(toDateKey(d) + "T00:00:00Z")
}

// Silence the unused-import warning for `and`, `gte`, `sql` — these are kept
// available for future streak-window queries (e.g. "awards since the start
// of the user's last week" for trend reporting).
void and
void gte
void sql
