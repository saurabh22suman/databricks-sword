/**
 * Gamification System
 * 
 * Core gamification mechanics for Databricks Sword:
 * - 8-rank progression system (Cadet → Grandmaster)
 * - 21 achievement system across 5 categories
 * - Daily streak tracking with freeze mechanics
 * - XP multipliers based on streak length
 */

// Types and schemas
export type {
    Achievement,
    AchievementCondition, Rank, StreakData,
    UserProfile,
    XpEvent
} from "./types"

export {
    AchievementConditionSchema, AchievementSchema, RankSchema, StreakDataSchema,
    UserProfileSchema,
    XpEventSchema
} from "./types"

// Ranks
export { RANKS, getNextRank, getRankForXp, getRankProgress, getXpToNextRank } from "./ranks"

// Achievements
export { ACHIEVEMENTS, checkAchievement, getLockedAchievements, getUnlockedAchievements } from "./achievements"

// Achievement Icons
export { ACHIEVEMENT_ICON_MAP, getAchievementIconPath } from "./achievementIcons"

// XP Service
export { awardChallengeXp, awardMissionXp, awardStageXp } from "./xpService"

// Streaks
export { DAILY_FORGE_BASE_XP, DAILY_FORGE_STREAK_BONUSES, calculateDailyForgeXp, calculateStreak, canUseFreeze, earnFreeze, getStreakMultiplier, useFreeze } from "./streaks"
export type { StreakResult } from "./streaks"

