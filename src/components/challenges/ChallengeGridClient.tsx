/**
 * @file ChallengeGridClient.tsx
 * @description Client-side challenge grid with filtering and navigation
 */

"use client"

import type { Challenge } from "@/lib/challenges"
import { loadSandbox } from "@/lib/sandbox"
import { useRouter } from "next/navigation"
import React, { useEffect, useMemo, useState } from "react"
import { ChallengeCard } from "./ChallengeCard"
import { ChallengeFilters } from "./ChallengeFilters"

export type ChallengeGridClientProps = {
  /** All available challenges (loaded server-side) */
  challenges: Challenge[]
}

/**
 * Client-side challenge grid with category/difficulty filtering and navigation.
 */
export function ChallengeGridClient({
  challenges,
}: ChallengeGridClientProps): React.ReactElement {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const sandbox = loadSandbox()
    if (sandbox) {
      const ids = new Set(
        Object.entries(sandbox.challengeResults)
          .filter(([, r]) => r.completed)
          .map(([id]) => id),
      )
      setCompletedIds(ids)
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
      <div className="mb-4 text-sm text-anime-500">
        {filteredChallenges.length} challenge{filteredChallenges.length !== 1 ? "s" : ""}
      </div>

      {/* Grid */}
      {filteredChallenges.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
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
              setSelectedCategory(null)
              setSelectedDifficulty(null)
              setSelectedStatus(null)
            }}
            className="mt-4 px-4 py-2 rounded text-sm bg-anime-800 text-anime-cyan border border-anime-700 hover:bg-anime-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  )
}
