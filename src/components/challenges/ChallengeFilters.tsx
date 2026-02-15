/**
 * @file ChallengeFilters.tsx
 * @description Filter controls for the challenge library grid
 */

"use client"

import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"
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
  { value: "pyspark", label: "PySpark" },
  { value: "sql", label: "SQL" },
  { value: "delta-lake", label: "Delta Lake" },
  { value: "streaming", label: "Streaming" },
  { value: "mlflow", label: "MLflow" },
  { value: "unity-catalog", label: "Unity Catalog" },
  { value: "architecture", label: "Architecture" },
] as const

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
      <div className="relative">
        <label className="block text-xs text-anime-500 uppercase tracking-wider mb-1.5">
          Category
        </label>
        <div className="relative">
          <select
            value={selectedCategory ?? ""}
            onChange={(e) => onCategoryChange(e.target.value || null)}
            className={cn(
              "appearance-none w-48 px-4 py-2.5 pr-10 rounded-sm",
              "bg-anime-900 border border-anime-700",
              "text-anime-100 text-sm font-medium",
              "focus:outline-none focus:border-anime-cyan focus:ring-1 focus:ring-anime-cyan/50",
              "transition-colors cursor-pointer",
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
      <div className="relative">
        <label className="block text-xs text-anime-500 uppercase tracking-wider mb-1.5">
          Difficulty
        </label>
        <div className="relative">
          <select
            value={selectedDifficulty ?? ""}
            onChange={(e) => onDifficultyChange(e.target.value || null)}
            className={cn(
              "appearance-none w-44 px-4 py-2.5 pr-10 rounded-sm",
              "bg-anime-900 border border-anime-700",
              "text-anime-100 text-sm font-medium",
              "focus:outline-none focus:border-anime-cyan focus:ring-1 focus:ring-anime-cyan/50",
              "transition-colors cursor-pointer",
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
      <div className="relative">
        <label className="block text-xs text-anime-500 uppercase tracking-wider mb-1.5">
          Status
        </label>
        <div className="relative">
          <select
            value={selectedStatus ?? ""}
            onChange={(e) => onStatusChange(e.target.value || null)}
            className={cn(
              "appearance-none w-40 px-4 py-2.5 pr-10 rounded-sm",
              "bg-anime-900 border border-anime-700",
              "text-anime-100 text-sm font-medium",
              "focus:outline-none focus:border-anime-cyan focus:ring-1 focus:ring-anime-cyan/50",
              "transition-colors cursor-pointer",
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
