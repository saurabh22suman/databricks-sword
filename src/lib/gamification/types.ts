import { z } from "zod"

/**
 * Gamification Type Definitions
 * 
 * This module contains all TypeScript types and Zod schemas for the gamification system.
 * Includes: Ranks, Achievements, Streaks, User Profiles, and XP Events.
 */

// ============================================================================
// Rank System
// ============================================================================

/**
 * Represents a player rank in the gamification system.
 * 8 military/mecha-inspired ranks from Cadet to Grandmaster.
 */
export type Rank = {
  id: string
  title: string
  minXp: number
  icon: string
  badge: {
    src: string
    alt: string
    position?: {
      x: number
      y: number
      size: number
    }
  }
  description: string
}

export const RankSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  minXp: z.number().int().min(0),
  icon: z.string().min(1),
  badge: z.object({
    src: z.string().min(1),
    alt: z.string().min(1),
    position: z.object({
      x: z.number(),
      y: z.number(),
      size: z.number()
    }).optional()
  }),
  description: z.string().min(1)
})

// ============================================================================
// Achievement System
// ============================================================================

/**
 * Discriminated union for achievement unlock conditions.
 * Supports multiple condition types with specific requirements.
 */
export type AchievementCondition =
  | { type: "mission-complete"; missionId?: string; count?: number }
  | { type: "quiz-perfect"; count?: number }
  | { type: "streak"; days: number }
  | { type: "rank-reached"; rankId: string }
  | { type: "side-quest-complete"; count: number }
  | { type: "challenge-complete"; category?: string; count: number }
  | { type: "field-ops-complete"; industry: string }

export const AchievementConditionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("mission-complete"),
    missionId: z.string().optional(),
    count: z.number().int().positive().optional(),
  }),
  z.object({
    type: z.literal("quiz-perfect"),
    count: z.number().int().positive().optional(),
  }),
  z.object({
    type: z.literal("streak"),
    days: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("rank-reached"),
    rankId: z.string().min(1),
  }),
  z.object({
    type: z.literal("side-quest-complete"),
    count: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("challenge-complete"),
    category: z.string().optional(),
    count: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("field-ops-complete"),
    industry: z.string().min(1),
  }),
])

/**
 * Achievement definition with unlock condition and XP bonus.
 */
export type Achievement = {
  id: string
  title: string
  description: string
  icon: string
  xpBonus: number
  condition: AchievementCondition
}

export const AchievementSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1),
  xpBonus: z.number().int().min(0),
  condition: AchievementConditionSchema,
})

// ============================================================================
// Streak System
// ============================================================================

/**
 * Tracks player's daily activity streak data.
 * Includes freeze mechanics for maintaining streaks.
 */
export type StreakData = {
  currentStreak: number
  longestStreak: number
  lastActiveDate: string
  freezesAvailable: number
  freezesUsed: number
}

export const StreakDataSchema = z.object({
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  lastActiveDate: z.string().min(1), // ISO date string
  freezesAvailable: z.number().int().min(0).max(2), // max 2 freezes
  freezesUsed: z.number().int().min(0),
})

// ============================================================================
// User Profile
// ============================================================================

/**
 * Complete user profile with gamification data.
 * Includes rank, XP, achievements, streaks, and progress tracking.
 */
export type UserProfile = {
  id: string
  displayName: string
  avatarUrl?: string
  rank: Rank
  totalXp: number
  achievements: string[]
  streakData: StreakData
  completedMissions: string[]
  completedChallenges: string[]
  /** Number of quizzes completed with a perfect score (100%). */
  perfectQuizzes: number
  /** Total number of side quests completed across all missions. */
  completedSideQuests: number
  /** Industry IDs for completed Field Ops deployments. */
  completedFieldOps: string[]
  createdAt: string
}

export const UserProfileSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().url().optional(),
  rank: RankSchema,
  totalXp: z.number().int().min(0),
  achievements: z.array(z.string()),
  streakData: StreakDataSchema,
  completedMissions: z.array(z.string()),
  completedChallenges: z.array(z.string()),
  perfectQuizzes: z.number().int().min(0).default(0),
  completedSideQuests: z.number().int().min(0).default(0),
  completedFieldOps: z.array(z.string()).default([]),
  createdAt: z.string().min(1), // ISO timestamp
})

// ============================================================================
// XP Events
// ============================================================================

/**
 * Represents an XP award event.
 * Tracks source, amount, multiplier, and timestamp for XP gains.
 */
export type XpEvent = {
  type: "stage" | "mission" | "challenge" | "quiz-bonus" | "streak" | "achievement"
  amount: number
  multiplier: number
  source: string
  timestamp: string
}

export const XpEventSchema = z.object({
  type: z.enum(["stage", "mission", "challenge", "quiz-bonus", "streak", "achievement"]),
  amount: z.number().int().min(0),
  multiplier: z.number().min(1.0),
  source: z.string().min(1),
  timestamp: z.string().min(1), // ISO timestamp
})
