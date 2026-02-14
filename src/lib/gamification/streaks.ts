import type { StreakData } from "./types";

/**
 * Streak System Implementation
 * 
 * Manages daily activity streaks with freeze mechanics and XP multipliers.
 * - Day 1-2: 1x multiplier
 * - Day 3-6: 1.25x multiplier  
 * - Day 7-13: 1.5x multiplier
 * - Day 14+: 2x multiplier
 */

// ============================================================================
// Daily Forge XP Constants
// ============================================================================

/** Base XP awarded for completing the Daily Forge challenge. */
export const DAILY_FORGE_BASE_XP = 30

/**
 * Bonus XP granted at streak milestones.
 * These are one-time bonuses awarded when the streak hits the threshold.
 */
export const DAILY_FORGE_STREAK_BONUSES: readonly { readonly days: number; readonly xp: number }[] = [
  { days: 3, xp: 25 },
  { days: 7, xp: 75 },
  { days: 14, xp: 150 },
  { days: 30, xp: 300 },
  { days: 60, xp: 500 },
  { days: 100, xp: 1000 },
] as const

/**
 * Calculates total XP earned from a Daily Forge completion.
 * Includes base XP, streak multiplier, and any milestone bonus.
 *
 * @param currentStreak - The user's streak count (after today's completion)
 * @returns Object with base, multiplied, bonus, and total XP
 *
 * @example
 * ```ts
 * calculateDailyForgeXp(1)  // { base: 30, multiplied: 30, bonus: 0, total: 30 }
 * calculateDailyForgeXp(7)  // { base: 30, multiplied: 45, bonus: 75, total: 120 }
 * calculateDailyForgeXp(14) // { base: 30, multiplied: 60, bonus: 150, total: 210 }
 * ```
 */
export function calculateDailyForgeXp(currentStreak: number): {
  base: number
  multiplied: number
  bonus: number
  total: number
} {
  const multiplier = getStreakMultiplier(currentStreak)
  const multiplied = Math.round(DAILY_FORGE_BASE_XP * multiplier)
  const milestoneBonus = DAILY_FORGE_STREAK_BONUSES.find((b) => b.days === currentStreak)
  const bonus = milestoneBonus?.xp ?? 0

  return {
    base: DAILY_FORGE_BASE_XP,
    multiplied,
    bonus,
    total: multiplied + bonus,
  }
}

/**
 * Result of streak calculation.
 */
export type StreakResult = {
  maintained: boolean
  newStreak: number
  freezeUsed: boolean
}

/**
 * Options for calculating streaks.
 */
type CalculateStreakOptions = {
  freezesAvailable?: number
}

/**
 * Calculates the new streak status based on last active date and today's date.
 * 
 * @param lastActiveDate - ISO date string of last activity (YYYY-MM-DD)
 * @param today - ISO date string of current date (YYYY-MM-DD)
 * @param options - Optional freeze availability
 * @returns StreakResult with maintained status, new streak count, and freeze usage
 * 
 * @example
 * ```ts
 * // Active yesterday - streak continues
 * calculateStreak("2026-02-11", "2026-02-12")
 * // => { maintained: true, newStreak: 2, freezeUsed: false }
 * 
 * // Missed 2+ days - streak breaks
 * calculateStreak("2026-02-09", "2026-02-12")
 * // => { maintained: false, newStreak: 0, freezeUsed: false }
 * 
 * // Missed 1 day but has freeze available
 * calculateStreak("2026-02-10", "2026-02-12", { freezesAvailable: 1 })
 * // => { maintained: true, newStreak: 2, freezeUsed: true }
 * ```
 */
export function calculateStreak(
  lastActiveDate: string,
  today: string,
  options: CalculateStreakOptions = {},
): StreakResult {
  const lastActive = new Date(lastActiveDate)
  const todayDate = new Date(today)
  
  // Calculate day difference
  const diffTime = todayDate.getTime() - lastActive.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  // Active today or yesterday - streak continues
  if (diffDays === 0) {
    return { maintained: true, newStreak: 1, freezeUsed: false }
  }
  
  if (diffDays === 1) {
    return { maintained: true, newStreak: 2, freezeUsed: false }
  }

  // Missed exactly 1 day (2 days apart) - can use freeze
  if (diffDays === 2 && (options.freezesAvailable ?? 0) > 0) {
    return { maintained: true, newStreak: 2, freezeUsed: true }
  }

  // Streak broken
  return { maintained: false, newStreak: 0, freezeUsed: false }
}

/**
 * Returns the XP multiplier for a given streak length.
 * 
 * @param streak - Current streak count in days
 * @returns XP multiplier (1.0, 1.25, 1.5, or 2.0)
 * 
 * @example
 * ```ts
 * getStreakMultiplier(1)  // 1.0x
 * getStreakMultiplier(5)  // 1.25x
 * getStreakMultiplier(10) // 1.5x
 * getStreakMultiplier(20) // 2.0x
 * ```
 */
export function getStreakMultiplier(streak: number): number {
  if (streak >= 14) {
    return 2.0
  }
  if (streak >= 7) {
    return 1.5
  }
  if (streak >= 3) {
    return 1.25
  }
  return 1.0
}

/**
 * Checks if a user can use a streak freeze.
 * 
 * @param streakData - User's current streak data
 * @returns True if freezes are available
 * 
 * @example
 * ```ts
 * canUseFreeze({ ...data, freezesAvailable: 1 }) // true
 * canUseFreeze({ ...data, freezesAvailable: 0 }) // false
 * ```
 */
export function canUseFreeze(streakData: StreakData): boolean {
  return streakData.freezesAvailable > 0
}

/**
 * Uses a streak freeze (immutable operation).
 * Decrements freezesAvailable and increments freezesUsed.
 * 
 * @param streakData - User's current streak data
 * @returns New StreakData with freeze used
 * 
 * @example
 * ```ts
 * const updated = useFreeze(streakData)
 * // updated.freezesAvailable decremented by 1
 * // updated.freezesUsed incremented by 1
 * ```
 */
export function useFreeze(streakData: StreakData): StreakData {
  return {
    ...streakData,
    freezesAvailable: streakData.freezesAvailable - 1,
    freezesUsed: streakData.freezesUsed + 1,
  }
}

/**
 * Awards a streak freeze to the user (immutable operation).
 * Max 2 freezes can be held at once.
 * 
 * @param streakData - User's current streak data
 * @returns New StreakData with freeze earned (if below max)
 * 
 * @example
 * ```ts
 * const updated = earnFreeze(streakData)
 * // updated.freezesAvailable incremented (max 2)
 * ```
 */
export function earnFreeze(streakData: StreakData): StreakData {
  const MAX_FREEZES = 2
  
  if (streakData.freezesAvailable >= MAX_FREEZES) {
    return streakData
  }

  return {
    ...streakData,
    freezesAvailable: streakData.freezesAvailable + 1,
  }
}
