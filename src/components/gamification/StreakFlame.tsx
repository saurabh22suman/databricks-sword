import type { AnimationName } from "@/components/ui/LottieAnimation"
import { LottieAnimation } from "@/components/ui/LottieAnimation"
import { getStreakMultiplier } from "@/lib/gamification"
import { cn } from "@/lib/utils"

interface StreakFlameProps {
  streakDays: number
  className?: string
}

/**
 * Returns the Lottie flame animation name based on streak length.
 */
function getFlameAnimation(days: number): AnimationName {
  if (days >= 15) return "flame-high"
  if (days >= 7) return "flame-medium"
  return "flame-low"
}

export function StreakFlame({ streakDays, className }: StreakFlameProps): React.ReactElement {
  // Get XP multiplier
  const xpMultiplier = getStreakMultiplier(streakDays)
  
  // Determine milestone message
  const getMilestoneMessage = (days: number): string | null => {
    if (days >= 100) return "Century Club!"
    if (days >= 30) return "Month Master!"
    if (days >= 7) return "Week Warrior!"
    return null
  }

  const milestoneMessage = getMilestoneMessage(streakDays)

  // Format streak text
  const streakText = `${streakDays} day${streakDays === 1 ? '' : 's'} streak`

  return (
    <div 
      className={cn("flex flex-col items-center gap-2", className)}
      data-testid="streak-flame"
    >
      {/* Lottie Flame Animation */}
      {streakDays > 0 && (
        <div data-testid="flame-container">
          <LottieAnimation
            name={getFlameAnimation(streakDays)}
            loop
            width={streakDays >= 15 ? 64 : streakDays >= 7 ? 48 : 36}
            height={streakDays >= 15 ? 64 : streakDays >= 7 ? 48 : 36}
          />
        </div>
      )}

      {/* Streak Count */}
      <div className="text-sm font-mono text-anime-cyan">
        {streakText}
      </div>

      {/* XP Multiplier */}
      {streakDays > 0 && (
        <div className="text-xs font-bold text-anime-yellow bg-anime-900 px-2 py-1 rounded">
          {xpMultiplier}x XP
        </div>
      )}

      {/* Milestone Message */}
      {milestoneMessage && (
        <div className="text-sm font-bold text-anime-accent animate-pulse">
          {milestoneMessage}
        </div>
      )}
    </div>
  )
}