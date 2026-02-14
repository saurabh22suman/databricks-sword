import { DEFAULT_EASINESS_FACTOR, getDaysUntilReview, isCardDue } from "./algorithm"
import type {
    Flashcard,
    FlashcardProgress,
    LearningStats,
    ReviewSession,
    SkillDecay
} from "./types"

/**
 * SRS Scheduler
 * 
 * High-level functions for managing spaced repetition scheduling,
 * review sessions, and learning analytics.
 */

/**
 * Options for filtering due cards
 */
export interface GetDueCardsOptions {
  maxCards?: number
  difficulty?: 'B' | 'A' | 'S'
  tag?: string
}

/**
 * Result for a due card
 */
export interface DueCardResult {
  flashcard: Flashcard
  progress: FlashcardProgress
  isOverdue: boolean
  urgencyScore: number
}

/**
 * Get all flashcards due for review
 * 
 * @param allProgress - Array of all flashcard progress records
 * @param allFlashcards - Array of all flashcard definitions
 * @param currentDate - Current date (defaults to now)
 * @param options - Filtering options
 * @returns Array of due card results
 */
export function getDueCards(
  allProgress: FlashcardProgress[], 
  allFlashcards: Flashcard[],
  currentDate: Date = new Date(),
  options: GetDueCardsOptions = {}
): DueCardResult[] {
  const dueProgress = allProgress.filter(progress => isCardDue(progress, currentDate))
  
  let results: DueCardResult[] = []
  
  for (const progress of dueProgress) {
    const flashcard = allFlashcards.find(f => f.id === progress.cardId)
    if (!flashcard) continue
    
    // Apply filters
    if (options.difficulty && flashcard.difficulty !== options.difficulty) continue
    if (options.tag && !flashcard.tags.includes(options.tag)) continue
    
    const daysOverdue = Math.max(0, -getDaysUntilReview(progress, currentDate))
    const isOverdue = daysOverdue > 0
    const urgencyScore = getReviewPriority(progress, currentDate)
    
    results.push({
      flashcard,
      progress,
      isOverdue,
      urgencyScore
    })
  }
  
  // Sort by priority (overdue first, then by urgency score)
  results.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) {
      return a.isOverdue ? -1 : 1
    }
    return b.urgencyScore - a.urgencyScore
  })
  
  // Apply max cards limit
  if (options.maxCards) {
    results = results.slice(0, options.maxCards)
  }
  
  return results
}

/**
 * Get cards due for review today
 * 
 * @param allProgress - Array of all flashcard progress records
 * @param targetDate - Target date (defaults to today)
 * @returns Array of card IDs due on target date
 */
export function getCardsForDate(
  allProgress: FlashcardProgress[],
  targetDate: Date = new Date()
): string[] {
  const startOfDay = new Date(targetDate)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(targetDate)
  endOfDay.setHours(23, 59, 59, 999)
  
  return allProgress
    .filter(progress => {
      const dueDate = new Date(progress.nextReview)
      return dueDate >= startOfDay && dueDate <= endOfDay
    })
    .map(progress => progress.cardId)
}

/**
 * Get learning statistics for a user
 * 
 * @param userProgress - All flashcard progress for a user
 * @param currentDate - Current date (defaults to now)
 * @returns Learning statistics
 */
