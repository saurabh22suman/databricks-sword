"use client";

import { LottieAnimation } from "@/components/ui/LottieAnimation";
import type { Rank } from "@/lib/gamification/types";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { ConfettiCanvas } from "./ConfettiCanvas";
import { RankBadge } from "./RankBadge";

/**
 * RankUpCelebration Props
 */
export interface RankUpCelebrationProps {
  /** The new rank achieved */
  newRank: Rank
  /** The previous rank */
  previousRank: Rank
  /** Whether to show animation effects */
  showAnimation?: boolean
  /** Callback when dismissed */
  onDismiss?: () => void
  /** Auto dismiss after specified milliseconds */
  autoDismiss?: number
  /** Additional CSS classes */
  className?: string
}

/**
 * RankUpCelebration Component
 * 
 * Full-screen anime-style celebration overlay for rank advancement.
 * Features holographic effects, particle bursts, and cyberpunk styling.
 */
export function RankUpCelebration({ 
  newRank,
  previousRank,
  showAnimation = false,
  onDismiss,
  autoDismiss,
  className 
}: RankUpCelebrationProps): React.ReactElement {
  // Auto-dismiss functionality
  useEffect(() => {
    if (autoDismiss && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss()
      }, autoDismiss)

      return () => clearTimeout(timer)
    }
  }, [autoDismiss, onDismiss])

  // Play sound on mount
  useEffect(() => {
    playSound("rank-up")
  }, [])

  // Escape key handler
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onDismiss) {
        onDismiss()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [onDismiss])

  // Backdrop click handler
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && onDismiss) {
      onDismiss()
    }
  }

  return (
    <div 
      data-testid="rank-up-celebration"
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-anime-950/90 backdrop-blur-md",
        showAnimation && "animate-rank-celebration",
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rank-up-title"
    >
      {/* Backdrop */}
      <div 
        data-testid="celebration-backdrop"
        className="absolute inset-0"
        onClick={handleBackdropClick}
      />

      {/* Holographic Grid Background */}
      <div className="holographic-grid absolute inset-0 opacity-10" />

      {/* Scan Lines Effect */}
      <div className="scan-lines absolute inset-0 pointer-events-none" />

      {/* Confetti Canvas */}
      {showAnimation && (
        <ConfettiCanvas particleCount={150} duration={4000} />
      )}

      {/* Particle Burst Effect */}
      {showAnimation && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <LottieAnimation name="rank-up" width={320} height={320} />
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 text-center max-w-md mx-auto p-8">
        {/* Rank Up Title */}
        <h1 
          id="rank-up-title"
          className="text-6xl font-heading font-bold mb-6 neon-text text-anime-accent animate-glitch"
        >
          RANK UP!
        </h1>

        {/* Rank Progression */}
        <div className="mb-8">
          <div className="text-2xl font-bold text-anime-cyan mb-4">
            {previousRank.title} → {newRank.title}
          </div>

          {/* New Rank Badge */}
          <div className="flex justify-center mb-6">
            <div className="animate-float">
              <RankBadge rank={newRank} size={128} className="rank-celebration-badge shadow-neon-cyan" />
            </div>
          </div>

          {/* Congratulations Text */}
          <p className="text-lg text-anime-purple mb-2">
            Congratulations, Agent!
          </p>

          {/* New Rank Title with Neon Effect */}
          <div className="text-3xl font-bold mb-4">
            <span className="neon-text text-anime-accent">{newRank.title}</span>
          </div>

          {/* Rank Description */}
          <p className="text-sm text-anime-700 mb-6 leading-relaxed">
            {newRank.description}
          </p>
        </div>

        {/* Continue Button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={cn(
              "px-8 py-3 bg-anime-accent hover:bg-anime-accent/80",
              "text-white font-bold rounded-lg transition-all",
              "shadow-neon-red hover:shadow-neon-red/75",
              "focus:outline-none focus:ring-2 focus:ring-anime-accent"
            )}
          >
            Continue Mission
          </button>
        )}
      </div>
    </div>
  )
}