/**
 * @file xpService.ts
 * @description Client-side XP event tracking service.
 *
 * Server-first model: the canonical XP amount is determined by the server
 * (`/api/progress/{stage,mission,challenge}` claim endpoints, which read
 * mission/challenge content config and write to the `xp_awards` ledger).
 * The client just sends an identifier and the server tells us how much
 * XP to award.
 *
 * Offline fallback: if the network call fails or the server returns a
 * non-OK status, the client falls back to the local-computation path
 * (base XP + streak multiplier) so the UI can still show an XP animation
 * while disconnected. When the user reconnects, the next claim through
 * the new endpoints will write the canonical award to the ledger, and
 * the sync route will recompute totalXp from the ledger on next sync.
 *
 * Idempotency: a duplicate claim returns `{ xpAwarded: 0, alreadyAwarded: true }`
 * from the server. The client suppresses the XP event in that case so
 * the user doesn't see the same XP animation twice.
 */

import { initializeSandbox, loadSandbox, updateSandbox } from "@/lib/sandbox/storage"
import type { SandboxData } from "@/lib/sandbox/types"
import { MAX_CHALLENGE_XP_COMPLETIONS } from "@/lib/sandbox/types"
import { ACHIEVEMENTS, checkAchievement } from "./achievements"
import { emitXpEvent } from "./xpEventBus"
import { getRankForXp } from "./ranks"
import { calculateStreak, getStreakMultiplier, useFreeze } from "./streaks"
import type { UserProfile, XpEvent } from "./types"


// -----------------------------------------------------------------------------
// Server claim helpers
// -----------------------------------------------------------------------------

type ClaimResult = {
  xpAwarded: number
  alreadyAwarded: boolean
}

/**
 * POSTs a claim to the server and returns the parsed result. Returns null
 * on any error (network, non-2xx status, malformed JSON) so the caller
 * can fall back to local computation.
 */
async function postClaim(
  url: string,
  body: Record<string, unknown>,
): Promise<ClaimResult | null> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!response.ok) return null
    const data = (await response.json()) as ClaimResult
    if (typeof data?.xpAwarded !== "number") return null
    return data
  } catch {
    return null
  }
}

// -----------------------------------------------------------------------------
// Profile / achievement helpers (unchanged)
// -----------------------------------------------------------------------------

/**
 * Builds a UserProfile from sandbox data for achievement condition checking.
 */
function buildProfileFromSandbox(data: SandboxData): UserProfile {
  const perfectQuizzes = Object.values(data.missionProgress).reduce(
    (sum, mp) => {
      const stageQuizPerfects = Object.values(mp.stageProgress).filter(
        (sp) => sp.quizScore === 100,
      ).length
      return sum + stageQuizPerfects
    },
    0,
  )

  const completedSideQuests = Object.values(data.missionProgress).reduce(
    (sum, mp) => sum + mp.sideQuestsCompleted.length,
    0,
  )

  return {
    id: "local",
    displayName: "Local User",
    rank: getRankForXp(data.userStats.totalXp),
    totalXp: data.userStats.totalXp,
    achievements: data.achievements,
    streakData: data.streakData,
    completedMissions: Object.entries(data.missionProgress)
      .filter(([, p]) => p.completed)
      .map(([slug]) => slug),
    completedChallenges: Object.entries(data.challengeResults)
      .filter(([, r]) => r.completed)
      .map(([id]) => id),
    perfectQuizzes,
    completedSideQuests,
    completedFieldOps: data.completedFieldOps ?? [],
    createdAt: new Date().toISOString(),
  }
}

/**
 * Checks all achievements against current sandbox state and unlocks any
 * newly earned ones, claiming their XP bonuses from the server.
 *
 * Each newly-unlocked achievement is POSTed to `/api/progress/achievement`.
 * The server is authoritative for the XP amount and for idempotency:
 * a retry returns `alreadyAwarded: true, xpAwarded: 0`, and we suppress
 * the local XP addition in that case.
 *
 * If the network call fails (postClaim returns null), we still unlock
 * the achievement locally (so the user sees the badge) but add zero XP.
 * The achievement XP is then lost for that session — the offline-claim
 * queue (P0-1) does not yet cover achievements. (Future work: extend
 * the queue to include achievement claims.)
 *
 * Called automatically after every XP award (stage, mission, challenge).
 */
