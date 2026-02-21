/**
 * @file ChallengeGridClient.tsx
 * @description Client-side challenge grid with filtering and navigation
 */

"use client"

import type { Challenge, ChallengeCategory } from "@/lib/challenges/types"
import { loadSandbox } from "@/lib/sandbox"
import type { ChallengeResult } from "@/lib/sandbox/types"
import { useRouter } from "next/navigation"
import React, { useEffect, useMemo, useState } from "react"
import { ChallengeCard } from "./ChallengeCard"
import { ChallengeFilters } from "./ChallengeFilters"

export type ChallengeGridClientProps = {
  /** All available challenges (loaded server-side) */
  challenges: Challenge[]
  /** Initial category selection from route query params */
  initialCategory?: ChallengeCategory | null
}

/**
 * Client-side challenge grid with category/difficulty filtering and navigation.
 */
export function ChallengeGridClient({
  challenges,
  initialCategory = null,
}: ChallengeGridClientProps): React.ReactElement {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<ChallengeCategory | null>(initialCategory)
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [challengeResults, setChallengeResults] = useState<Record<string, ChallengeResult>>({})

  useEffect(() => {
    const sandbox = loadSandbox()
    if (sandbox) {
      const ids = new Set(
        Object.entries(sandbox.challengeResults)
          .filter(([, r]) => r.completed)
          .map(([id]) => id),
      )
      setCompletedIds(ids)
      setChallengeResults(sandbox.challengeResults)
    }
  }, [])

  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      if (selectedCategory && c.category !== selectedCategory) return false
      if (selectedDifficulty && c.difficulty !== selectedDifficulty) return false
      if (selectedStatus === "completed" && !completedIds.has(c.id)) return false
      if (selectedStatus === "not-started" && completedIds.has(c.id)) return false
      return true
    })
  }, [challenges, selectedCategory, selectedDifficulty, selectedStatus, completedIds])

  return (
    <div>
      {/* Filters */}
      <div className="mb-8">
        <ChallengeFilters
          selectedCategory={selectedCategory}
          selectedDifficulty={selectedDifficulty}
          selectedStatus={selectedStatus}
          onCategoryChange={setSelectedCategory}
          onDifficultyChange={setSelectedDifficulty}
          onStatusChange={setSelectedStatus}
        />
      </div>

      {/* Results Count */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-anime-500" role="status" aria-live="polite">
          {filteredChallenges.length} challenge{filteredChallenges.length !== 1 ? "s" : ""}
        </p>

        {(selectedCategory || selectedDifficulty || selectedStatus) && (
          <button
            onClick={() => {
              setSelectedCategory(initialCategory)
              setSelectedDifficulty(null)
              setSelectedStatus(null)
            }}
            className="text-xs font-medium text-anime-cyan hover:text-anime-cyan/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-anime-cyan/60"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Grid */}
      {filteredChallenges.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              completionCount={challengeResults[challenge.id]?.completionCount ?? 0}
              onClick={() => router.push(`/challenges/${challenge.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-40 h-40 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(0,255,255,0.2)]">
            <img
              src="/illustrations/empty-challenges.png"
              alt="No challenges match filters"
              className="w-full h-full object-contain opacity-80"
            />
          </div>
          <p className="text-anime-500 text-lg">
            No challenges match your filters.
          </p>
          <button
            onClick={() => {
              setSelectedCategory(initialCategory)
              setSelectedDifficulty(null)
              setSelectedStatus(null)
            }}
            className="mt-4 rounded border border-anime-700 bg-anime-800 px-4 py-2 text-sm text-anime-cyan transition-colors hover:bg-anime-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-anime-cyan/60"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  )
}
