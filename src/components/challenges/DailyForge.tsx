/**
 * @file DailyForge.tsx
 * @description Daily challenge component with streak integration
 */

"use client"

import type { Challenge, ValidationResult } from "@/lib/challenges"
import React from "react"
import { ChallengePlayer } from "./ChallengePlayer"

export type DailyForgeProps = {
  /** Today's challenge */
  challenge: Challenge
  /** Current streak count */
  streakCount: number
  /** Whether today's challenge has been completed */
  completedToday: boolean
  /** Callback on challenge completion */
  onComplete?: (result: ValidationResult) => void
}

/**
 * DailyForge renders the daily challenge with streak info.
 */
export function DailyForge({
  challenge,
  streakCount,
  completedToday,
  onComplete,
}: DailyForgeProps): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* Streak Header */}
      <div className="cut-corner border border-anime-accent bg-anime-900 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold text-anime-accent mb-1">
              Daily Forge
            </h2>
            <p className="text-anime-400 text-sm">
              Complete today&apos;s challenge to maintain your streak
            </p>
          </div>
          <div className="text-center">
            <div className="font-heading text-3xl font-bold text-anime-yellow">
              {streakCount}
            </div>
            <div className="text-xs text-anime-500 uppercase tracking-wider">
              Day Streak
            </div>
          </div>
        </div>
      </div>

      {/* Challenge or Completed State */}
      {completedToday ? (
        <div className="cut-corner border border-anime-green bg-anime-green/10 p-8 text-center">
          <div className="text-4xl mb-4">🔥</div>
          <h3 className="font-heading text-xl font-bold text-anime-green mb-2">
            Forge Complete!
          </h3>
          <p className="text-anime-400">
            You&apos;ve completed today&apos;s daily challenge. Come back tomorrow!
          </p>
        </div>
      ) : (
        <ChallengePlayer challenge={challenge} onComplete={onComplete} />
      )}
    </div>
  )
}
