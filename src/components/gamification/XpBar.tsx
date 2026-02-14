import { getNextRank, getRankForXp, getRankProgress, getXpToNextRank } from "@/lib/gamification"
import { cn } from "@/lib/utils"

/**
 * XpBar Props
 */
export interface XpBarProps {
  /** Current total XP of the user */
  currentXp: number
  /** Whether to show animated progress */
  showAnimation?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * XpBar Component
 * 
 * Displays current XP progress towards the next rank with animated progress bar.
 * Shows current rank, next rank, XP values, and progress percentage.
 */
export function XpBar({ 
  currentXp, 
  showAnimation = false, 
  className 
}: XpBarProps): React.ReactElement {
  const currentRank = getRankForXp(currentXp)
  const nextRank = getNextRank(currentRank)
  const progress = getRankProgress(currentXp)
  const xpToNext = getXpToNextRank(currentXp)
  
  const isMaxRank = !nextRank
  const nextRankXp = nextRank?.minXp ?? currentXp

  return (
    <div 
      data-testid="xp-bar"
      className={cn(
        "relative overflow-hidden rounded-lg bg-anime-900 border border-anime-700 p-4",
        "shadow-neon-cyan",
        className
      )}
    >
      {/* Current Rank & XP Display */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-anime-cyan">
            {currentRank.title}
          </span>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <span className="font-mono text-white">{currentXp}</span>
          <span className="text-anime-700">/</span>
          <span className="font-mono text-anime-cyan">
            {isMaxRank ? "MAX" : nextRankXp}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div 
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="w-full h-2 bg-anime-800 rounded-full overflow-hidden"
        >
          <div
            data-testid="progress-fill"
            className={cn(
              "h-full bg-gradient-to-r from-anime-cyan to-anime-accent",
              "transition-all duration-500 ease-out",
              showAnimation && "animate-progress"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Next Rank & XP Info */}
      <div className="flex items-center justify-between mt-2 text-xs">
        {isMaxRank ? (
          <span className="text-anime-yellow font-medium">
            Maximum rank achieved
          </span>
        ) : (
          <>
            <span className="text-anime-purple">
              {nextRank?.title}
            </span>
            <span className="text-anime-700">
              {xpToNext} XP to next rank
            </span>
          </>
        )}
      </div>
    </div>
  )
}