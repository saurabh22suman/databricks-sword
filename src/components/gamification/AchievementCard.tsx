import { getAchievementIconPath } from "@/lib/gamification/achievementIcons"
import type { Achievement } from "@/lib/gamification/types"
import { cn } from "@/lib/utils"

/**
 * AchievementCard Props
 */
export interface AchievementCardProps {
  /** The achievement to display */
  achievement: Achievement
  /** Whether the achievement is unlocked */
  isUnlocked: boolean
  /** Optional unlock timestamp */
  unlockedAt?: string
  /** Progress towards unlocking (0-100) */
  progress?: number
  /** Click handler */
  onClick?: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * AchievementCard Component
 * 
 * Displays an achievement card with unlock status, progress, and styling.
 * Shows different visual states for locked vs unlocked achievements.
 */
export function AchievementCard({ 
  achievement,
  isUnlocked,
  unlockedAt,
  progress,
  onClick,
  className 
}: AchievementCardProps): React.ReactElement {
  
  // Format unlock date
  const formatUnlockDate = (timestamp: string): string => {
    return new Date(timestamp).toLocaleDateString()
  }

  // Get condition hint for locked achievements
  const getConditionHint = (condition: Achievement["condition"]): string => {
    switch (condition.type) {
      case "mission-complete":
        return `Complete ${condition.count || 1} mission${condition.count && condition.count > 1 ? 's' : ''}`
      case "quiz-perfect":
        return `Get perfect score ${condition.count || 1} time${condition.count && condition.count > 1 ? 's' : ''}`
      case "streak":
        return `Maintain ${condition.days}-day streak`
      case "rank-reached":
        return `Reach ${condition.rankId} rank`
      case "side-quest-complete":
        return `Complete ${condition.count} side quest${condition.count > 1 ? 's' : ''}`
      case "challenge-complete":
        return `Complete ${condition.count} challenge${condition.count > 1 ? 's' : ''}`
      default:
        return "Meet the requirements"
    }
  }

  return (
    <div 
      data-testid="achievement-card"
      className={cn(
        "relative overflow-hidden rounded-lg bg-anime-900 border p-4",
        "transition-all duration-300",
        isUnlocked 
          ? "border-anime-yellow shadow-neon-yellow/30"
          : "border-anime-700 grayscale opacity-60",
        onClick && "cursor-pointer hover:scale-105 hover:shadow-lg",
        className
      )}
      onClick={onClick}
    >
      {/* Locked Overlay */}
      {!isUnlocked && (
        <div className="absolute inset-0 bg-anime-950/60 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div data-testid="lock-icon" className="text-3xl mb-2">🔒</div>
            <div className="text-anime-700 font-bold uppercase text-xs tracking-wide">
              LOCKED
            </div>
          </div>
        </div>
      )}

      {/* Achievement Content */}
      <div className="flex items-start gap-3">
        {/* Achievement Icon */}
        <div 
          data-testid="achievement-icon"
          className={cn(
            "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
            isUnlocked 
              ? "bg-anime-yellow/20"
              : "bg-anime-700/20"
          )}
        >
          <img
            src={getAchievementIconPath(achievement.icon)}
            alt={achievement.title}
            className={cn(
              "w-8 h-8 object-contain",
              !isUnlocked && "opacity-50"
            )}
          />
        </div>

        {/* Achievement Details */}
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-bold text-sm mb-1 truncate",
            isUnlocked ? "text-anime-cyan" : "text-anime-700"
          )}>
            {achievement.title}
          </h3>
          
          <p className={cn(
            "text-xs mb-2 leading-relaxed",
            isUnlocked ? "text-anime-purple" : "text-anime-700"
          )}>
            {achievement.description}
          </p>

          {/* Progress Bar for Locked Achievements */}
          {!isUnlocked && progress !== undefined && (
            <div className="mb-2">
              <div 
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="w-full h-1 bg-anime-800 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-anime-yellow transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs text-anime-700 mt-1">
                {progress}% complete
              </div>
            </div>
          )}

          {/* Condition Hint for Locked Achievements */}
          {!isUnlocked && (
            <div data-testid="condition-hint" className="text-xs text-anime-700 mb-2 italic">
              {getConditionHint(achievement.condition)}
            </div>
          )}

          {/* XP Bonus and Unlock Date */}
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-xs font-mono font-bold",
              isUnlocked ? "text-anime-yellow" : "text-anime-700"
            )}>
              {achievement.xpBonus} XP
            </span>

            {isUnlocked && unlockedAt && (
              <span className="text-xs text-anime-purple">
                Unlocked {formatUnlockDate(unlockedAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}