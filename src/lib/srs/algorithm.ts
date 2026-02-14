import type { FlashcardProgress, QualityRating, ReviewResult } from "./types"

/**
 * SM-2 Algorithm Implementation
 * 
 * The classic spaced repetition algorithm by Piotr Wozniak.
 * Calculates optimal review intervals based on user performance.
 * 
 * @see https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

/**
 * Default easiness factor for new cards
 */
export const DEFAULT_EASINESS_FACTOR = 2.5

/**
 * Minimum easiness factor
 */
export const MIN_EASINESS_FACTOR = 1.3

/**
 * Maximum easiness factor
 */
export const MAX_EASINESS_FACTOR = 2.5

/**
 * Initial intervals for new cards (first few repetitions)
 */
export const INITIAL_INTERVALS = [1, 6] // Day 1, then Day 6

/**
 * Quality threshold for graduation (cards become "learned")
 */
export const GRADUATION_QUALITY_THRESHOLD = 3

/**
 * Number of consecutive good reviews needed for graduation
 */
export const GRADUATION_REPETITIONS = 2

/**
 * Maximum interval in days (about 5 years)
 */
export const MAX_INTERVAL_DAYS = 1825

/**
 * Calculate new easiness factor based on quality rating
 * 
 * @param currentEF - Current easiness factor (1.3-2.5)
 * @param quality - Quality rating (0-5)
 * @returns New easiness factor
 * 
 * SM-2 formula:
 * EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
 */
export function calculateEasinessFactor(currentEF: number, quality: QualityRating): number {
  // Use the standard SM-2 formula
  const newEF = currentEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  return Math.max(MIN_EASINESS_FACTOR, Math.min(MAX_EASINESS_FACTOR, newEF))
}

/**
 * Calculate next review interval based on SM-2 algorithm
 * 
 * @param repetitions - Number of consecutive correct reviews
 * @param easinessFactor - Current easiness factor
 * @param quality - Quality rating from current review
 * @param previousInterval - Previous interval in days (needed for repetitions >= 2)
 * @returns Next interval in days
 */
export function calculateInterval(
  repetitions: number, 
  easinessFactor: number, 
  quality: QualityRating,
  previousInterval: number = 0
): number {
  // If quality < 3, card is forgotten - restart from beginning
  if (quality < 3) {
    return 1
  }
  
  // Use predefined intervals for first few repetitions
  if (repetitions === 0) {
    return INITIAL_INTERVALS[0] // 1 day
  }
  
  if (repetitions === 1) {
    return INITIAL_INTERVALS[1] // 6 days
  }
  
  // For subsequent repetitions, use SM-2: interval[n] = interval[n-1] * EF
  // If previousInterval is 0 or undefined, fall back to base calculation
  let newInterval: number
  if (previousInterval > 0) {
    // Standard SM-2: new_interval = previous_interval * easiness_factor
    newInterval = Math.round(previousInterval * easinessFactor)
  } else {
    // Fallback: assume repetition 2 starts with 6 * EF
    const baseInterval = INITIAL_INTERVALS[1] // 6 days
    const power = repetitions - 1
    newInterval = Math.round(baseInterval * Math.pow(easinessFactor, power))
  }

  // Ensure we don't exceed maximum interval
  return Math.min(newInterval, MAX_INTERVAL_DAYS)
}

/**
 * Calculate next review date
 * 
 * @param currentDate - Current date
 * @param intervalDays - Interval in days
 * @returns ISO string of next review date
 */
export function calculateNextReviewDate(currentDate: Date, intervalDays: number): string {
  const nextDate = new Date(currentDate)
  nextDate.setDate(nextDate.getDate() + intervalDays)
  // nextDate.setHours(0, 0, 0, 0) // Reset to start of day
  return nextDate.toISOString()
}

/**
 * Process a review using SM-2 algorithm
 * 
 * @param progress - Current flashcard progress
 * @param quality - Quality rating from user review (0-5)
 * @param reviewDate - Date of review (defaults to now)
 * @returns Updated progress and review result
 */
