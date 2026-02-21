import type { SandboxData } from "./types"
import { SandboxDataSchema } from "./types"
import { validateStreakData } from "../gamification/streaks"

/**
 * Browser Sandbox Storage
 * 
 * localStorage-based progress storage for browser-first gameplay.
 * All data syncs to server on login for cross-device continuity.
 */

/**
 * localStorage key for sandbox data.
 */
export const SANDBOX_KEY = "databricks-sword:sandbox"

/**
 * Initializes a default empty sandbox state.
 * 
 * @returns Default SandboxData with all fields initialized
 * 
 * @example
 * ```ts
 * const sandbox = initializeSandbox()
 * // Returns fresh state with version 1, empty progress, 2 streak freezes
 * ```
 */
export function initializeSandbox(): SandboxData {
  return {
    version: 1,
    missionProgress: {},
    challengeResults: {},
    userStats: {
      totalXp: 0,
      totalMissionsCompleted: 0,
      totalChallengesCompleted: 0,
      totalAchievements: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalTimeSpentMinutes: 0,
    },
    streakData: {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: "",
      freezesAvailable: 2,
      freezesUsed: 0,
    },
    achievements: [],
    completedFieldOps: [],
    flashcardProgress: {},
    lastSynced: null,
  }
}

/**
 * Saves sandbox data to localStorage.
 * 
 * @param data - Sandbox data to save
 * 
 * @example
 * ```ts
 * const sandbox = initializeSandbox()
 * sandbox.userStats.totalXp = 500
 * saveSandbox(sandbox)
 * ```
 */
export function saveSandbox(data: SandboxData): void {
  const serialized = JSON.stringify(data)
  localStorage.setItem(SANDBOX_KEY, serialized)
}

/**
 * Loads sandbox data from localStorage.
 * Returns null if no data exists or if validation fails.
 * 
 * @returns Parsed and validated SandboxData or null
 * 
 * @example
 * ```ts
 * const sandbox = loadSandbox()
 * if (sandbox) {
 *   console.log(`XP: ${sandbox.userStats.totalXp}`)
 * }
 * ```
 */
export function loadSandbox(): SandboxData | null {
  try {
    const stored = localStorage.getItem(SANDBOX_KEY)
    if (!stored) {
      return null
    }

    const parsed = JSON.parse(stored)
    const validated = SandboxDataSchema.parse(parsed)

    // Validate and decay streak if needed
    const today = new Date().toISOString().split("T")[0]
    const validatedStreakData = validateStreakData(validated.streakData, today)

    // If streak was corrected, update the sandbox
    if (validatedStreakData !== validated.streakData) {
      return {
        ...validated,
        streakData: validatedStreakData,
        userStats: {
          ...validated.userStats,
          currentStreak: validatedStreakData.currentStreak,
          longestStreak: validatedStreakData.longestStreak,
        },
      }
    }

    return validated
  } catch (error) {
    // Invalid JSON or failed Zod validation
    return null
  }
}

/**
 * Clears all sandbox data from localStorage.
 * 
 * @example
 * ```ts
 * clearSandbox()
 * // All progress deleted, fresh start
 * ```
 */
export function clearSandbox(): void {
  localStorage.removeItem(SANDBOX_KEY)
}

/**
 * Returns the byte size of stored sandbox data.
 * 
 * @returns Byte size of localStorage data, or 0 if no data exists
 * 
 * @example
 * ```ts
 * const size = getSandboxSize()
 * console.log(`Using ${(size / 1024).toFixed(2)} KB`)
 * ```
 */
export function getSandboxSize(): number {
  const stored = localStorage.getItem(SANDBOX_KEY)
  if (!stored) {
    return 0
  }

  return new Blob([stored]).size
}

/**
 * Updates sandbox data using an updater function (immutable operation).
 * Loads existing data, applies updater, then saves.
 * If no data exists, initializes a new sandbox first.
 * 
 * @param updater - Function that receives current data and returns updated data
 * 
 * @example
 * ``` ts
 * // Add 50 XP
 * updateSandbox((data) => ({
 *   ...data,
 *   userStats: {
 *     ...data.userStats,
 *     totalXp: data.userStats.totalXp + 50,
 *   },
 * }))
 * ```
 */
export function updateSandbox(
  updater: (data: SandboxData) => SandboxData,
): void {
  const current = loadSandbox() ?? initializeSandbox()
  const updated = updater(current)
  saveSandbox(updated)
}

/**
 * Recomputes userStats by iterating over missionProgress, challengeResults,
 * achievements, and streakData. Heals any drift between the aggregated fields
 * and the actual per-item records.
 *
 * This is a pure function — it does NOT mutate the input sandbox.
 *
 * @param sandbox - The sandbox data to recompute stats for
 * @returns A new SandboxData with corrected userStats
 *
 * @example
 * ```ts
 * const healed = recalculateStats(loadSandbox()!)
 * saveSandbox(healed)
 * ```
 */
export function recalculateStats(sandbox: SandboxData): SandboxData {
  let totalXp = 0
  let totalMissionsCompleted = 0
  let totalChallengesCompleted = 0

  // Sum XP from all mission stage progress
  for (const mission of Object.values(sandbox.missionProgress)) {
    for (const stage of Object.values(mission.stageProgress)) {
      totalXp += stage.xpEarned
    }
    if (mission.completed) {
      totalMissionsCompleted++
    }
  }

  // Sum XP from all challenge results
  for (const challenge of Object.values(sandbox.challengeResults)) {
    totalXp += challenge.xpEarned
    if (challenge.completed) {
      totalChallengesCompleted++
    }
  }

  return {
    ...sandbox,
    userStats: {
      ...sandbox.userStats,
      totalXp,
      totalMissionsCompleted,
      totalChallengesCompleted,
      totalAchievements: sandbox.achievements.length,
      currentStreak: sandbox.streakData.currentStreak,
      longestStreak: sandbox.streakData.longestStreak,
    },
  }
}
