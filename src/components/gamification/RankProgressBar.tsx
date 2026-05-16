"use client"

import { RANKS, getNextRank, getRankForXp } from "@/lib/gamification/ranks"
import { cn } from "@/lib/utils"
import { TrendingUp } from "lucide-react"

interface RankProgressBarProps {
  xp: number
  className?: string
}

export function RankProgressBar({ xp, className }: RankProgressBarProps): React.ReactElement {
  const currentRank = getRankForXp(xp)
  const currentIndex = RANKS.findIndex((r) => r.id === currentRank.id)
  const isAtMax = currentIndex === RANKS.length - 1

  // If we're at the last rank, show max status
  if (isAtMax) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-anime-cyan" />
          <span className="text-xs text-anime-300 font-medium">
            {currentRank.title} — Max Rank Achieved
          </span>
        </div>
      </div>
    )
  }

  const nextRank = getNextRank(currentRank)
  if (!nextRank) return <></>

  const xpInCurrentRank = xp - currentRank.minXp
  const xpNeededForRank = nextRank.minXp - currentRank.minXp
  const progressPercent = Math.round((xpInCurrentRank / xpNeededForRank) * 100)
  const xpRemaining = nextRank.minXp - xp

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-anime-300 font-medium">
            {currentRank.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-anime-400">
            {xpRemaining.toLocaleString()} XP to {nextRank.title}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-anime-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-anime-accent to-anime-cyan rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs font-mono text-anime-400 w-10 text-right">
          {progressPercent}%
        </span>
      </div>
    </div>
  )
}