async function checkAndUnlockAchievements(): Promise<void> {
  const sandbox = loadSandbox()
  if (!sandbox) return

  const profile = buildProfileFromSandbox(sandbox)
  const alreadyUnlocked = new Set(sandbox.achievements)
  const newlyUnlocked: string[] = []

  for (const achievement of ACHIEVEMENTS) {
    if (alreadyUnlocked.has(achievement.id)) continue
    if (checkAchievement(achievement.condition, profile)) {
      newlyUnlocked.push(achievement.id)
    }
  }

  if (newlyUnlocked.length === 0) return

  // Claim each achievement server-side, in parallel.
  const serverResults = await Promise.all(
    newlyUnlocked.map((id) =>
      postClaim("/api/progress/achievement", { achievementId: id }),
    ),
  )

  const newlyAwarded: string[] = []
  let bonusXp = 0
  newlyUnlocked.forEach((id, i) => {
    const result = serverResults[i]
    if (result && !result.alreadyAwarded && result.xpAwarded > 0) {
      newlyAwarded.push(id)
      bonusXp += result.xpAwarded
    } else if (!result) {
      // Network error — unlock locally with no XP (queue does not cover achievements yet)
      newlyAwarded.push(id)
    }
  })

  if (newlyAwarded.length === 0) return

  updateSandbox((data) => ({
    ...data,
    achievements: [...data.achievements, ...newlyAwarded],
    userStats: {
      ...data.userStats,
      totalXp: data.userStats.totalXp + bonusXp,
      totalAchievements: data.achievements.length + newlyAwarded.length,
    },
  }))
}

/**
 * Updates streak data based on user activity.
 */
function updateStreakOnActivity(data: SandboxData): SandboxData {
  const today = new Date().toISOString().split("T")[0]
  const lastActiveDate = data.streakData.lastActiveDate

  if (lastActiveDate === today) {
    return data
  }

  const lastActive = new Date(lastActiveDate)
  const todayDate = new Date(today)
  const diffTime = todayDate.getTime() - lastActive.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  let newStreak = data.streakData.currentStreak
  let streakData = data.streakData

  if (diffDays === 1) {
    newStreak += 1
  } else {
    const result = calculateStreak(lastActiveDate, today, {
      freezesAvailable: streakData.freezesAvailable,
    })

    if (result.maintained && result.freezeUsed) {
      newStreak += 1
      streakData = useFreeze(streakData)
    } else if (result.maintained) {
      newStreak += 1
    } else {
      newStreak = 1
    }
  }

  const longestStreak = Math.max(streakData.longestStreak, newStreak)

  return {
    ...data,
    streakData: {
      ...streakData,
      currentStreak: newStreak,
      longestStreak,
      lastActiveDate: today,
    },
  }
}

// -----------------------------------------------------------------------------
// Public API — server-first
// -----------------------------------------------------------------------------

type StageXpOptions = {
  /** Number of attempts the user made on this stage. Defaults to 1. */
  attempts?: number
  /** Number of hints the user used on this stage. */
  hintsUsed?: number
}

/**
 * Awards XP for completing a mission stage. Idempotent on the server via
 * the `xp_awards` ledger. The server returns the canonical amount
 * (base XP from content config + first-try/no-hints bonuses + streak
 * multiplier). On network/5xx failure, falls back to local computation
 * so the UI can still render an XP animation.
 *
 * @param missionId - The mission slug
 * @param stageId - The stage ID within the mission
 * @param baseXp - Base XP reward used for the offline-fallback path
 * @param options - Stage attempt metadata (attempts, hintsUsed)
 * @returns The XpEvent with the final amount (server-authoritative when available)
 */
