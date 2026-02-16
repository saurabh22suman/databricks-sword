import type { ChallengeResult, FlashcardProgress, MissionProgress, SandboxData, SyncResult } from "./types"
import { SandboxDataSchema } from "./types"

/**
 * Browser Sandbox Sync
 * 
 * Syncs localStorage progress to server for cross-device continuity.
 * Handles conflict resolution with max-wins and union strategies.
 */

/**
 * Syncs local sandbox data to the server.
 * 
 * @param userId - User ID for the sync operation
 * @param sandbox - Local sandbox data to upload
 * @returns SyncResult with success status and timestamp
 * 
 * @example
 * ```ts
 * const result = await syncToServer("user-123", sandboxData)
 * if (result.success) {
 *   console.log(`Synced at ${result.lastSynced}`)
 * }
 * ```
 */
export async function syncToServer(
  _userId: string,
  sandbox: SandboxData,
): Promise<SyncResult> {
  try {
    const response = await fetch("/api/user/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sandbox),
    })

    if (!response.ok) {
      return { success: false, lastSynced: new Date().toISOString() }
    }

    const result: SyncResult = await response.json()
    return result
  } catch (error) {
    return { success: false, lastSynced: new Date().toISOString() }
  }
}

/**
 * Fetches sandbox data from the server.
 * 
 * @param userId - User ID to fetch sandbox for
 * @returns Remote SandboxData or null if not found/error
 * 
 * @example
 * ``` ts
 * const remoteSandbox = await syncFromServer("user-123")
 * if (remoteSandbox) {
 *   // Merge with local
 * }
 * ```
 */
export async function syncFromServer(
  _userId?: string,
): Promise<SandboxData | null> {
  try {
    const response = await fetch("/api/user/sync")

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (!data) {
      return null
    }

    // Validate returned data
    const validated = SandboxDataSchema.parse(data)
    return validated
  } catch (error) {
    return null
  }
}

/**
 * Merges local and remote sandbox data, resolving conflicts.
 * 
 * Strategy:
 * - XP/stats: Keep maximum values
 * - Achievements/completions: Union (combine both)
 * - Timestamps: Keep latest
 * - Streaks: Keep higher current, higher longest
 * 
 * @param local - Local sandbox data
 * @param remote - Remote sandbox data
 * @returns Merged SandboxData
 * 
 * @example
 * ```ts
 * const merged = mergeConflicts(localSandbox, remoteSandbox)
 * saveSandbox(merged)
 * ```
 */