export function processReview(
  progress: FlashcardProgress,
  quality: QualityRating,
  reviewDate: Date = new Date()
): { 
  updatedProgress: FlashcardProgress
  reviewResult: Omit<ReviewResult, 'cardId' | 'userId' | 'responseTime' | 'usedHint'>
} {
  const previousEF = progress.easinessFactor
  const previousInterval = progress.interval
  
  // Calculate new easiness factor
  const newEF = calculateEasinessFactor(previousEF, quality)
  
  // Calculate new repetitions
  const newRepetitions = quality >= 3 ? progress.repetitions + 1 : 0
  
  // Calculate new interval
  const newInterval = calculateInterval(newRepetitions, newEF, quality, previousInterval)
  
  // Calculate next review date
  const nextReview = calculateNextReviewDate(reviewDate, newInterval)
  
  // Check if card should be graduated
  const shouldGraduate = quality >= GRADUATION_QUALITY_THRESHOLD && 
                        newRepetitions >= GRADUATION_REPETITIONS && 
                        !progress.isGraduated
  
  // Reset graduation if card was forgotten (quality < 3)
  const isStillGraduated = quality >= 3 ? (shouldGraduate || progress.isGraduated) : false
  
  // Update lapse count if card was forgotten
  const newLapseCount = quality < 3 ? progress.lapseCount + 1 : progress.lapseCount
  
  // Calculate new average quality
  const totalReviews = progress.totalReviews + 1
  const currentAverage = progress.averageQuality || quality
  const newAverageQuality = ((currentAverage * progress.totalReviews) + quality) / totalReviews
  
  // Create updated progress
  const updatedProgress: FlashcardProgress = {
    ...progress,
    easinessFactor: newEF,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReview,
    lastReview: reviewDate.toISOString(),
    lastQuality: quality,
    totalReviews,
    lapseCount: newLapseCount,
    averageQuality: newAverageQuality,
    isGraduated: isStillGraduated,
    updatedAt: reviewDate.toISOString()
  }
  
  // Create review result
  const reviewResult = {
    quality,
    reviewedAt: reviewDate.toISOString(),
    previousInterval,
    newInterval,
    previousEasinessFactor: previousEF,
    newEasinessFactor: newEF
  }
  
  return { updatedProgress, reviewResult }
}

/**
 * Create initial progress for a new flashcard
 * 
 * @param cardId - ID of the flashcard
 * @param userId - ID of the user
 * @param createdDate - Creation date (defaults to now)
 * @returns Initial flashcard progress
 */
export function createInitialProgress(
  cardId: string,
  userId: string,
  createdDate: Date = new Date()
): FlashcardProgress {
  const createdISO = createdDate.toISOString()
  
  return {
    cardId,
    userId,
    easinessFactor: DEFAULT_EASINESS_FACTOR,
    interval: 0,
    repetitions: 0,
    nextReview: createdISO, // Due immediately
    totalReviews: 0,
    lapseCount: 0,
    isGraduated: false,
    createdAt: createdISO,
    updatedAt: createdISO
  }
}

/**
 * Check if a card is due for review
 * 
 * @param progress - Flashcard progress
 * @param currentDate - Current date (defaults to now)
 * @returns True if card is due for review
 */
export function isCardDue(progress: FlashcardProgress, currentDate: Date = new Date()): boolean {
  const dueDate = new Date(progress.nextReview)
  return dueDate <= currentDate
}

/**
 * Get days until next review
 * 
 * @param progress - Flashcard progress
 * @param currentDate - Current date (defaults to now)
 * @returns Days until review (negative if overdue)
 */
export function getDaysUntilReview(progress: FlashcardProgress, currentDate: Date = new Date()): number {
  const dueDate = new Date(progress.nextReview)
  const diffMs = dueDate.getTime() - currentDate.getTime()
  return diffMs / (1000 * 60 * 60 * 24)
}

/**
 * Calculate retention rate for a card based on review history
 * 
 * @param progress - Flashcard progress
 * @returns Retention rate as percentage (0-100)
 */
export function calculateRetentionRate(progress: FlashcardProgress): number {
  if (progress.totalReviews === 0) return 0
  
  const correctReviews = progress.totalReviews - progress.lapseCount
  return Math.round((correctReviews / progress.totalReviews) * 100)
}

/**
 * Estimate knowledge strength based on progress
 * 
 * @param progress - Flashcard progress
 * @returns Strength score (0-100)
 */
export function calculateKnowledgeStrength(progress: FlashcardProgress): number {
  if (progress.totalReviews === 0) return 0
  
  const retentionRate = calculateRetentionRate(progress)
  const intervalBonus = Math.min(progress.interval / 30, 1) * 20 // Up to 20 bonus for long intervals
  const repetitionBonus = Math.min(progress.repetitions / 5, 1) * 10 // Up to 10 bonus for repetitions
  
  const strength = retentionRate * 0.7 + intervalBonus + repetitionBonus
  return Math.min(Math.round(strength), 100)
}

/**
 * Get quality description for a rating
 * 
 * @param quality - Quality rating (0-5)
 * @returns Human-readable description
 */
export function getQualityDescription(quality: QualityRating): string {
  switch (quality) {
    case 0: return "Total blackout"
    case 1: return "Incorrect response"
    case 2: return "Incorrect response, but correct on hint"
    case 3: return "Correct response with serious difficulty"
    case 4: return "Correct response after hesitation"
    case 5: return "Perfect response"
    default: return "Unknown"
  }
}

/**
 * Format next review date for display
 * 
 * @param progress - Flashcard progress
 * @returns Formatted date string
 */
export function formatNextReview(progress: FlashcardProgress): string {
  const date = new Date(progress.nextReview)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}