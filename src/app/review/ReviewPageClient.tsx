"use client"

import { ReviewQueue } from "@/components/srs/ReviewQueue"
import { SkillDecayIndicator } from "@/components/srs/SkillDecayIndicator"
import { Button } from "@/components/ui/Button"
import { GenericCard } from "@/components/ui/GenericCard"
import { loadSandbox, updateSandbox } from "@/lib/sandbox"
import type { Flashcard, FlashcardProgress, QualityRating, SkillDecay } from "@/lib/srs"
import {
    calculateSkillDecay,
    getDueCards,
    processReview,
    sandboxToSrsProgress,
    srsToSandboxProgress,
} from "@/lib/srs"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import React, { useCallback, useEffect, useMemo, useState } from "react"

type ReviewPageView = "overview" | "queue" | "decay"

type ReviewPageClientProps = {
  /** Flashcards loaded server-side from mission concepts */
  initialFlashcards: Flashcard[]
}

/**
 * Client-side review page.
 * Receives pre-loaded flashcards from the server component and manages
 * review state with sandbox persistence.
 */
export default function ReviewPageClient({
  initialFlashcards,
}: ReviewPageClientProps): React.ReactElement {
  const [currentView, setCurrentView] = useState<ReviewPageView>("overview")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [sessionStartTime] = useState(new Date())
  const [streakCount, setStreakCount] = useState(0)
  const [progress, setProgress] = useState<FlashcardProgress[]>([])
  const [flashcards] = useState<Flashcard[]>(initialFlashcards)
  const [skillDecay, setSkillDecay] = useState<SkillDecay[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load sandbox data on mount — convert sandbox progress to SRS format
  useEffect(() => {
    const sandbox = loadSandbox()
    if (sandbox) {
      setStreakCount(sandbox.streakData.currentStreak)

      // Convert sandbox flashcard progress to SRS FlashcardProgress
      const srsProgress: FlashcardProgress[] = []
      for (const [cardId, sandboxProg] of Object.entries(sandbox.flashcardProgress)) {
        srsProgress.push(sandboxToSrsProgress(cardId, "local", sandboxProg))
      }
      setProgress(srsProgress)

      // Derive skill decay from missions
      const missionInfoMap = new Map<string, { id: string; title: string; tags: string[]; cardIds: string[] }>()
      for (const card of initialFlashcards) {
        const existing = missionInfoMap.get(card.missionId)
        if (existing) {
          existing.cardIds.push(card.id)
          for (const tag of card.tags) {
            if (!existing.tags.includes(tag)) existing.tags.push(tag)
          }
        } else {
          missionInfoMap.set(card.missionId, {
            id: card.missionId,
            title: card.missionId.replace(/-/g, " "),
            tags: [...card.tags],
            cardIds: [card.id],
          })
        }
      }
      const decay = calculateSkillDecay(srsProgress, Array.from(missionInfoMap.values()))
      setSkillDecay(decay)
    }
    setIsLoaded(true)
  }, [initialFlashcards])

  const dueCardsResults = useMemo(
    () => getDueCards(progress, flashcards),
    [progress, flashcards],
  )
  const dueCards = useMemo(
    () => dueCardsResults.map(result => result.flashcard),
    [dueCardsResults],
  )

  const handleReview = useCallback((cardId: string, quality: QualityRating) => {
    const cardProgress = progress.find(p => p.cardId === cardId)
    if (!cardProgress) return

    // Process the review using SM-2 algorithm
    const reviewResult = processReview(cardProgress, quality)

    // Update in-memory progress
    const updatedProgress = progress.map(p =>
      p.cardId === cardId ? reviewResult.updatedProgress : p
    )
    setProgress(updatedProgress)

    // Persist back to sandbox
    const sandboxProg = srsToSandboxProgress(reviewResult.updatedProgress)
    updateSandbox((data) => ({
      ...data,
      flashcardProgress: {
        ...data.flashcardProgress,
        [cardId]: sandboxProg,
      },
    }))

    // Move to next card
    setReviewedCount(prev => prev + 1)
    setCurrentIndex(prev => prev + 1)
    setIsFlipped(false)
    setShowHint(false)
  }, [progress])

  const handleSkip = useCallback((_cardId: string) => {
    setCurrentIndex(prev => prev + 1)
    setIsFlipped(false)
    setShowHint(false)
  }, [])

  const handleFlip = useCallback(() => {
    setIsFlipped(true)
  }, [])

  const handleShowHint = useCallback((_cardId: string) => {
    setShowHint(true)
  }, [])

  const handleComplete = useCallback(() => {
    setCurrentView("overview")
    setCurrentIndex(0)
    setReviewedCount(0)
    setIsFlipped(false)
    setShowHint(false)
  }, [])

  const handleReviewSkill = useCallback((skillId: string) => {
    const skillCards = dueCards.filter(card =>
      skillDecay.find(skill => skill.skillId === skillId)?.missionIds.includes(card.missionId)
    )
    if (skillCards.length > 0) {
      setCurrentView("queue")
    }
  }, [dueCards, skillDecay])

  const handleViewDetails = useCallback((_skillId: string) => {
    // TODO: Navigate to skill detail view
  }, [])

  const handleRefresh = useCallback(() => {
    // TODO: Re-fetch sandbox data and recalculate due cards
  }, [])

  // Show loading state until sandbox is loaded
  if (!isLoaded) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center text-anime-accent">Loading review data...</div>
      </main>
    )
  }

  // Empty state when no flashcards exist
  if (flashcards.length === 0) {
    return (
      <main className="container mx-auto px-4 py-8 text-center space-y-4">
        <h1 className="text-4xl font-heading text-anime-cyan">Memory Forge</h1>
        <p className="text-anime-accent text-lg">
          Complete missions with concepts to unlock flashcards for spaced repetition review.
        </p>
      </main>
    )
  }

  if (currentView === "queue") {
    return (
      <main className="container mx-auto px-4 py-8">
        <ReviewQueue
          flashcards={dueCards}
          progress={progress}
          currentIndex={currentIndex}
          isFlipped={isFlipped}
          showHint={showHint}
          reviewedCount={reviewedCount}
          streakCount={streakCount}
          sessionStartTime={sessionStartTime}
          onReview={handleReview}
          onComplete={handleComplete}
          onSkip={handleSkip}
          onFlip={handleFlip}
          onShowHint={handleShowHint}
        />
      </main>
    )
  }

  if (currentView === "decay") {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setCurrentView("overview")}
          >
            ← Back to Overview
          </Button>
        </div>
        <SkillDecayIndicator
          skillDecayData={skillDecay}
          showFilters={true}
          onReviewSkill={handleReviewSkill}
          onViewDetails={handleViewDetails}
          onRefresh={handleRefresh}
        />
      </main>
    )
  }

  const masteredPercentage = progress.length > 0
    ? Math.round((progress.filter(p => p.isGraduated).length / progress.length) * 100)
    : 0

  // Overview
  return (
    <main className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <h1 className="text-4xl font-heading text-anime-cyan">
          Memory Forge
        </h1>
        <p className="text-anime-accent text-lg">
          Spaced repetition mastery system for long-term knowledge retention
        </p>
      </motion.div>

      {/* Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <GenericCard className="text-center p-6 cut-corner bg-anime-900 border-anime-cyan">
          <div className="text-3xl font-bold text-anime-cyan">{dueCards.length}</div>
          <div className="text-sm text-anime-accent">Cards Due</div>
        </GenericCard>

        <GenericCard className="text-center p-6 cut-corner bg-anime-900 border-anime-green">
          <div className="text-3xl font-bold text-anime-green">{streakCount}</div>
          <div className="text-sm text-anime-accent">Day Streak</div>
        </GenericCard>

        <GenericCard className="text-center p-6 cut-corner bg-anime-900 border-anime-yellow">
          <div className="text-3xl font-bold text-anime-yellow">{flashcards.length}</div>
          <div className="text-sm text-anime-accent">Total Cards</div>
        </GenericCard>

        <GenericCard className="text-center p-6 cut-corner bg-anime-900 border-anime-purple">
          <div className="text-3xl font-bold text-anime-purple">{masteredPercentage}%</div>
          <div className="text-sm text-anime-accent">Mastered</div>
        </GenericCard>
      </motion.div>

      {/* Main Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <GenericCard className="p-6 cut-corner bg-anime-900 border-anime-cyan hover:shadow-neon-cyan transition-all duration-300 group">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🎯</div>
              <div>
                <h3 className="text-xl font-heading text-anime-cyan">Review Session</h3>
                <p className="text-anime-accent">Practice due flashcards with spaced repetition</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-anime-700">
              <span className="text-sm text-anime-accent">
                {dueCards.length} cards waiting
              </span>
              <Button
                variant="primary"
                onClick={() => setCurrentView("queue")}
                disabled={dueCards.length === 0}
                className="group-hover:shadow-neon-cyan"
              >
                Start Review →
              </Button>
            </div>
          </div>
        </GenericCard>

        <GenericCard className="p-6 cut-corner bg-anime-900 border-anime-yellow hover:shadow-neon-yellow transition-all duration-300 group">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="text-4xl">📊</div>
              <div>
                <h3 className="text-xl font-heading text-anime-yellow">Skill Decay</h3>
                <p className="text-anime-accent">Monitor knowledge retention across topics</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-anime-700">
              <span className="text-sm text-anime-accent">
                {skillDecay.filter(s => s.decayLevel !== "none").length} skills need attention
              </span>
              <Button
                variant="secondary"
                onClick={() => setCurrentView("decay")}
                className="group-hover:shadow-neon-yellow"
              >
                View Analysis →
              </Button>
            </div>
          </div>
        </GenericCard>
      </motion.div>

      {/* Recent Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h2 className="text-2xl font-heading text-anime-cyan mb-4">Recent Progress</h2>
        <div className="grid gap-3">
          {progress.length === 0 ? (
            <GenericCard className="p-4 bg-anime-800 border-anime-700 text-center">
              <p className="text-anime-accent">No review history yet. Start a review session to begin tracking progress.</p>
            </GenericCard>
          ) : (
            progress.slice(0, 3).map((item) => {
              const card = flashcards.find(c => c.id === item.cardId)
              if (!card) return null

              return (
                <GenericCard key={item.cardId} className="p-4 bg-anime-800 border-anime-700">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium text-anime-cyan truncate">
                        {card.question.slice(0, 60)}...
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-anime-accent">
                        <span>Reviews: {item.totalReviews}</span>
                        <span>•</span>
                        <span>Avg Quality: {item.averageQuality?.toFixed(1)}</span>
                        <span>•</span>
                        <span>EF: {item.easinessFactor.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      item.isGraduated ? "bg-anime-green/20 text-anime-green" : "bg-anime-yellow/20 text-anime-yellow"
                    )}>
                      {item.isGraduated ? "Mastered" : "Learning"}
                    </div>
                  </div>
                </GenericCard>
              )
            })
          )}
        </div>
      </motion.div>
    </main>
  )
}
