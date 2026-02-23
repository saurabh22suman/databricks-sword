/**
 * @file ChallengeCard.tsx
 * @description Card component for displaying a challenge in the library grid
 */

import type { Challenge } from "@/lib/challenges"
import { CATEGORY_ICON_MAP } from "@/lib/challenges/categoryIcons"
import type { ChallengeCategory } from "@/lib/challenges/types"
import { MAX_CHALLENGE_XP_COMPLETIONS } from "@/lib/sandbox/types"
import { cn } from "@/lib/utils"
import React from "react"

const CATEGORY_LABELS: Record<ChallengeCategory, string> = {
  pyspark: "PySpark",
  sql: "SQL",
  "delta-lake": "Delta Lake",
  streaming: "Streaming",
  mlflow: "MLflow",
  "unity-catalog": "Unity Catalog",
  architecture: "Architecture",
}

export type ChallengeCardProps = {
  /** Challenge data to display */
  challenge: Challenge
  /** Click handler for navigation */
  onClick?: () => void
  /** Number of times this challenge has been completed (for XP cap display) */
  completionCount?: number
}

/** Maps difficulty rank to color classes */
const DIFFICULTY_COLORS: Record<string, string> = {
  B: "bg-anime-cyan/20 text-anime-cyan border-anime-cyan",
  A: "bg-anime-purple/20 text-anime-purple border-anime-purple",
  S: "bg-anime-accent/20 text-anime-accent border-anime-accent",
}

/** Maps format to display label */
const FORMAT_LABELS: Record<string, string> = {
  "drag-drop": "drag-drop",
  "fill-blank": "fill-blank",
  "free-text": "free-text",
}

/**
 * ChallengeCard displays a challenge summary with category, difficulty, format, and XP.
 */
export function ChallengeCard({
  challenge,
  onClick,
  completionCount = 0,
}: ChallengeCardProps): React.ReactElement {
  const xpMaxed = completionCount >= MAX_CHALLENGE_XP_COMPLETIONS
  return (
    <article
      role="article"
      onClick={onClick}
      className={cn(
        "cut-corner border border-anime-700 bg-anime-900 p-6",
        "transition-all duration-200 hover:border-anime-cyan hover:shadow-neon-cyan",
        onClick && "cursor-pointer"
      )}
    >
      {/* Header: difficulty badge + category */}
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-anime-500">
          <img
            src={CATEGORY_ICON_MAP[challenge.category as ChallengeCategory]}
            alt=""
            className="w-4 h-4 opacity-70"
          />
          {CATEGORY_LABELS[challenge.category as ChallengeCategory] ?? challenge.category}
        </span>
        <span
          className={cn(
            "px-3 py-1 text-sm font-heading font-bold border rounded",
            DIFFICULTY_COLORS[challenge.difficulty] ?? "text-anime-400"
          )}
        >
          {challenge.difficulty}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-heading text-lg font-bold text-anime-100 mb-2">
        {challenge.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-anime-400 mb-4 line-clamp-2">
        {challenge.description}
      </p>

      {/* Footer: format + XP */}
      <div className="flex items-center justify-between text-xs">
        <span className="px-2 py-1 rounded bg-anime-800 text-anime-500 uppercase tracking-wider">
          {FORMAT_LABELS[challenge.format] ?? challenge.format}
        </span>
        {xpMaxed ? (
          <span className="text-anime-yellow font-medium flex items-center gap-1">
            <span>⚡</span> XP Maxed
          </span>
        ) : (
          <span className="text-anime-cyan font-medium">
            {challenge.xpReward} XP
          </span>
        )}
      </div>

      {/* Completion indicator */}
      {completionCount > 0 && (
        <div className="mt-3 pt-3 border-t border-anime-800 flex items-center justify-between text-xs">
          <span className="text-anime-green flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-anime-green/20 flex items-center justify-center text-[10px]">✓</span>
            Completed
          </span>
          {!xpMaxed && (
            <span className="text-anime-500">Practice anytime</span>
          )}
        </div>
      )}
    </article>
  )
}