export function calculateLearningStats(
  userProgress: FlashcardProgress[],
  currentDate: Date = new Date()
): LearningStats {
  const totalCards = userProgress.length
  
  if (totalCards === 0) {
    return {
      userId: userProgress[0]?.userId || '',
      totalCards: 0,
      learningCards: 0,
      graduatedCards: 0,
      dueToday: 0,
      totalReviews: 0,
      currentStreak: 0,
      longestStreak: 0,
      averageDailyReviews: 0,
      retentionRate: 0,
      lastCalculated: currentDate.toISOString()
    }
  }
  
  const userId = userProgress[0].userId
  
  // Count card states
  const graduatedCards = userProgress.filter(p => p.isGraduated).length
  const learningCards = totalCards - graduatedCards
  
  // Count due cards (those that are due for review today)
  const dueToday = userProgress.filter(p => isCardDue(p, currentDate)).length
  
  // Total reviews
  const totalReviews = userProgress.reduce((sum, p) => sum + p.totalReviews, 0)
  
  // Calculate retention rate based on average quality
  const progressWithQuality = userProgress.filter(p => p.averageQuality !== undefined)
  let retentionRate = 0
  
  if (progressWithQuality.length > 0) {
    const avgQuality = progressWithQuality.reduce((sum, p) => sum + (p.averageQuality || 0), 0) / progressWithQuality.length
    retentionRate = Math.round((avgQuality / 5) * 100)
  }
  
  // Find last review date
  const lastReviewDates = userProgress
    .map(p => p.lastReview)
    .filter(Boolean)
    .map(date => new Date(date!))
  
  const lastReviewDate = lastReviewDates.length > 0 
    ? new Date(Math.max(...lastReviewDates.map(d => d.getTime()))).toISOString()
    : undefined
  
  // Calculate streaks (simplified - would need review history for accurate calculation)
  const recentlyReviewed = userProgress.filter(p => {
    if (!p.lastReview) return false
    const reviewDate = new Date(p.lastReview)
    const daysDiff = Math.floor((currentDate.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24))
    return daysDiff <= 1
  })
  
  const currentStreak = recentlyReviewed.length > 0 ? 1 : 0 // Simplified
  const longestStreak = currentStreak // Simplified
  
  // Average daily reviews (simplified)
  const averageDailyReviews = totalReviews > 0 ? Math.round(totalReviews / 30) : 0 // Last 30 days estimate
  
  return {
    userId,
    totalCards,
    learningCards,
    graduatedCards,
    dueToday,
    totalReviews,
    currentStreak,
    longestStreak,
    averageDailyReviews,
    retentionRate,
    lastReviewDate,
    lastCalculated: currentDate.toISOString()
  }
}

/**
 * Mission/skill information for decay calculation
 */
interface MissionInfo {
  id: string
  title: string
  tags: string[]
  cardIds: string[]
}

/**
 * Get skill decay information for a user
 * 
 * @param userProgress - All flashcard progress for a user
 * @param missions - Mission information with card mappings
 * @param currentDate - Current date (defaults to now)
 * @returns Array of skill decay information
 */
