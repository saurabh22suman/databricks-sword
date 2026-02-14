/**
 * @file ChallengePlayer.tsx
 * @description Main challenge player that renders the correct format component
 * and handles result tracking + solution reveal
 */

"use client"

import {
    DragDropChallenge,
    FillBlankChallenge,
    FreeTextChallenge,
} from "@/components/missions"
import type { Challenge, ValidationResult } from "@/lib/challenges"
import type { DragDropConfig, FillBlankConfig, FreeTextConfig } from "@/lib/missions"
import React, { useState } from "react"
import { OptimalSolutionReveal } from "./OptimalSolutionReveal"

export type ChallengePlayerProps = {
  /** The challenge to play */
  challenge: Challenge
  /** Callback on completion with result */
  onComplete?: (result: ValidationResult) => void
}

/**
 * ChallengePlayer renders the appropriate format component for a challenge
 * and shows the optimal solution after completion.
 */
export function ChallengePlayer({
  challenge,
  onComplete,
}: ChallengePlayerProps): React.ReactElement {
  const [completed, setCompleted] = useState(false)
  const [result, setResult] = useState<ValidationResult | null>(null)

  const handleComplete = (stageResult: unknown): void => {
    const validationResult: ValidationResult = {
      isValid: true,
      score: 100,
      maxScore: 100,
      details: ["Challenge completed"],
    }
    setResult(validationResult)
    setCompleted(true)
    onComplete?.(validationResult)
  }

  return (
    <div className="space-y-6">
      {/* Challenge Header */}
      <div className="cut-corner border border-anime-700 bg-anime-900 p-6">
        <h2 className="font-heading text-2xl font-bold text-anime-100 mb-2">
          {challenge.title}
        </h2>
        <p className="text-anime-400">{challenge.description}</p>
      </div>

      {/* Challenge Format Component */}
      {!completed && renderFormat(challenge, handleComplete)}

      {/* Result + Solution Reveal */}
      {completed && (
        <div className="space-y-6">
          <div className="cut-corner border border-anime-green bg-anime-green/10 p-6">
            <h3 className="font-heading text-xl font-bold text-anime-green mb-2">
              Challenge Complete!
            </h3>
            <p className="text-anime-400">
              Score: {result?.score ?? 0}/{result?.maxScore ?? 100}
            </p>
          </div>

          <OptimalSolutionReveal
            optimalSolution={challenge.optimalSolution}
            explanation={challenge.explanation}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Renders the correct format component based on the challenge format.
 */
function renderFormat(
  challenge: Challenge,
  onComplete: (result: unknown) => void
): React.ReactElement {
  switch (challenge.format) {
    case "drag-drop": {
      if (!challenge.dragDrop) {
        return <p className="text-anime-accent">Missing drag-drop config</p>
      }
      const config: DragDropConfig = {
        description: challenge.description,
        blocks: [...challenge.dragDrop.blocks],
        correctOrder: [...challenge.dragDrop.correctOrder],
        hints: [...challenge.hints],
      }
      return <DragDropChallenge config={config} onComplete={onComplete} />
    }

    case "fill-blank": {
      if (!challenge.fillBlank) {
        return <p className="text-anime-accent">Missing fill-blank config</p>
      }
      const config: FillBlankConfig = {
        description: challenge.description,
        codeTemplate: challenge.fillBlank.codeTemplate,
        blanks: challenge.fillBlank.blanks.map((b) => ({
          id: b.id,
          correctAnswer: b.correctAnswer,
          options: [...b.options],
        })),
        hints: [...challenge.hints],
      }
      return <FillBlankChallenge config={config} onComplete={onComplete} />
    }

    case "free-text": {
      if (!challenge.freeText) {
        return <p className="text-anime-accent">Missing free-text config</p>
      }
      const config: FreeTextConfig = {
        description: challenge.description,
        starterCode: challenge.freeText.starterCode,
        expectedPattern: challenge.freeText.expectedPattern,
        simulatedOutput: challenge.freeText.simulatedOutput,
        hints: [...challenge.hints],
      }
      return <FreeTextChallenge config={config} onComplete={onComplete} />
    }

    default:
      return (
        <div className="cut-corner border border-anime-accent bg-anime-accent/10 p-6">
          <p className="text-anime-accent">
            Unknown challenge format: {challenge.format}
          </p>
        </div>
      )
  }
}
