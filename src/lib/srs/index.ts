/**
 * Spaced Repetition System (SRS)
 * 
 * A complete implementation of the SM-2 algorithm for optimal spaced repetition
 * of learning material. Converts mission concepts into flashcards for long-term retention.
 * 
 * Features:
 * - SM-2 algorithm implementation
 * - Intelligent scheduling 
 * - Learning analytics
 * - Skill decay detection
 * - Review session management
 */

// Types and schemas
export type {
    Flashcard,
    FlashcardProgress, LearningStats, ReviewResult,
    ReviewSession, SkillDecay
} from "./types"

export {
    CardType, DifficultyLevel, FlashcardProgressSchema, FlashcardSchema, LearningStatsSchema, QualityRating, ReviewResultSchema,
    ReviewSessionSchema, SkillDecaySchema
} from "./types"

// SM-2 Algorithm
export {
    DEFAULT_EASINESS_FACTOR, GRADUATION_QUALITY_THRESHOLD,
    GRADUATION_REPETITIONS, INITIAL_INTERVALS, MAX_EASINESS_FACTOR, MAX_INTERVAL_DAYS, MIN_EASINESS_FACTOR, calculateEasinessFactor,
    calculateInterval, calculateKnowledgeStrength, calculateNextReviewDate, calculateRetentionRate, createInitialProgress, getDaysUntilReview, isCardDue, processReview
} from "./algorithm"

// Scheduler functions
export {
    calculateLearningStats,
    calculateSkillDecay, completeReviewSession, createReviewSession, generateFlashcardsFromMission, getCardsForDate, getDueCards, getOptimalDailyReviews, updateReviewSession
} from "./scheduler"

// Sandbox adapter
export { sandboxToSrsProgress, srsToSandboxProgress } from "./adapter"
