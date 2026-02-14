import { z } from "zod"

/**
 * Spaced Repetition System (SRS) Types
 * 
 * Based on the SM-2 algorithm for optimal spaced repetition scheduling.
 * Converts mission concepts into flashcards for long-term retention.
 */

/**
 * Quality rating scale for SM-2 algorithm (0-5)
 * 0: Complete blackout
 * 1: Incorrect response but correct one remembered
 * 2: Incorrect response but correct one seemed familiar 
 * 3: Correct response but with serious difficulty
 * 4: Correct response but with hesitation
 * 5: Perfect response
 */
export const QualityRating = z.number().int().min(0).max(5)
export type QualityRating = z.infer<typeof QualityRating>

/**
 * Difficulty level for flashcards
 */
export const DifficultyLevel = z.enum(["B", "A", "S"])
export type DifficultyLevel = z.infer<typeof DifficultyLevel>

/**
 * Card type based on content format
 */
export const CardType = z.enum([
  "concept",      // Definition/explanation cards
  "code",         // Code snippet questions
  "comparison",   // A vs B comparisons
  "procedure"     // Step-by-step processes
])
export type CardType = z.infer<typeof CardType>

/**
 * Flashcard Schema
 * Auto-generated from mission content for spaced repetition
 */
export const FlashcardSchema = z.object({
  /** Unique identifier */
  id: z.string(),
  
  /** Source mission ID this card was generated from */
  missionId: z.string(),
  
  /** Question/front side of the card */
  question: z.string(),
  
  /** Answer/back side of the card */
  answer: z.string(),
  
  /** Optional code example */
  codeExample: z.string().optional(),
  
  /** Hint for difficult cards */
  hint: z.string().optional(),
  
  /** Card difficulty level */
  difficulty: DifficultyLevel,
  
  /** Type of card content */
  type: CardType,
  
  /** Tags for categorization */
  tags: z.array(z.string()),
  
  /** When this card was created */
  createdAt: z.string().datetime(),
  
  /** Last time card content was updated */
  updatedAt: z.string().datetime()
})

export type Flashcard = z.infer<typeof FlashcardSchema>

/**
 * SM-2 Algorithm Progress Data
 * Tracks user's learning progress for each flashcard
 */
export const FlashcardProgressSchema = z.object({
  /** Card ID this progress relates to */
  cardId: z.string(),
  
  /** User ID this progress belongs to */
  userId: z.string(),
  
  /** Easiness Factor (1.3 - 2.5, default 2.5) */
  easinessFactor: z.number().min(1.3).max(2.5).default(2.5),
  
  /** Current interval in days */
  interval: z.number().int().min(0).default(0),
  
  /** Number of correct repetitions in a row */
  repetitions: z.number().int().min(0).default(0),
  
  /** Next review date (ISO string) */
  nextReview: z.string().datetime(),
  
  /** Last review date (ISO string) */
  lastReview: z.string().datetime().optional(),
  
  /** Last quality rating (0-5) */
  lastQuality: QualityRating.optional(),
  
  /** Total number of reviews */
  totalReviews: z.number().int().min(0).default(0),
  
  /** Number of times card was forgotten (quality < 3) */
  lapseCount: z.number().int().min(0).default(0),
  
  /** Average quality score */
  averageQuality: z.number().min(0).max(5).optional(),
  
  /** Card graduation status */
  isGraduated: z.boolean().default(false),
  
  /** When this progress was created */
  createdAt: z.string().datetime(),
  
  /** Last update timestamp */
  updatedAt: z.string().datetime()
})

export type FlashcardProgress = z.infer<typeof FlashcardProgressSchema>

/**
 * Review Result
 * Records the outcome of a single flashcard review
 */
