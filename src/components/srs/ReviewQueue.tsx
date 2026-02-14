import { Button } from "@/components/ui/Button"
import type { DifficultyLevel, Flashcard, FlashcardProgress, QualityRating } from "@/lib/srs"
import { getDueCards } from "@/lib/srs"
import { AnimatePresence, motion } from "framer-motion"
import React, { useCallback, useEffect, useState } from "react"
import { FlashcardViewer } from "./FlashcardViewer"

interface ReviewQueueProps {
  /** Available flashcards */
  flashcards: Flashcard[]
  /** User's progress data */
  progress: FlashcardProgress[]
  /** Current card index in queue */
  currentIndex?: number
  /** Whether current card is flipped */
  isFlipped?: boolean
  /** Whether to show hint for current card */
  showHint?: boolean
  /** Number of cards reviewed in session */
  reviewedCount?: number
  /** Current streak count */
  streakCount?: number
  /** Whether to show filter controls */
  showFilters?: boolean
  /** Current difficulty filter */
  difficulty?: DifficultyLevel
  /** Session start time for timer */
  sessionStartTime?: Date
  /** Handler for card review */
  onReview: (cardId: string, quality: QualityRating) => void
  /** Handler for session completion */
  onComplete: () => void
  /** Handler for skipping card */
  onSkip: (cardId: string) => void
  /** Handler for filter changes */
  onFilterChange?: (difficulty?: DifficultyLevel) => void
  /** Handler for showing hint */
  onShowHint?: (cardId: string) => void
  /** Handler for flipping card */
  onFlip?: () => void
}

export type { ReviewQueueProps }

/**
 * Review queue component for spaced repetition sessions
 * Manages flashcard queue and review flow
 */
export function ReviewQueue({
  flashcards,
  progress,
  currentIndex = 0,
  isFlipped = false,
  showHint = false,
  reviewedCount = 0,
  streakCount = 0,
  showFilters = false,
  difficulty,
  sessionStartTime,
  onReview,
  onComplete,
  onSkip,
  onFilterChange,
  onShowHint,
  onFlip
}: ReviewQueueProps): React.ReactElement {
  const [sessionDuration, setSessionDuration] = useState(0)

  // Filter flashcards by difficulty if specified
  const filteredFlashcards = difficulty
    ? flashcards.filter(card => card.difficulty === difficulty)
    : flashcards

  const dueCards = getDueCards(progress, filteredFlashcards)
  const currentCard = filteredFlashcards[currentIndex]
  const isComplete = currentIndex >= filteredFlashcards.length
  const isEmpty = filteredFlashcards.length === 0

  // Session timer
  useEffect(() => {
    if (!sessionStartTime) return

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000)
      setSessionDuration(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [sessionStartTime])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!currentCard || !isFlipped) return

      const key = event.key
      const qualityMap: Record<string, QualityRating> = {
        "0": 0, // Again
        "2": 2, // Hard 
        "3": 3, // Good
        "5": 5  // Easy
      }

      if (key in qualityMap) {
        event.preventDefault()
        onReview(currentCard.id, qualityMap[key])
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [currentCard, isFlipped, onReview])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleRating = useCallback((cardId: string, quality: QualityRating) => {
    onReview(cardId, quality)
  }, [onReview])

  const handleShowHint = useCallback((cardId: string) => {
    onShowHint?.(cardId)
  }, [onShowHint])

  const handleSkip = useCallback(() => {
    if (currentCard) {
      onSkip(currentCard.id)
    }
  }, [currentCard, onSkip])

  const handleFlip = useCallback(() => {
    onFlip?.()
  }, [onFlip])

  // Empty state
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 text-center space-y-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-6xl"
        >
          🎉
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-xl font-heading text-anime-cyan">No Cards Due</h2>
          <p className="text-anime-accent">You're all caught up! Come back later.</p>
        </div>
        <Button variant="success" onClick={onComplete}>
          Continue Learning
        </Button>
      </div>
    )
  }

  // Completion state
  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 text-center space-y-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-6xl"
        >
          ✨
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-xl font-heading text-anime-cyan">Session Complete!</h2>
          <p className="text-anime-accent">
            Reviewed {reviewedCount} cards in {formatTime(sessionDuration)}
          </p>
          {streakCount > 0 && (
            <p className="text-anime-green">
              🔥 {streakCount} day streak!
            </p>
          )}
        </div>
        <Button variant="success" onClick={onComplete}>
          Finish Session
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-heading text-anime-cyan">Review Queue</h1>
          <p className="text-sm text-anime-accent">
            {filteredFlashcards.length} cards due for review
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Session Timer */}
          {sessionStartTime && (
            <div className="text-center">
              <div className="text-xs text-anime-cyan font-mono">TIME</div>
              <div className="text-sm font-mono text-anime-accent">
                {formatTime(sessionDuration)}
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="flex gap-4 text-center">
            <div>
              <div className="text-xs text-anime-cyan font-mono">REVIEWED</div>
              <div className="text-lg font-bold text-anime-accent">{reviewedCount}</div>
            </div>
            <div>
              <div className="text-xs text-anime-cyan font-mono">STREAK</div>
              <div className="text-lg font-bold text-anime-green">{streakCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-anime-cyan font-mono">
            {currentIndex + 1} of {filteredFlashcards.length}
          </span>
          <span className="text-anime-accent">
            {Math.round(((currentIndex) / filteredFlashcards.length) * 100)}% Complete
          </span>
        </div>
        <div 
          className="w-full bg-anime-800 rounded-full h-2 overflow-hidden"
          role="progressbar"
          aria-valuenow={currentIndex}
          aria-valuemax={filteredFlashcards.length}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-anime-cyan to-anime-accent"
            initial={{ width: 0 }}
            animate={{ width: `${(currentIndex / filteredFlashcards.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-2 p-4 bg-anime-800 rounded-lg">
          <span className="text-sm text-anime-cyan font-mono">FILTER:</span>
          <Button
            variant={!difficulty ? "primary" : "outline"}
            size="sm"
            onClick={() => onFilterChange?.()}
          >
            All Difficulties
          </Button>
          {["B", "A", "S"].map((level) => (
            <Button
              key={level}
              variant={difficulty === level ? "primary" : "outline"}
              size="sm"
              onClick={() => onFilterChange?.(level as DifficultyLevel)}
            >
              {level}
            </Button>
          ))}
        </div>
      )}

      {/* Current Flashcard */}
      <AnimatePresence mode="wait">
        {currentCard && (
          <motion.div
            key={currentCard.id}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <FlashcardViewer
              flashcard={currentCard}
              isFlipped={isFlipped}
              showHint={showHint}
              onRating={handleRating}
              onNext={handleFlip}
              onShowHint={handleShowHint}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue Controls */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={handleSkip}
          className="text-anime-yellow border-anime-yellow"
        >
          ⏭ Skip Card
        </Button>
      </div>

      {/* Keyboard Shortcuts Help */}
      {isFlipped && (
        <div className="text-center text-xs text-anime-accent space-y-1 font-mono">
          <div>KEYBOARD: 0=Again • 2=Hard • 3=Good • 5=Easy</div>
        </div>
      )}
    </div>
  )
}