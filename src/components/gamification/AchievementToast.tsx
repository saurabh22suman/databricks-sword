"use client";

import { LottieAnimation } from "@/components/ui/LottieAnimation";
import { getAchievementIconPath } from "@/lib/gamification/achievementIcons";
import type { Achievement } from "@/lib/gamification/types";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

/**
 * AchievementToast Props
 */
export interface AchievementToastProps {
  /** The achievement to display */
  achievement: Achievement
  /** Whether to show slide-in animation */
  showAnimation?: boolean
  /** Callback when dismissed */
  onDismiss?: () => void
  /** Auto dismiss after specified milliseconds */
  autoDismiss?: number
  /** Additional CSS classes */
  className?: string
}

/**
 * AchievementToast Component
 * 
 * Displays a floating toast notification for achievement unlocks.
 * Features slide-in animation and auto-dismiss functionality.
 */
export function AchievementToast({ 
  achievement,
  showAnimation = false,
  onDismiss,
  autoDismiss,
  className 
}: AchievementToastProps): React.ReactElement {
  // Auto-dismiss functionality
  useEffect(() => {
    if (autoDismiss && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss()
      }, autoDismiss)

      return () => clearTimeout(timer)
    }
  }, [autoDismiss, onDismiss])

  return (
    <div 
      data-testid="achievement-toast"
      data-achievement-id={achievement.id}
      className={cn(
        "fixed top-4 right-4 z-40 max-w-sm",
        "bg-anime-900/95 border border-anime-yellow backdrop-blur-sm",
        "rounded-lg p-4 shadow-neon-yellow",
        showAnimation && "animate-slide-in",
        className
      )}
    >
      {/* Close Button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 text-anime-700 hover:text-anime-yellow transition-colors text-lg"
          aria-label="Close achievement notification"
        >
          ×
        </button>
      )}

      {/* Achievement Unlocked Header */}
      <div className="text-xs font-bold text-anime-yellow uppercase tracking-wide mb-2">
        Achievement Unlocked!
      </div>

      {/* Achievement Content */}
      <div className="flex items-start gap-3">
        {/* Achievement Animation + Icon */}
        <div
          data-testid="achievement-icon"
          className="relative flex-shrink-0 w-10 h-10 flex items-center justify-center"
        >
          {showAnimation && (
            <div className="absolute -inset-2">
              <LottieAnimation name="achievement-unlock" width={56} height={56} />
            </div>
          )}
          <img
            src={getAchievementIconPath(achievement.icon)}
            alt={achievement.title}
            className="relative z-10 w-7 h-7 object-contain"
          />
        </div>

        {/* Achievement Details */}
        <div className="flex-1">
          <h3 className="font-bold text-anime-cyan text-sm mb-1">
            {achievement.title}
          </h3>
          
          <p className="text-xs text-anime-purple mb-2 leading-relaxed">
            {achievement.description}
          </p>

          {/* XP Bonus */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-anime-yellow font-mono font-bold">
              +{achievement.xpBonus} XP
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}