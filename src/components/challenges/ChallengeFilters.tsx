/**
 * @file ChallengeFilters.tsx
 * @description Filter controls for the challenge library grid
 */

"use client"

import { CATEGORY_ICON_MAP } from "@/lib/challenges/categoryIcons"
import type { ChallengeCategory } from "@/lib/challenges/types"
import { cn } from "@/lib/utils"
import React from "react"

export type ChallengeFiltersProps = {
  /** Currently selected category (null = all) */
  selectedCategory: string | null
  /** Currently selected difficulty (null = all) */
  selectedDifficulty: string | null
  /** Currently selected completion status (null = all) */
  selectedStatus: string | null
  /** Callback when category filter changes */
  onCategoryChange: (category: string | null) => void
  /** Callback when difficulty filter changes */
  onDifficultyChange: (difficulty: string | null) => void
  /** Callback when status filter changes */
  onStatusChange: (status: string | null) => void
}

const CATEGORIES = [
  "pyspark",
  "sql",
  "delta-lake",
  "streaming",
  "mlflow",
  "unity-catalog",
  "architecture",
] as const

const DIFFICULTIES = ["B", "A", "S"] as const

const STATUSES = [
  { value: "not-started", label: "Not Started" },
  { value: "completed", label: "Completed" },
] as const

/**
 * ChallengeFilters renders category and difficulty filter buttons.
 */
export function ChallengeFilters({
  selectedCategory,
  selectedDifficulty,
  selectedStatus,
  onCategoryChange,
  onDifficultyChange,
  onStatusChange,
}: ChallengeFiltersProps): React.ReactElement {
  return (
    <div className="space-y-4">
      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onCategoryChange(null)}
          className={cn(
            "px-3 py-1.5 rounded text-sm font-medium transition-colors",
            selectedCategory === null
              ? "bg-anime-cyan/20 text-anime-cyan border border-anime-cyan"
              : "bg-anime-800 text-anime-500 border border-anime-700 hover:text-anime-300"
          )}
        >
          All
        </button>
        {CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={cn(
              "px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5",
              selectedCategory === category
                ? "bg-anime-cyan/20 text-anime-cyan border border-anime-cyan"
                : "bg-anime-800 text-anime-500 border border-anime-700 hover:text-anime-300"
            )}
          >
            <img
              src={CATEGORY_ICON_MAP[category as ChallengeCategory]}
              alt=""
              className="w-4 h-4 opacity-70"
            />
            {category}
          </button>
        ))}
      </div>

      {/* Difficulty Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => onDifficultyChange(null)}
          className={cn(
            "px-3 py-1.5 rounded text-sm font-heading font-bold transition-colors",
            selectedDifficulty === null
              ? "bg-anime-cyan/20 text-anime-cyan border border-anime-cyan"
              : "bg-anime-800 text-anime-500 border border-anime-700 hover:text-anime-300"
          )}
        >
          All
        </button>
        {DIFFICULTIES.map((diff) => (
          <button
            key={diff}
            onClick={() => onDifficultyChange(diff)}
            className={cn(
              "px-3 py-1.5 rounded text-sm font-heading font-bold transition-colors",
              selectedDifficulty === diff
                ? diff === "S"
                  ? "bg-anime-accent/20 text-anime-accent border border-anime-accent"
                  : diff === "A"
                    ? "bg-anime-purple/20 text-anime-purple border border-anime-purple"
                    : "bg-anime-cyan/20 text-anime-cyan border border-anime-cyan"
                : "bg-anime-800 text-anime-500 border border-anime-700 hover:text-anime-300"
            )}
          >
            {diff}
          </button>
        ))}
      </div>

      {/* Status Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => onStatusChange(null)}
          className={cn(
            "px-3 py-1.5 rounded text-sm font-medium transition-colors",
            selectedStatus === null
              ? "bg-anime-cyan/20 text-anime-cyan border border-anime-cyan"
              : "bg-anime-800 text-anime-500 border border-anime-700 hover:text-anime-300"
          )}
        >
          All
        </button>
        {STATUSES.map((status) => (
          <button
            key={status.value}
            onClick={() => onStatusChange(status.value)}
            className={cn(
              "px-3 py-1.5 rounded text-sm font-medium transition-colors",
              selectedStatus === status.value
                ? status.value === "completed"
                  ? "bg-anime-green/20 text-anime-green border border-anime-green"
                  : "bg-anime-yellow/20 text-anime-yellow border border-anime-yellow"
                : "bg-anime-800 text-anime-500 border border-anime-700 hover:text-anime-300"
            )}
          >
            {status.label}
          </button>
        ))}
      </div>
    </div>
  )
}
