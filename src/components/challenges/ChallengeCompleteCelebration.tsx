"use client";

import { LottieAnimation } from "@/components/ui/LottieAnimation";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { ConfettiCanvas } from "../gamification/ConfettiCanvas";

/**
 * ChallengeCompleteCelebration Props
 */
export type ChallengeCompleteCelebrationProps = {
  /** XP earned from the challenge */
  xpEarned: number;
  /** Whether XP was maxed (already earned max from this challenge) */
  xpMaxed?: boolean;
  /** Auto-dismiss after ms */
  autoDismiss?: number;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Additional CSS classes */
  className?: string;
};

/**
 * ChallengeCompleteCelebration — Brief celebration overlay shown after
 * completing a challenge, before navigating back to the challenge list.
 *
 * Features confetti burst, Lottie animation, and cyberpunk styling.
 */
export function ChallengeCompleteCelebration({
  xpEarned,
  xpMaxed = false,
  autoDismiss = 2800,
  onDismiss,
  className,
}: ChallengeCompleteCelebrationProps): React.ReactElement {
  // Auto-dismiss
  useEffect(() => {
    if (autoDismiss && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, onDismiss]);

  return (
    <div
      data-testid="challenge-complete-celebration"
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-anime-950/85 backdrop-blur-sm",
        "animate-challenge-celebrate",
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Challenge complete celebration"
    >
      {/* Confetti */}
      <ConfettiCanvas
        particleCount={90}
        duration={2500}
        colors={["#00ffff", "#ff3366", "#9933ff", "#00ff66", "#ffcc00"]}
      />

      {/* Lottie background anim — reuse mission-complete */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <LottieAnimation name="mission-complete" width={240} height={240} />
      </div>

      {/* Content card */}
      <div className="relative z-10 text-center px-10 py-8">
        <h2 className="font-heading text-4xl font-bold text-anime-green mb-3 neon-text animate-xp-count-pop">
          Challenge Complete!
        </h2>

        {xpEarned > 0 && !xpMaxed ? (
          <div className="text-2xl font-mono font-bold text-anime-accent animate-xp-count-pop">
            +{xpEarned} XP
          </div>
        ) : xpMaxed ? (
          <div className="text-sm text-anime-yellow mt-1">
            XP maxed — practice mode
          </div>
        ) : null}

        {onDismiss && (
          <button
            onClick={onDismiss}
            className={cn(
              "mt-6 px-6 py-2 text-sm font-bold rounded",
              "bg-anime-green/20 border border-anime-green text-anime-green",
              "hover:bg-anime-green/30 transition-all",
              "shadow-neon-cyan"
            )}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
