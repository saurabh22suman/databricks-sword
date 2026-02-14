import type { Achievement } from "@/lib/gamification/types"
import { cn } from "@/lib/utils"
import { AchievementCard } from "./AchievementCard"

/**
 * AchievementGrid Props
 */
export interface AchievementGridProps {
  /** Array of achievements to display */
  achievements: Achievement[]
  /** IDs of unlocked achievements */
  unlockedAchievements: string[]
  /** Progress data for locked achievements (0-100) */
  achievementProgress?: Record<string, number>
  /** Filter to apply to achievements */
  filter?: "all" | "unlocked" | "locked"
  /** Show achievement count summary */
  showSummary?: boolean
  /** Click handler for individual achievements */
  onAchievementClick?: (achievement: Achievement) => void
  /** Additional CSS classes */
  className?: string
}

/**
 * AchievementGrid Component
 * 
 * Displays a responsive grid of achievement cards with filtering and progress.
 * Supports locked/unlocked states and optional progress tracking.
 */
export function AchievementGrid({ 
  achievements,
  unlockedAchievements,
  achievementProgress,
  filter = "all",
  showSummary = false,
  onAchievementClick,
  className 
}: AchievementGridProps): React.ReactElement {

  // Filter achievements based on unlock status
  const filteredAchievements = achievements.filter(achievement => {
    const isUnlocked = unlockedAchievements.includes(achievement.id)
    
    switch (filter) {
      case "unlocked":
        return isUnlocked
      case "locked":
        return !isUnlocked
      case "all":
      default:
        return true
    }
  })

  // Empty state
  if (achievements.length === 0) {
    return (
      <div 
        data-testid="achievement-grid"
        className={cn("text-center py-12", className)}
      >
        <div className="text-6xl mb-4 opacity-50">🏆</div>
        <h3 className="text-lg font-bold text-anime-cyan mb-2">
          No achievements found
        </h3>
        <p className="text-anime-purple text-sm">
          Complete missions and challenges to unlock achievements
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Summary */}
      {showSummary && (
        <div className="text-center py-4">
          <div className="text-lg font-bold text-anime-cyan">
            {unlockedAchievements.length}/{achievements.length} unlocked
          </div>
        </div>
      )}

      {/* Achievement Grid */}
      <div 
        data-testid="achievement-grid"
        className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}
      >
        {filteredAchievements.map((achievement) => {
          const isUnlocked = unlockedAchievements.includes(achievement.id)
          const progress = achievementProgress?.[achievement.id]

          return (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              isUnlocked={isUnlocked}
              progress={progress}
              onClick={onAchievementClick ? () => onAchievementClick(achievement) : undefined}
            />
          )
        })}
      </div>

      {/* No Results State (after filtering) */}
      {filteredAchievements.length === 0 && achievements.length > 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3 opacity-50">🔍</div>
          <h3 className="text-lg font-bold text-anime-cyan mb-2">
            No achievements match your filter
          </h3>
          <p className="text-anime-purple text-sm">
            Try adjusting your filter settings
          </p>
        </div>
      )}
    </div>
  )
}