/**
 * @file ChallengePlayerWrapper.tsx
 * @description Client wrapper for ChallengePlayer on the challenge detail page
 */

"use client"

import type { Challenge, ValidationResult } from "@/lib/challenges"
import { awardChallengeXp } from "@/lib/gamification/xpService"
import { loadSandbox, MAX_CHALLENGE_XP_COMPLETIONS } from "@/lib/sandbox"
import { playSound } from "@/lib/sound"
import { useRouter } from "next/navigation"
import React, { useEffect, useState } from "react"
import { ChallengeCompleteCelebration } from "./ChallengeCompleteCelebration"
import { ChallengePlayer } from "./ChallengePlayer"

export type ChallengePlayerWrapperProps = {
  /** The challenge to play */
  challenge: Challenge
}

/**
 * Client wrapper that provides navigation after challenge completion.
 * Shows an XP-maxed banner when the user has already earned max XP for this challenge.
 */
export function ChallengePlayerWrapper({
  challenge,
}: ChallengePlayerWrapperProps): React.ReactElement {
  const router = useRouter()
  const [xpMaxed, setXpMaxed] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [lastXpEarned, setLastXpEarned] = useState(0)
  const [lastMultiplier, setLastMultiplier] = useState(1)

  useEffect(() => {
    const sandbox = loadSandbox()
    if (sandbox) {
      const result = sandbox.challengeResults[challenge.id]
      if (result && result.completionCount >= MAX_CHALLENGE_XP_COMPLETIONS) {
        setXpMaxed(true)
      }
    }
  }, [challenge.id])

  const handleComplete = (_result: ValidationResult): void => {
    playSound("challenge-complete")
    const event = awardChallengeXp(challenge.id, challenge.xpReward)
    if (event.amount === 0) {
      setXpMaxed(true)
    }
    setLastXpEarned(event.amount)
    setLastMultiplier(event.multiplier)
    setCelebrating(true)
  }

  const handleCelebrationDismiss = (): void => {
    setCelebrating(false)
    router.push("/challenges")
  }

  return (
    <div>
      {celebrating && (
        <ChallengeCompleteCelebration
          xpEarned={lastXpEarned}
          baseXp={challenge.xpReward}
          multiplier={lastMultiplier}
          xpMaxed={xpMaxed}
          onDismiss={handleCelebrationDismiss}
          autoDismiss={2800}
        />
      )}
      {xpMaxed && (
        <div className="mb-4 px-4 py-3 rounded border border-anime-yellow/30 bg-anime-yellow/5 text-anime-yellow text-sm flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <span>
            XP maxed — you&apos;ve earned all available XP for this challenge.
            You can still practice for free!
          </span>
        </div>
      )}
      <ChallengePlayer challenge={challenge} onComplete={handleComplete} />
    </div>
  )
}