export async function awardStageXp(
  missionId: string,
  stageId: string,
  baseXp: number,
  options?: StageXpOptions,
): Promise<XpEvent> {
  const sandbox = loadSandbox() ?? initializeSandbox()
  const localMultiplier = getStreakMultiplier(sandbox.streakData.currentStreak)

  // Local fallback: base XP + streak multiplier only.
  // Server is authoritative for first-try/no-hints bonuses - we don't apply them locally.
  const localAmount = Math.floor(baseXp * localMultiplier)

  const serverResult = await postClaim("/api/progress/stage", {
    missionId,
    stageId,
    attempts: options?.attempts ?? 1,
    hintsUsed: options?.hintsUsed ?? 0,
  })

  const amount = serverResult ? serverResult.xpAwarded : localAmount
  const alreadyAwarded = serverResult?.alreadyAwarded ?? false
  const multiplier = serverResult && baseXp > 0 ? amount / baseXp : localMultiplier

  const event: XpEvent = {
    type: "stage",
    amount,
    multiplier,
    source: `${missionId}/${stageId}`,
    timestamp: new Date().toISOString(),
  }

  if (amount > 0) {
    updateSandbox((data) => {
      const withStreak = updateStreakOnActivity(data)
      const missionProgress = { ...withStreak.missionProgress }
      const existing = missionProgress[missionId] ?? {
        started: true,
        completed: false,
        stageProgress: {},
        sideQuestsCompleted: [],
        totalXpEarned: 0,
      }

      const stageProgress = { ...existing.stageProgress }
      const existingStage = stageProgress[stageId] ?? {
        completed: false,
        xpEarned: 0,
        codeAttempts: [],
        hintsUsed: 0,
      }

      stageProgress[stageId] = {
        ...existingStage,
        completed: true,
        xpEarned: amount,
        completedAt: event.timestamp,
      }

      missionProgress[missionId] = {
        ...existing,
        started: true,
        stageProgress,
        totalXpEarned: existing.totalXpEarned + amount,
      }

      return {
        ...withStreak,
        missionProgress,
        userStats: {
          ...withStreak.userStats,
          totalXp: withStreak.userStats.totalXp + amount,
        },
      }
    })
  }

  await checkAndUnlockAchievements()

  if (!alreadyAwarded && amount > 0) {
    emitXpEvent(event)
  }

  return event
}

/**
 * Awards XP for completing an entire mission. Idempotent on the server.
 * Falls back to local computation when the server is unreachable.
 */
export async function awardMissionXp(
  missionId: string,
  baseXp: number,
): Promise<XpEvent> {
  const sandbox = loadSandbox() ?? initializeSandbox()
  const localMultiplier = getStreakMultiplier(sandbox.streakData.currentStreak)
  // Local idempotency: don't re-award a mission that was already completed
  // in this sandbox. The server enforces the same via xp_awards, but in
  // offline mode the local sandbox is the only record we have.
  const localAlreadyCompleted =
    sandbox.missionProgress[missionId]?.completed ?? false
  const localAmount = localAlreadyCompleted
    ? 0
    : Math.floor(baseXp * localMultiplier)

  const serverResult = await postClaim("/api/progress/mission", {
    missionId,
  })

  const amount = serverResult ? serverResult.xpAwarded : localAmount
  const alreadyAwarded = serverResult?.alreadyAwarded ?? false
  const multiplier = serverResult && baseXp > 0 ? amount / baseXp : localMultiplier

  const event: XpEvent = {
    type: "mission",
    amount,
    multiplier,
    source: missionId,
    timestamp: new Date().toISOString(),
  }

  // Idempotency: if the server says this mission was already completed,
  // don't double-add the mission-completion bonus to the local sandbox.
  if (!alreadyAwarded && amount > 0) {
    updateSandbox((data) => {
      const withStreak = updateStreakOnActivity(data)
      const missionProgress = { ...withStreak.missionProgress }
      const existing = missionProgress[missionId] ?? {
        started: true,
        completed: false,
        stageProgress: {},
        sideQuestsCompleted: [],
        totalXpEarned: 0,
      }

      if (existing.completed) {
        return withStreak
      }

      missionProgress[missionId] = {
        ...existing,
        completed: true,
        completedAt: event.timestamp,
        totalXpEarned: existing.totalXpEarned + amount,
      }

      return {
        ...withStreak,
        missionProgress,
        userStats: {
          ...withStreak.userStats,
          totalXp: withStreak.userStats.totalXp + amount,
          totalMissionsCompleted: withStreak.userStats.totalMissionsCompleted + 1,
        },
      }
    })
  }

  await checkAndUnlockAchievements()

  if (!alreadyAwarded && amount > 0) {
    emitXpEvent(event)
  }

  return event
}

