/**
 * @file FillBlankChallenge.tsx
 * @description Fill-in-the-blank code challenge component
 */

"use client";

import { Callout } from "@/components/ui";
import type { FillBlankConfig } from "@/lib/missions";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import React, { useMemo, useState } from "react";

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export interface FillBlankChallengeProps {
  /**
   * Fill-blank configuration
   */
  config: FillBlankConfig;
  /**
   * Callback when challenge is completed
   */
  onComplete?: (result: {
    correct: boolean;
    score: number;
    attempts: number;
  }) => void;
}

interface BlankAnswer {
  id: number;
  value: string;
}

/**
 * FillBlankChallenge component
 *
 * Presents code with blanks that users fill in by selecting from dropdowns.
 */
export function FillBlankChallenge({
  config,
  onComplete,
}: FillBlankChallengeProps): React.ReactElement {
  const { settings } = useSettings();
  const [answers, setAnswers] = useState<BlankAnswer[]>(
    config.blanks.map((blank) => ({ id: blank.id, value: "" }))
  );
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [validated, setValidated] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [completed, setCompleted] = useState(false);

  // Shuffle options for each blank once on mount
  const shuffledBlanks = useMemo(() => {
    return config.blanks.map((blank) => ({
      ...blank,
      options: shuffleArray(blank.options),
    }));
  }, [config.blanks]);

  /**
   * Check if all blanks are filled
   */
  const allFilled = useMemo(() => {
    return answers.every((answer) => answer.value !== "");
  }, [answers]);

  /**
   * Get validation results for each blank
   */
  const validationResults = useMemo(() => {
    if (!validated) return null;

    return answers.map((answer) => {
      const blank = config.blanks.find((b) => b.id === answer.id);
      return {
        id: answer.id,
        correct: blank ? answer.value === blank.correctAnswer : false,
      };
    });
  }, [validated, answers, config.blanks]);

  /**
   * Calculate score
   */
  const score = useMemo(() => {
    if (!validationResults) return 0;
    const correctCount = validationResults.filter((r) => r.correct).length;
    return Math.round((correctCount / config.blanks.length) * 100);
  }, [validationResults, config.blanks.length]);

  /**
   * Check if all answers are correct
   */
  const allCorrect = useMemo(() => {
    return validationResults
      ? validationResults.every((r) => r.correct)
      : false;
  }, [validationResults]);

  /**
   * Handle answer selection
   */
  const handleAnswerChange = (blankId: number, value: string) => {
    setAnswers((prev) =>
      prev.map((answer) =>
        answer.id === blankId ? { ...answer, value } : answer
      )
    );
    setValidated(false); // Reset validation when answer changes
  };

  /**
   * Handle validation (does NOT navigate - just shows feedback)
   */
  const handleCheckAnswers = () => {
    setValidated(true);
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    const results = answers.map((answer) => {
      const blank = config.blanks.find((b) => b.id === answer.id);
      return {
        id: answer.id,
        correct: blank ? answer.value === blank.correctAnswer : false,
      };
    });

    const isAllCorrect = results.every((r) => r.correct);
    
    if (isAllCorrect) {
      setCompleted(true);
    }
  };

  /**
   * Handle continue to next stage (only called after correct answer)
   */
  const handleContinue = () => {
    if (onComplete && completed) {
      const correctCount = answers.filter((answer) => {
        const blank = config.blanks.find((b) => b.id === answer.id);
        return blank ? answer.value === blank.correctAnswer : false;
      }).length;
      const calculatedScore = Math.round(
        (correctCount / config.blanks.length) * 100
      );

      onComplete({
        correct: true,
        score: calculatedScore,
        attempts,
      });
    }
  };

  /**
   * Render code with blanks replaced by dropdowns
   */
  const renderCodeWithBlanks = () => {
    let codeContent = config.codeTemplate;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    // Find all blanks in order
    const blankMatches: Array<{ index: number; id: number }> = [];
    config.blanks.forEach((blank) => {
      const pattern = `__BLANK_${blank.id}__`;
      const index = codeContent.indexOf(pattern);
      if (index !== -1) {
        blankMatches.push({ index, id: blank.id });
      }
    });

    // Sort by index
    blankMatches.sort((a, b) => a.index - b.index);

    // Build elements
    blankMatches.forEach(({ index, id }, i) => {
      const pattern = `__BLANK_${id}__`;
      const beforeBlank = codeContent.substring(lastIndex, index);

      if (beforeBlank) {
        elements.push(
          <span key={`text-${i}`}>{beforeBlank}</span>
        );
      }

      const blank = config.blanks.find((b) => b.id === id);
      const answer = answers.find((a) => a.id === id);
      const validationResult = validationResults?.find((r) => r.id === id);

      if (blank && answer) {
        elements.push(
          <select
            key={`blank-${id}`}
            value={answer.value}
            onChange={(e) => handleAnswerChange(id, e.target.value)}
            aria-label={`Blank ${id + 1}`}
            className={cn(
              "inline-block mx-1 px-2 py-1 rounded",
              "bg-anime-800 border-2 text-anime-100",
              "font-mono text-sm",
              "focus:outline-none focus:ring-2 focus:ring-anime-cyan",
              !validated && "border-anime-700",
              validated &&
                validationResult?.correct &&
                "border-anime-green",
              validated &&
                !validationResult?.correct &&
                "border-anime-accent"
            )}
          >
            <option value="">Select...</option>
            {shuffledBlanks.find((b) => b.id === id)?.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      }

      lastIndex = index + pattern.length;
    });

    // Add remaining text
    if (lastIndex < codeContent.length) {
      elements.push(
        <span key="text-end">{codeContent.substring(lastIndex)}</span>
      );
    }

    return elements;
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-anime-300 text-lg">{config.description}</p>

      {/* Expected Output - shows WHAT the code should produce */}
      {config.expectedOutput && (
        <div className="bg-anime-800/50 border border-anime-purple/30 rounded-lg p-4">
          <p className="text-anime-purple text-sm font-medium mb-1">🎯 Expected Result:</p>
          <p className="text-anime-200 text-sm font-mono whitespace-pre-wrap">{config.expectedOutput}</p>
        </div>
      )}

      {/* Code Template with Blanks */}
      <div className="bg-anime-900 border border-anime-700 rounded p-6">
        <pre className="font-mono text-sm text-anime-100 whitespace-pre-wrap">
          {renderCodeWithBlanks()}
        </pre>
      </div>

      {/* Hint Section - Progressive hints (one at a time) */}
      {settings.showHints && config.hints.length > 0 && (
        <div className="space-y-3">
          {/* Show current hint only */}
          {hintsRevealed > 0 && (
            <Callout type="info">
              <p className="text-sm">
                <span className="text-anime-cyan font-medium">Hint {hintsRevealed}/{config.hints.length}:</span> {config.hints[hintsRevealed - 1]}
              </p>
            </Callout>
          )}
          
          {/* Show next hint button if more available */}
          {hintsRevealed < config.hints.length && (
            <button
              onClick={() => setHintsRevealed((prev) => prev + 1)}
              className="text-anime-cyan hover:text-anime-purple transition-colors text-sm"
            >
              {hintsRevealed === 0 
                ? `Show Hint (${config.hints.length} available)` 
                : `Next Hint (${config.hints.length - hintsRevealed} remaining)`}
            </button>
          )}
        </div>
      )}

      {/* Check Button (hidden after completion) */}
      {!completed && (
        <div className="flex justify-center">
          <button
            onClick={handleCheckAnswers}
            disabled={!allFilled}
            className={cn(
              "px-6 py-3 rounded font-heading text-sm uppercase tracking-wider",
              "transition-all duration-300",
              allFilled
                ? "bg-anime-accent text-white hover:bg-anime-purple hover:shadow-neon-purple"
                : "bg-anime-800 text-anime-600 cursor-not-allowed"
            )}
          >
            Check Answers
          </button>
        </div>
      )}

      {/* Validation Result */}
      {validated && (
        <Callout type={allCorrect ? "tip" : "warning"}>
          {allCorrect ? (
            <p className="text-sm font-medium">
              All correct! You've filled in all the blanks correctly.
            </p>
          ) : (
            <p className="text-sm font-medium">
              Not quite. {score}% correct. Review the highlighted answers and
              try again.
            </p>
          )}
        </Callout>
      )}

      {/* Learnings (shown after correct validation) */}
      {validated && allCorrect && config.learnings && config.learnings.length > 0 && (
        <div className="bg-anime-950 border border-anime-green/30 rounded-lg p-6">
          <h3 className="font-heading text-lg text-anime-green mb-4">
            Key Learnings
          </h3>
          <ul className="space-y-2">
            {config.learnings.map((learning, index) => (
              <li key={index} className="flex items-start gap-3 text-anime-300">
                <span className="text-anime-green mt-1">✓</span>
                <span>{learning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Continue Button (shown after correct answer) */}
      {completed && (
        <div className="flex justify-center">
          <button
            onClick={handleContinue}
            className={cn(
              "px-8 py-3 rounded font-heading text-sm uppercase tracking-wider",
              "transition-all duration-300",
              "bg-anime-green text-anime-950 font-bold",
              "hover:shadow-neon-cyan hover:scale-105"
            )}
          >
            Continue to Next Stage →
          </button>
        </div>
      )}
    </div>
  );
}
