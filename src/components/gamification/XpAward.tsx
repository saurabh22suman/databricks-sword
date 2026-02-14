"use client";

import { LottieAnimation } from "@/components/ui/LottieAnimation";
import type { XpEvent } from "@/lib/gamification/types";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

/**
 * XpAward Props
 */
export interface XpAwardProps {
  /** The XP event to display */
  xpEvent: XpEvent
  /** Whether to show particle animation */
  showAnimation?: boolean
  /** Callback when dismissed */
  onDismiss?: () => void
  /** Auto dismiss after specified milliseconds */
  autoDismiss?: number
  /** Additional CSS classes */
  className?: string
}

/**
 * XpAward Component
 * 
 * Displays an animated XP award notification with neon particle effects.
 * Shows XP amount, source, multiplier, and supports manual/auto dismissal.
 */
export function XpAward({ 
  xpEvent,
  showAnimation = false,
  onDismiss,
  autoDismiss,
  className 
}: XpAwardProps): React.ReactElement {
  // Auto-dismiss functionality
  useEffect(() => {
    if (autoDismiss && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss()
      }, autoDismiss)

      return () => clearTimeout(timer)
    }
  }, [autoDismiss, onDismiss])

  // Get label based on event type
  const getEventLabel = (type: XpEvent["type"]): string => {
    switch (type) {
      case "mission":
        return "Mission Complete"
      case "challenge":
        return "Challenge Complete"
      case "achievement":
        return "Achievement Unlocked"
      case "streak":
        return "Streak Bonus"
      case "quiz-bonus":
        return "Perfect Score"
      case "stage":
        return "Stage Complete"
      default:
        return "XP Earned"
    }
  }

  // Determine text size based on XP amount
  const xpTextSize = xpEvent.amount >= 200 ? "text-2xl" : "text-lg"
  
  // Show multiplier if greater than 1
  const showMultiplier = xpEvent.multiplier > 1

  return (
    <div 
      data-testid="xp-award"
      className={cn(
        "relative overflow-hidden rounded-lg bg-anime-900/95 border border-anime-cyan",
        "backdrop-blur-sm shadow-neon-cyan p-4",
        "flex flex-col items-center justify-center gap-2",
        showAnimation && "animate-particle-burst",
        className
      )}
    >
      {/* Close Button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 text-anime-700 hover:text-anime-cyan transition-colors"
          aria-label="Close XP award notification"
        >
          ×
        </button>
      )}

      {/* Event Type Label */}
      <div className="text-xs font-medium text-anime-purple uppercase tracking-wide">
        {getEventLabel(xpEvent.type)}
      </div>

      {/* XP Amount */}
      <div className={cn(
        "font-mono font-bold text-anime-accent",
        xpTextSize
      )}>
        +{xpEvent.amount} XP
      </div>

      {/* Multiplier (if applicable) */}
      {showMultiplier && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-anime-yellow">Streak Bonus:</span>
          <span className="font-mono font-bold text-anime-yellow">
            {xpEvent.multiplier}x
          </span>
        </div>
      )}

      {/* Source Information */}
      <div className="text-xs text-anime-cyan text-center">
        {xpEvent.source}
      </div>

      {/* Particle Effect Overlay */}
      {showAnimation && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <LottieAnimation name="xp-burst" width={160} height={160} />
        </div>
      )}
    </div>
  )
}