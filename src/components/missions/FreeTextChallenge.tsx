/**
 * @file FreeTextChallenge.tsx
 * @description Free-form code challenge component with simulated execution
 */

"use client";

import { Callout } from "@/components/ui";
import type { FreeTextConfig } from "@/lib/missions";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import React, { useState } from "react";

export interface FreeTextChallengeProps {
  /**
   * Free-text configuration
   */
  config: FreeTextConfig;
  /**
   * Callback when challenge is completed
   */
  onComplete?: (result: {
    correct: boolean;
    code: string;
    attempts: number;
  }) => void;
}

/**
 * FreeTextChallenge component
 *
 * Provides a code editor for users to write code, simulates execution,
 * and validates the code against an expected pattern.
 */
export function FreeTextChallenge({
  config,
  onComplete,
}: FreeTextChallengeProps): React.ReactElement {
  const { settings } = useSettings();
  const [code, setCode] = useState(config.starterCode);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [currentHintIndex, setCurrentHintIndex] = useState(-1);
  const [validated, setValidated] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [completed, setCompleted] = useState(false);

  /**
   * Handle code execution (simulated)
   */
  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput("");

    // Simulate execution delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setOutput(config.simulatedOutput);
    setIsRunning(false);
    setHasRun(true);
  };

  /**
   * Handle code submission (does NOT navigate - just shows feedback)
   */
  const handleSubmit = () => {
    const regex = new RegExp(config.expectedPattern, "i");
    const correct = regex.test(code);

    setValidated(true);
    setIsCorrect(correct);
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    if (correct) {
      setCompleted(true);
    }
  };

  /**
   * Handle continue to next stage (only called after correct answer)
   */
  const handleContinue = () => {
    if (onComplete && completed) {
      onComplete({
        correct: true,
        code,
        attempts,
      });
    }
  };

  /**
   * Handle hint display
   */
  const handleShowHint = () => {
    if (currentHintIndex < 0) {
      setCurrentHintIndex(0);
    }
  };

  /**
   * Handle next hint
   */
  const handleNextHint = () => {
    if (currentHintIndex < config.hints.length - 1) {
      setCurrentHintIndex(currentHintIndex + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-anime-300 text-lg">{config.description}</p>

      {/* Code Editor */}
      <div>
        <label htmlFor="code-editor" className="block text-anime-400 text-sm mb-2">
          Code Editor
        </label>
        <textarea
          id="code-editor"
          aria-label="Code editor"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setValidated(false); // Reset validation when code changes
          }}
          rows={12}
          style={{ fontSize: `${settings.codeEditorFontSize}px` }}
          className={cn(
            "w-full px-4 py-3 rounded",
            "bg-anime-900 border-2 border-anime-700 text-anime-100",
            "font-mono text-sm",
            "focus:outline-none focus:border-anime-cyan focus:ring-2 focus:ring-anime-cyan/20",
            "resize-vertical"
          )}
        />
      </div>

      {/* Action Buttons (hidden after completion) */}
      {!completed && (
        <div className="flex gap-4">
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className={cn(
              "px-6 py-3 rounded font-heading text-sm uppercase tracking-wider",
              "transition-all duration-300",
              isRunning
                ? "bg-anime-800 text-anime-600 cursor-not-allowed"
                : "bg-anime-cyan text-anime-950 hover:bg-anime-purple hover:text-white"
            )}
          >
            {isRunning ? "Running..." : "Run Code"}
          </button>

          <button
            onClick={handleSubmit}
            disabled={!hasRun}
            className={cn(
              "px-6 py-3 rounded font-heading text-sm uppercase tracking-wider",
              "transition-all duration-300",
              hasRun
                ? "bg-anime-accent text-white hover:bg-anime-purple hover:shadow-neon-purple"
                : "bg-anime-800 text-anime-600 cursor-not-allowed"
            )}
          >
            Submit
          </button>
        </div>
      )}

      {/* Output Section */}
      {(output || isRunning) && (
        <div className="bg-anime-950 border border-anime-800 rounded-lg p-6">
          <h3 className="font-heading text-lg text-anime-cyan mb-3">
            Output
          </h3>
          {isRunning ? (
            <p className="text-anime-500 font-mono text-sm">Running...</p>
          ) : (
            <pre className="font-mono text-sm text-anime-300 whitespace-pre overflow-x-auto">
              {output}
            </pre>
          )}
        </div>
      )}

      {/* Hint Section - Progressive hints (one at a time) */}
      {settings.showHints && config.hints.length > 0 && currentHintIndex < 0 && (
        <button
          onClick={handleShowHint}
          className="text-anime-cyan hover:text-anime-purple transition-colors text-sm"
        >
          Show Hint ({config.hints.length} available)
        </button>
      )}

      {settings.showHints && currentHintIndex >= 0 && (
        <div className="space-y-3">
          <Callout type="info">
            <p className="text-sm">
              <span className="text-anime-cyan font-medium">Hint {currentHintIndex + 1}/{config.hints.length}:</span> {config.hints[currentHintIndex]}
            </p>
          </Callout>
          {currentHintIndex < config.hints.length - 1 && (
            <button
              onClick={handleNextHint}
              className="text-anime-cyan hover:text-anime-purple transition-colors text-sm"
            >
              Next Hint ({config.hints.length - currentHintIndex - 1} remaining)
            </button>
          )}
        </div>
      )}

      {/* Validation Result */}
      {validated && (
        <Callout type={isCorrect ? "tip" : "warning"}>
          {isCorrect ? (
            <p className="text-sm font-medium">
              Correct! Your code matches the expected pattern.
            </p>
          ) : (
            <p className="text-sm font-medium">
              Not quite. Review the requirements and try again.
            </p>
          )}
        </Callout>
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