export const ReviewResultSchema = z.object({
  /** Card ID that was reviewed */
  cardId: z.string(),
  
  /** User ID who reviewed */
  userId: z.string(),
  
  /** Quality rating given (0-5) */
  quality: QualityRating,
  
  /** Time taken to answer in seconds */
  responseTime: z.number().min(0).optional(),
  
  /** Whether user used hint */
  usedHint: z.boolean().default(false),
  
  /** Review timestamp */
  reviewedAt: z.string().datetime(),
  
  /** Previous interval before this review */
  previousInterval: z.number().int().min(0),
  
  /** New interval after this review */
  newInterval: z.number().int().min(0),
  
  /** Previous easiness factor */
  previousEasinessFactor: z.number().min(1.3).max(2.5),
  
  /** New easiness factor */
  newEasinessFactor: z.number().min(1.3).max(2.5)
})

export type ReviewResult = z.infer<typeof ReviewResultSchema>

/**
 * Review Session
 * Tracks a complete review session
 */
export const ReviewSessionSchema = z.object({
  /** Session ID */
  id: z.string(),
  
  /** User ID */
  userId: z.string(),
  
  /** Cards reviewed in this session */
  cardIds: z.array(z.string()),
  
  /** Total cards reviewed */
  cardsReviewed: z.number().int().min(0),
  
  /** Cards answered correctly (quality >= 3) */
  cardsCorrect: z.number().int().min(0),
  
  /** Average quality score for session */
  averageQuality: z.number().min(0).max(5),
  
  /** Total time spent in seconds */
  totalTimeSeconds: z.number().int().min(0),
  
  /** Session start time */
  startedAt: z.string().datetime(),
  
  /** Session end time */
  completedAt: z.string().datetime().optional(),
  
  /** Whether session was completed or abandoned */
  isCompleted: z.boolean().default(false)
})

export type ReviewSession = z.infer<typeof ReviewSessionSchema>

/**
 * Learning Statistics
 * Overall learning progress metrics
 */
export const LearningStatsSchema = z.object({
  /** User ID */
  userId: z.string(),
  
  /** Total flashcards created for user */
  totalCards: z.number().int().min(0).default(0),
  
  /** Cards currently being learned */
  learningCards: z.number().int().min(0).default(0),
  
  /** Cards that are graduated */
  graduatedCards: z.number().int().min(0).default(0),
  
  /** Cards due for review today */
  dueToday: z.number().int().min(0).default(0),
  
  /** Total reviews completed */
  totalReviews: z.number().int().min(0).default(0),
  
  /** Current streak of daily reviews */
  currentStreak: z.number().int().min(0).default(0),
  
  /** Longest review streak */
  longestStreak: z.number().int().min(0).default(0),
  
  /** Average daily reviews */
  averageDailyReviews: z.number().min(0).default(0),
  
  /** Overall retention rate (%) */
  retentionRate: z.number().min(0).max(100).default(0),
  
  /** Last review date */
  lastReviewDate: z.string().datetime().optional(),
  
  /** When stats were last calculated */
  lastCalculated: z.string().datetime()
})

export type LearningStats = z.infer<typeof LearningStatsSchema>

/**
 * Skill Decay Information
 * Tracks knowledge decay for different topics
 */
export const SkillDecaySchema = z.object({
  /** Topic/skill identifier */
  skillId: z.string(),
  
  /** User ID */
  userId: z.string(),
  
  /** Skill name */
  skillName: z.string(),
  
  /** Related mission IDs */
  missionIds: z.array(z.string()),
  
  /** Last time this skill was practiced */
  lastPracticed: z.string().datetime(),
  
  /** Days since last practice */
  daysSinceLastPractice: z.number().int().min(0),
  
  /** Estimated knowledge retention (0-100%) */
  retentionEstimate: z.number().min(0).max(100),
  
  /** Decay severity level */
  decayLevel: z.enum(["none", "mild", "moderate", "severe"]),
  
  /** Recommended action */
  recommendedAction: z.enum(["none", "review", "practice", "relearn"]),
  
  /** Number of cards related to this skill */
  relatedCards: z.number().int().min(0).default(0),
  
  /** Cards due for this skill */
  cardsDue: z.number().int().min(0).default(0)
})

export type SkillDecay = z.infer<typeof SkillDecaySchema>