export function calculateSkillDecay(
  userProgress: FlashcardProgress[],
  missions: MissionInfo[],
  currentDate: Date = new Date()
): SkillDecay[] {
  const skillDecayData: SkillDecay[] = []
  
  // Process each mission as a skill
  for (const mission of missions) {
    // Find progress for cards in this mission
    const missionProgress = userProgress.filter(p => mission.cardIds.includes(p.cardId))
    
    if (missionProgress.length === 0) continue // Skip missions with no practice
    
    // Find most recent practice
    const lastPracticeDates = missionProgress
      .map(p => p.lastReview)
      .filter(Boolean)
      .map(date => new Date(date!))
    
    if (lastPracticeDates.length === 0) continue
    
    const lastPracticed = new Date(Math.max(...lastPracticeDates.map(d => d.getTime())))
    const daysSinceLastPractice = Math.floor(
      (currentDate.getTime() - lastPracticed.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    // Calculate retention estimate
    const retentionEstimate = calculateRetentionEstimate({ 
      ...missionProgress[0], // Use first progress for structure
      lastReview: lastPracticed.toISOString(),
      averageQuality: missionProgress.reduce((sum, p) => sum + (p.averageQuality || 0), 0) / missionProgress.length
    }, currentDate)
    
    // Determine decay level based on retention estimate
    let decayLevel: SkillDecay['decayLevel']
    let recommendedAction: SkillDecay['recommendedAction']
    
    if (retentionEstimate >= 80) {
      decayLevel = "none"
      recommendedAction = "none"
    } else if (retentionEstimate >= 60) {
      decayLevel = "mild" 
      recommendedAction = "review"
    } else if (retentionEstimate >= 40) {
      decayLevel = "moderate"
      recommendedAction = "practice"
    } else {
      decayLevel = "severe"
      recommendedAction = "relearn"
    }
    
    // Count due cards for this skill
    const cardsDue = missionProgress.filter(p => isCardDue(p, currentDate)).length
    
    skillDecayData.push({
      skillId: mission.id,
      userId: missionProgress[0].userId,
      skillName: mission.title,
      missionIds: [mission.id],
      lastPracticed: lastPracticed.toISOString(),
      daysSinceLastPractice,
      retentionEstimate,
      decayLevel,
      recommendedAction,
      relatedCards: missionProgress.length,
      cardsDue
    })
  }
  
  // Sort by urgency (most severe first, then by days since practice)
  return skillDecayData.sort((a, b) => {
    const severityOrder: Record<SkillDecay['decayLevel'], number> = { 
      "severe": 0, 
      "moderate": 1, 
      "mild": 2, 
      "none": 3 
    }
    
    if (a.decayLevel !== b.decayLevel) {
      return severityOrder[a.decayLevel] - severityOrder[b.decayLevel]
    }
    
    return b.daysSinceLastPractice - a.daysSinceLastPractice
  })
}

/**
 * Get optimal daily review count
 * 
 * @param userProgress - All flashcard progress for a user
 * @param targetTimeMinutes - Target daily study time in minutes (default: 20)
 * @param avgTimePerCard - Average time per card in seconds (default: 30)
 * @returns Recommended number of reviews per day
 */
export function getOptimalDailyReviews(
  userProgress: FlashcardProgress[],
  targetTimeMinutes: number = 20,
  avgTimePerCard: number = 30
): number {
  const targetTimeSeconds = targetTimeMinutes * 60
  const maxReviews = Math.floor(targetTimeSeconds / avgTimePerCard)
  
  // Get current due count
  const currentDue = userProgress.filter(progress => isCardDue(progress)).length
  
  // Return minimum of max capacity and current due cards
  return Math.min(maxReviews, currentDue)
}

/**
 * Create a new review session
 * 
 * @param userId - User ID
 * @param cardIds - Cards to include in session
 * @param startDate - Session start date (defaults to now)
 * @returns New review session
 */
export function createReviewSession(
  userId: string,
  cardIds: string[],
  startDate: Date = new Date()
): ReviewSession {
  return {
    id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    cardIds,
    cardsReviewed: 0,
    cardsCorrect: 0,
    averageQuality: 0,
    totalTimeSeconds: 0,
    startedAt: startDate.toISOString(),
    isCompleted: false
  }
}

/**
 * Update review session with completed review
 * 
 * @param session - Current session
 * @param quality - Quality rating for the review
 * @param timeSpent - Time spent on this review in seconds
 * @returns Updated session
 */
export function updateReviewSession(
  session: ReviewSession,
  quality: number,
  timeSpent: number = 0
): ReviewSession {
  const cardsReviewed = session.cardsReviewed + 1
  const cardsCorrect = session.cardsCorrect + (quality >= 3 ? 1 : 0)
  const totalTimeSeconds = session.totalTimeSeconds + timeSpent
  
  // Calculate new average quality
  const currentTotal = session.averageQuality * session.cardsReviewed
  const newTotal = currentTotal + quality
  const averageQuality = newTotal / cardsReviewed
  
  return {
    ...session,
    cardsReviewed,
    cardsCorrect,
    averageQuality,
    totalTimeSeconds
  }
}

/**
 * Complete a review session
 * 
 * @param session - Current session
 * @param completedDate - Completion date (defaults to now)
 * @returns Completed session
 */
export function completeReviewSession(
  session: ReviewSession,
  completedDate: Date = new Date()
): ReviewSession {
  return {
    ...session,
    completedAt: completedDate.toISOString(),
    isCompleted: true
  }
}

/**
 * Generate flashcards from mission content
 * 
 * @param missionId - Mission ID to generate cards for
 * @param missionContent - Mission content/concepts
 * @returns Array of generated flashcards
 */
export function generateFlashcardsFromMission(
  missionId: string,
  missionContent: {
    title: string
    concepts: Array<{
      question: string
      answer: string
      hint?: string
      codeExample?: string
      tags?: string[]
      difficulty?: 'B' | 'A' | 'S'
      type?: 'concept' | 'code' | 'comparison' | 'procedure'
    }>
  }
): Flashcard[] {
  const now = new Date().toISOString()
  
  return missionContent.concepts.map((concept, index) => ({
    id: `${missionId}_card_${index + 1}`,
    missionId,
    question: concept.question,
    answer: concept.answer,
    codeExample: concept.codeExample,
    hint: concept.hint,
    difficulty: concept.difficulty || 'B',
    type: concept.type || 'concept',
    tags: concept.tags || [missionId],
    createdAt: now,
    updatedAt: now
  }))
}

/**
 * Get optimal batch size for review session
 * 
 * @param totalDue - Total number of due cards
 * @param options - Options for calculating batch size
 * @returns Optimal batch size
 */
export function getOptimalBatchSize(
  totalDue: number,
  options: {
    difficulty?: 'B' | 'A' | 'S'
    timeMinutes?: number
  } = {}
): number {
  if (totalDue === 0) return 0
  
  const { difficulty = 'B', timeMinutes = 20 } = options
  
  // Base time per card in seconds
  const baseTimePerCard = 30
  
  // Adjust time based on difficulty
  const difficultyMultiplier = difficulty === 'S' ? 1.5 : difficulty === 'A' ? 1.2 : 1.0
  const adjustedTimePerCard = baseTimePerCard * difficultyMultiplier
  
  // Calculate max cards based on time available
  const maxCardsByTime = Math.floor((timeMinutes * 60) / adjustedTimePerCard)
  
  // Use rule of thumb for batch sizes
  let optimalBatch: number
  if (totalDue <= 5) {
    optimalBatch = totalDue
  } else if (totalDue <= 15) {
    optimalBatch = Math.min(10, totalDue)
  } else if (totalDue <= 50) {
    optimalBatch = Math.min(20, totalDue)
  } else {
    optimalBatch = Math.min(25, totalDue)
  }
  
  // Don't exceed time constraints
  return Math.min(optimalBatch, maxCardsByTime, totalDue)
}

/**
 * Calculate review priority for a card
 * 
 * @param progress - Flashcard progress
 * @param currentDate - Current date
 * @returns Priority score (higher = more urgent)
 */
export function getReviewPriority(
  progress: FlashcardProgress,
  currentDate: Date = new Date()
): number {
  let priority = 0
  
  // Higher priority for overdue cards (heavily weighted)
  const daysOverdue = Math.max(0, -getDaysUntilReview(progress, currentDate))
  priority += daysOverdue * 100
  
  // Higher priority for cards with more lapses (forgotten more often)
  priority += progress.lapseCount * 5
  
  // Higher priority for cards with lower easiness factor (harder cards)
  priority += (DEFAULT_EASINESS_FACTOR - progress.easinessFactor) * 10
  
  // Slightly higher priority for newer cards (not graduated)
  if (!progress.isGraduated) {
    priority += 2
  }
  
  return priority
}

/**
 * Calculate retention estimate for a card
 * 
 * @param progress - Flashcard progress
 * @param currentDate - Current date
 * @returns Retention estimate as percentage (0-100)
 */
export function calculateRetentionEstimate(
  progress: FlashcardProgress,
  currentDate: Date = new Date()
): number {
  // Base retention on average quality if available
  let baseRetention = 50 // Default for cards with no history
  
  if (progress.averageQuality !== undefined && progress.totalReviews > 0) {
    // Convert average quality (0-5) to percentage
    baseRetention = (progress.averageQuality / 5) * 100
  }
  
  // Decay based on time since last review
  if (progress.lastReview) {
    const daysSinceReview = Math.floor(
      (currentDate.getTime() - new Date(progress.lastReview).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    // Forgetting curve: retention decreases over time
    // Using exponential decay with easiness factor influencing rate
    const decayRate = 0.05 / progress.easinessFactor // Easier cards decay slower
    const decayFactor = Math.exp(-decayRate * daysSinceReview)
    baseRetention = baseRetention * decayFactor
  }
  
  // Adjust for card difficulty (easier cards retained better)
  const stabilityBonus = (progress.easinessFactor - 1.3) / (2.5 - 1.3) * 10 // 0-10 bonus
  baseRetention += stabilityBonus
  
  // Bonus for graduated cards
  if (progress.isGraduated) {
    baseRetention += 5
  }
  
  return Math.max(0, Math.min(100, Math.round(baseRetention)))
}

/**
 * Format review session summary
 * 
 * @param session - Review session
 * @returns Formatted summary string
 */
export function formatSessionSummary(session: ReviewSession): string {
  const { cardsReviewed, cardIds, cardsCorrect, isCompleted, totalTimeSeconds } = session
  
  const accuracy = cardsReviewed > 0 ? Math.round((cardsCorrect / cardsReviewed) * 100) : 0
  const timeStr = formatDuration(totalTimeSeconds)
  
  if (isCompleted) {
    return `Completed ${cardsReviewed} cards, ${cardsCorrect} correct (${accuracy}%) in ${timeStr}`
  } else {
    return `In Progress: ${cardsReviewed} of ${cardIds.length} cards reviewed`
  }
}

/**
 * Format duration in seconds to readable string
 * 
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "1:23:45" or "2:30")
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
}