/**
 * Awards XP for completing a standalone challenge. Idempotent on the server.
 * Falls back to local computation when the server is unreachable. Local
 * fallback still respects the {@link MAX_CHALLENGE_XP_COMPLETIONS} cap.
 */
export async function awardChallengeXp(
  challengeId: string,
  baseXp: number,
): Promise<XpEvent> {
  const sandbox = loadSandbox() ?? initializeSandbox()
  const localMultiplier = getStreakMultiplier(sandbox.streakData.currentStreak)
  const existing = sandbox.challengeResults[challengeId]
  const localCompletionCount = existing?.completionCount ?? 0
  const localXpMaxed = localCompletionCount >= MAX_CHALLENGE_XP_COMPLETIONS
  const localAmount = localXpMaxed ? 0 : Math.floor(baseXp * localMultiplier)

  const serverResult = await postClaim("/api/progress/challenge", {
    challengeId,
  })

  const amount = serverResult ? serverResult.xpAwarded : localAmount
  const alreadyAwarded = serverResult?.alreadyAwarded ?? false
  const multiplier = serverResult && baseXp > 0 ? amount / baseXp : localMultiplier

  const event: XpEvent = {
    type: "challenge",
    amount,
    multiplier,
    source: challengeId,
    timestamp: new Date().toISOString(),
  }

  // isNewCompletion: true only when server confirms this is a fresh award.
  // When server says alreadyAwarded: true, this is a retry that was
  // already counted - don't double-increment XP/completionCount.
  // Note: local cap (amount=0) is different - user DID complete, just hit XP cap.
  const isNewCompletion = !alreadyAwarded

  updateSandbox((data) => {
    const withStreak = updateStreakOnActivity(data)
    const challengeResults = { ...withStreak.challengeResults }
    const prev = challengeResults[challengeId]

    challengeResults[challengeId] = {
      attempted: true,
      completed: true,
      // Only add to xpEarned on a NEW completion. A retry against an
      // already-awarded challenge must not double-count.
      xpEarned: (prev?.xpEarned ?? 0) + (isNewCompletion ? amount : 0),
      hintsUsed: prev?.hintsUsed ?? 0,
      // attempts always increments — the user genuinely tried again.
      attempts: (prev?.attempts ?? 0) + 1,
      // completionCount increments on any completion (local cap or new award).
      // Only skips when server says alreadyAwarded (to prevent double-count).
      completionCount: (prev?.completionCount ?? 0) + (isNewCompletion ? 1 : 0),
      completedAt: event.timestamp,
    }

    return {
      ...withStreak,
      challengeResults,
      userStats: {
        ...withStreak.userStats,
        // totalXp only bumps on a new completion.
        totalXp: withStreak.userStats.totalXp + (isNewCompletion ? amount : 0),
        totalChallengesCompleted: isNewCompletion
          ? prev?.completed
            ? withStreak.userStats.totalChallengesCompleted
            : withStreak.userStats.totalChallengesCompleted + 1
          : withStreak.userStats.totalChallengesCompleted,
      },
    }
  })

  await checkAndUnlockAchievements()

  if (!alreadyAwarded && amount > 0) {
    emitXpEvent(event)
  }

  return event
}