export function mergeConflicts(
  local: SandboxData,
  remote: SandboxData,
): SandboxData {
  // Keep higher XP and stats (max-wins strategy)
  const mergedStats = {
    totalXp: Math.max(local.userStats.totalXp, remote.userStats.totalXp),
    totalMissionsCompleted: Math.max(
      local.userStats.totalMissionsCompleted,
      remote.userStats.totalMissionsCompleted,
    ),
    totalChallengesCompleted: Math.max(
      local.userStats.totalChallengesCompleted,
      remote.userStats.totalChallengesCompleted,
    ),
    totalAchievements: Math.max(
      local.userStats.totalAchievements,
      remote.userStats.totalAchievements,
    ),
    currentStreak: Math.max(
      local.userStats.currentStreak,
      remote.userStats.currentStreak,
    ),
    longestStreak: Math.max(
      local.userStats.longestStreak,
      remote.userStats.longestStreak,
    ),
    totalTimeSpentMinutes: Math.max(
      local.userStats.totalTimeSpentMinutes,
      remote.userStats.totalTimeSpentMinutes,
    ),
  }

  // Union of achievements (combine unique IDs)
  const mergedAchievements = Array.from(
    new Set([...local.achievements, ...remote.achievements]),
  )

  // Union of completed field ops (combine unique industry IDs)
  const mergedCompletedFieldOps = Array.from(
    new Set([
      ...(local.completedFieldOps ?? []),
      ...(remote.completedFieldOps ?? []),
    ]),
  )

  // Merge mission progress (keep latest for each mission)
  const mergedMissionProgress: Record<string, MissionProgress> = { ...local.missionProgress }

  for (const [missionId, remoteProgress] of Object.entries(
    remote.missionProgress,
  )) {
    const localProgress = local.missionProgress[missionId]

    if (!localProgress) {
      mergedMissionProgress[missionId] = remoteProgress
    } else {
      // If both exist, keep the one with later completedAt
      const localCompletedAt = localProgress.completedAt || ""
      const remoteCompletedAt = remoteProgress.completedAt || ""

      if (remoteCompletedAt > localCompletedAt) {
        mergedMissionProgress[missionId] = remoteProgress
      }
    }
  }

  // Merge challenge results (similar strategy)
  const mergedChallengeResults: Record<string, ChallengeResult> = {
    ...local.challengeResults,
  }

  for (const [challengeId, remoteResult] of Object.entries(
    remote.challengeResults,
  )) {
    const localResult = local.challengeResults[challengeId]

    if (!localResult) {
      mergedChallengeResults[challengeId] = remoteResult
    } else {
      // Keep the one with later completedAt
      const localCompletedAt = localResult.completedAt || ""
      const remoteCompletedAt = remoteResult.completedAt || ""

      if (remoteCompletedAt > localCompletedAt) {
        mergedChallengeResults[challengeId] = remoteResult
      }
    }
  }

  // Merge flashcard progress (keep latest for each card)
  const mergedFlashcardProgress: Record<string, FlashcardProgress> = {
    ...local.flashcardProgress,
  }

  for (const [cardId, remoteCard] of Object.entries(remote.flashcardProgress)) {
    const localCard = local.flashcardProgress[cardId]

    if (!localCard) {
      mergedFlashcardProgress[cardId] = remoteCard
    } else {
      // Keep the one with later lastReviewed
      if (remoteCard.lastReviewed > localCard.lastReviewed) {
        mergedFlashcardProgress[cardId] = remoteCard
      }
    }
  }

  // Merge streak data (keep higher values)
  const mergedStreakData = {
    currentStreak: Math.max(
      local.streakData.currentStreak,
      remote.streakData.currentStreak,
    ),
    longestStreak: Math.max(
      local.streakData.longestStreak,
      remote.streakData.longestStreak,
    ),
    lastActiveDate:
      local.streakData.lastActiveDate > remote.streakData.lastActiveDate
        ? local.streakData.lastActiveDate
        : remote.streakData.lastActiveDate,
    freezesAvailable: Math.max(
      local.streakData.freezesAvailable,
      remote.streakData.freezesAvailable,
    ),
    freezesUsed: Math.min(
      local.streakData.freezesUsed,
      remote.streakData.freezesUsed,
    ),
  }

  // Keep latest lastSynced
  const mergedLastSynced =
    local.lastSynced && remote.lastSynced
      ? local.lastSynced > remote.lastSynced
        ? local.lastSynced
        : remote.lastSynced
      : local.lastSynced || remote.lastSynced

  return {
    version: Math.max(local.version, remote.version),
    missionProgress: mergedMissionProgress,
    challengeResults: mergedChallengeResults,
    userStats: mergedStats,
    streakData: mergedStreakData,
    achievements: mergedAchievements,
    completedFieldOps: mergedCompletedFieldOps,
    flashcardProgress: mergedFlashcardProgress,
    lastSynced: mergedLastSynced,
  }
}

/**
 * Determines if a sandbox should be synced based on time and changes.
 * 
 * Sync if:
 * - Never synced before
 * - Last sync > 5 minutes ago
 * - Significant changes since last sync (XP gained, achievements unlocked)
 * 
 * @param sandbox - Sandbox data to check
 * @returns True if sync is recommended
 * 
 * @example
 * ```ts
 * if (shouldSync(sandbox)) {
 *   await syncToServer(userId, sandbox)
 * }
 * ```
 */
export function shouldSync(sandbox: SandboxData): boolean {
  // Never synced - should sync
  if (!sandbox.lastSynced) {
    return true
  }

  const lastSyncTime = new Date(sandbox.lastSynced).getTime()
  const now = Date.now()
  const fiveMinutes = 5 * 60 * 1000

  // More than 5 minutes since last sync
  if (now - lastSyncTime > fiveMinutes) {
    return true
  }

  // Significant changes - has XP that wasn't there before
  // (This is a simple heuristic - in practice you'd track dirtiness more carefully)
  if (sandbox.userStats.totalXp > 0) {
    return true
  }

  return false
}
