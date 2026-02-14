/**
 * @file ChallengePlayerWrapper.tsx
 * @description Client wrapper for ChallengePlayer on the challenge detail page
 */

"use client"

import type { Challenge, ValidationResult } from "@/lib/challenges"
import { awardChallengeXp } from "@/lib/gamification/xpService"
import { useRouter } from "next/navigation"
import React from "react"
import { ChallengePlayer } from "./ChallengePlayer"

export type ChallengePlayerWrapperProps = {
  /** The challenge to play */
  challenge: Challenge
}

/**
 * Client wrapper that provides navigation after challenge completion.
 */
export function ChallengePlayerWrapper({
  challenge,
}: ChallengePlayerWrapperProps): React.ReactElement {
  const router = useRouter()

  const handleComplete = (_result: ValidationResult): void => {
    awardChallengeXp(challenge.id, challenge.xpReward)
    router.push("/challenges")
  }

  return <ChallengePlayer challenge={challenge} onComplete={handleComplete} />
}
