import { z } from "zod"

/**
 * Browser Sandbox Types
 * 
 * Types for localStorage-based progress storage with DB sync.
 * All data stored in browser persists between sessions and syncs
 * to the server on login for cross-device continuity.
 */

/**
 * Stage completion progress within a mission.
 */
export type StageProgress = {
  completed: boolean
  xpEarned: number
  codeAttempts: string[]
  hintsUsed: number
  completedAt?: string // ISO timestamp
  /** Quiz score percentage (0-100). Only set for quiz stages. */
  quizScore?: number
}

/**
 * Zod schema for StageProgress validation.
 */
export const StageProgressSchema = z.object({
  completed: z.boolean(),
  xpEarned: z.number().nonnegative(),
  codeAttempts: z.array(z.string()),
  hintsUsed: z.number().nonnegative().int(),
  completedAt: z.string().optional(),
  quizScore: z.number().min(0).max(100).optional(),
})

/**
 * Mission completion progress.
 */
export type MissionProgress = {
  started: boolean
  completed: boolean
  currentStageId?: string
  stageProgress: Record<string, StageProgress>
  sideQuestsCompleted: string[]
  totalXpEarned: number
  startedAt?: string // ISO timestamp
  completedAt?: string // ISO timestamp
  /** Execution mode for this mission */
  executionMode?: "simulated" | "databricks"
  /** Current bundle deployment status */
  bundleStatus?: "not-deployed" | "deploying" | "deployed" | "destroying" | "error"
  /** When the bundle was deployed */
  deployedAt?: string // ISO timestamp
}

/**
 * Zod schema for MissionProgress validation.
 */
export const MissionProgressSchema = z.object({
  started: z.boolean(),
  completed: z.boolean(),
  currentStageId: z.string().optional(),
  stageProgress: z.record(z.string(), StageProgressSchema),
  sideQuestsCompleted: z.array(z.string()),
  totalXpEarned: z.number().nonnegative(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  executionMode: z.enum(["simulated", "databricks"]).optional(),
  bundleStatus: z.enum(["not-deployed", "deploying", "deployed", "destroying", "error"]).optional(),
  deployedAt: z.string().optional(),
})

/** Maximum number of challenge completions that award XP */
export const MAX_CHALLENGE_XP_COMPLETIONS = 2

/**
 * Challenge attempt result.
 */
export type ChallengeResult = {
  attempted: boolean
  completed: boolean
  xpEarned: number
  hintsUsed: number
  attempts: number
  /** Number of times the challenge was successfully completed */
  completionCount: number
  bestScore?: number // 0-100
  completedAt?: string // ISO timestamp
}

/**
 * Zod schema for ChallengeResult validation.
 */
export const ChallengeResultSchema = z.object({
  attempted: z.boolean(),
  completed: z.boolean(),
  xpEarned: z.number().nonnegative(),
  hintsUsed: z.number().nonnegative().int(),
  attempts: z.number().nonnegative().int(),
  completionCount: z.number().nonnegative().int().default(0),
  bestScore: z.number().min(0).max(100).optional(),
  completedAt: z.string().optional(),
})

/**
 * User statistics aggregated across all activities.
 */
export type UserStats = {
  totalXp: number
  totalMissionsCompleted: number
  totalChallengesCompleted: number
  totalAchievements: number
  currentStreak: number
  longestStreak: number
  totalTimeSpentMinutes: number
}

/**
 * Zod schema for UserStats validation.
 */
export const UserStatsSchema = z.object({
  totalXp: z.number().nonnegative(),
  totalMissionsCompleted: z.number().nonnegative().int(),
  totalChallengesCompleted: z.number().nonnegative().int(),
  totalAchievements: z.number().nonnegative().int(),
  currentStreak: z.number().nonnegative().int(),
  longestStreak: z.number().nonnegative().int(),
  totalTimeSpentMinutes: z.number().nonnegative(),
})

/**
 * Flashcard review progress for spaced repetition.
 */
export type FlashcardProgress = {
  lastReviewed: string // ISO timestamp
  interval: number // Days until next review
  easeFactor: number // SM-2 ease factor
  repetitions: number // Number of successful reviews
  nextReview: string // ISO timestamp
}

/**
 * Zod schema for FlashcardProgress validation.
 */
export const FlashcardProgressSchema = z.object({
  lastReviewed: z.string(),
  interval: z.number().positive(),
  easeFactor: z.number().positive(),
  repetitions: z.number().nonnegative().int(),
  nextReview: z.string(),
})

/**
 * Complete sandbox data structure stored in localStorage.
 */
export type SandboxData = {
  version: number // Schema version for migrations
  missionProgress: Record<string, MissionProgress>
  challengeResults: Record<string, ChallengeResult>
  userStats: UserStats
  streakData: {
    currentStreak: number
    longestStreak: number
    lastActiveDate: string
    freezesAvailable: number
    freezesUsed: number
  }
  achievements: string[] // Achievement IDs
  flashcardProgress: Record<string, FlashcardProgress>
  lastSynced: string | null // ISO timestamp
}

/**
 * Zod schema for SandboxData validation.
 */
export const SandboxDataSchema = z.object({
  version: z.number().positive().int(),
  missionProgress: z.record(z.string(), MissionProgressSchema),
  challengeResults: z.record(z.string(), ChallengeResultSchema),
  userStats: UserStatsSchema,
  streakData: z.object({
    currentStreak: z.number().nonnegative().int(),
    longestStreak: z.number().nonnegative().int(),
    lastActiveDate: z.string(), // Can be empty for new users
    freezesAvailable: z.number().nonnegative().int(),
    freezesUsed: z.number().nonnegative().int(),
  }),
  achievements: z.array(z.string()),
  flashcardProgress: z.record(z.string(), FlashcardProgressSchema),
  lastSynced: z.string().nullable(),
})

/**
 * Result of a sync operation.
 */
export type SyncResult = {
  success: boolean
  lastSynced: string
  conflicts?: {
    field: string
    localValue: unknown
    remoteValue: unknown
  }[]
}

/**
 * Zod schema for SyncResult validation.
 */
export const SyncResultSchema = z.object({
  success: z.boolean(),
  lastSynced: z.string(),
  conflicts: z
    .array(
      z.object({
        field: z.string(),
        localValue: z.unknown(),
        remoteValue: z.unknown(),
      }),
    )
    .optional(),
})
