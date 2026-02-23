/**
 * @file ChallengeFilters.tsx
 * @description Filter controls for the challenge library grid
 */

"use client"

import type { ChallengeCategory } from "@/lib/challenges/types"
import { ChallengeCategorySchema } from "@/lib/challenges/types"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"
import React from "react"

export type ChallengeFiltersProps = {
  /** Currently selected category (null = all) */
  selectedCategory: ChallengeCategory | null
  /** Currently selected difficulty (null = all) */
  selectedDifficulty: string | null
  /** Currently selected completion status (null = all) */
  selectedStatus: string | null
  /** Callback when category filter changes */
  onCategoryChange: (category: ChallengeCategory | null) => void
  /** Callback when difficulty filter changes */
  onDifficultyChange: (difficulty: string | null) => void
  /** Callback when status filter changes */
  onStatusChange: (status: string | null) => void
}

const CATEGORIES: ReadonlyArray<{ value: ChallengeCategory; label: string }> = [
  { value: "pyspark", label: "PySpark" },
  { value: "sql", label: "SQL" },
  { value: "delta-lake", label: "Delta Lake" },
  { value: "streaming", label: "Streaming" },
  { value: "mlflow", label: "MLflow" },
  { value: "unity-catalog", label: "Unity Catalog" },
  { value: "architecture", label: "Architecture" },
]

const DIFFICULTIES = [
  { value: "B", label: "B — Beginner" },
  { value: "A", label: "A — Intermediate" },
  { value: "S", label: "S — Advanced" },
] as const

const STATUSES = [
  { value: "not-started", label: "Not Started" },
  { value: "completed", label: "Completed" },
] as const

/**
 * ChallengeFilters renders category, difficulty, and status filter dropdowns.
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
    <div className="flex flex-wrap gap-4">
      {/* Category Dropdown */}
      <div className="relative w-full sm:w-auto">
        <label
          htmlFor="challenge-filter-category"
          className="mb-1.5 block text-xs uppercase tracking-wider text-anime-500"
        >
          Category
        </label>
        <div className="relative">
          <select
            id="challenge-filter-category"
            value={selectedCategory ?? ""}
            onChange={(e) => {
              const value = e.target.value
              if (!value) {
                onCategoryChange(null)
                return
              }

              const parsed = ChallengeCategorySchema.safeParse(value)
              if (parsed.success) {
                onCategoryChange(parsed.data)
              }
            }}
            className={cn(
              "w-full appearance-none rounded-sm px-4 py-2.5 pr-10 sm:w-48",
              "border border-anime-700 bg-anime-900",
              "cursor-pointer text-sm font-medium text-anime-100",
              "transition-colors focus:outline-none focus:border-anime-cyan focus:ring-1 focus:ring-anime-cyan/50",
              selectedCategory && "border-anime-cyan text-anime-cyan"
            )}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-anime-500 pointer-events-none" />
        </div>
      </div>

      {/* Difficulty Dropdown */}
      <div className="relative w-full sm:w-auto">
        <label
          htmlFor="challenge-filter-difficulty"
          className="mb-1.5 block text-xs uppercase tracking-wider text-anime-500"
        >
          Difficulty
        </label>
        <div className="relative">
          <select
            id="challenge-filter-difficulty"
            value={selectedDifficulty ?? ""}
            onChange={(e) => onDifficultyChange(e.target.value || null)}
            className={cn(
              "w-full appearance-none rounded-sm px-4 py-2.5 pr-10 sm:w-44",
              "border border-anime-700 bg-anime-900",
              "cursor-pointer text-sm font-medium text-anime-100",
              "transition-colors focus:outline-none focus:border-anime-cyan focus:ring-1 focus:ring-anime-cyan/50",
              selectedDifficulty === "S" && "border-anime-accent text-anime-accent",
              selectedDifficulty === "A" && "border-anime-purple text-anime-purple",
              selectedDifficulty === "B" && "border-anime-cyan text-anime-cyan"
            )}
          >
            <option value="">All Levels</option>
            {DIFFICULTIES.map((diff) => (
              <option key={diff.value} value={diff.value}>
                {diff.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-anime-500 pointer-events-none" />
        </div>
      </div>

      {/* Status Dropdown */}
      <div className="relative w-full sm:w-auto">
        <label
          htmlFor="challenge-filter-status"
          className="mb-1.5 block text-xs uppercase tracking-wider text-anime-500"
        >
          Status
        </label>
        <div className="relative">
          <select
            id="challenge-filter-status"
            value={selectedStatus ?? ""}
            onChange={(e) => onStatusChange(e.target.value || null)}
            className={cn(
              "w-full appearance-none rounded-sm px-4 py-2.5 pr-10 sm:w-40",
              "border border-anime-700 bg-anime-900",
              "cursor-pointer text-sm font-medium text-anime-100",
              "transition-colors focus:outline-none focus:border-anime-cyan focus:ring-1 focus:ring-anime-cyan/50",
              selectedStatus === "completed" && "border-anime-green text-anime-green",
              selectedStatus === "not-started" && "border-anime-yellow text-anime-yellow"
            )}
          >
            <option value="">All</option>
            {STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-anime-500 pointer-events-none" />
        </div>
      </div>
    </div>
  )
}
