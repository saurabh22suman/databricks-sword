/**
 * @file DragDropChallenge.tsx
 * @description Drag and drop code block ordering challenge component
 */

"use client";

import { Callout } from "@/components/ui";
import type { DragDropConfig } from "@/lib/missions";
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

export interface DragDropChallengeProps {
  /**
   * Drag and drop configuration
   */
  config: DragDropConfig;
  /**
   * Callback when blocks are reordered
   */
  onUpdate?: (blockOrder: string[]) => void;
  /**
   * Callback when challenge is completed
   */
  onComplete?: (result: {
    correct: boolean;
    attempts: number;
  }) => void;
}

/**
 * DragDropChallenge component
 *
 * Allows users to drag and drop code blocks to arrange them in the correct order.
 */
export function DragDropChallenge({
  config,
  onUpdate,
  onComplete,
}: DragDropChallengeProps): React.ReactElement {
  const { settings } = useSettings();
  // Shuffle blocks once on mount
  const initialBlocks = useMemo(() => shuffleArray(config.blocks), [config.blocks]);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [validated, setValidated] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [attempts, setAttempts] = useState(0);

  /**
   * Handle drag start
   */
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  /**
   * Handle drag over
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  /**
   * Handle drop
   */
  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null) return;

    const newBlocks = [...blocks];
    const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(dropIndex, 0, draggedBlock);

    setBlocks(newBlocks);
    setDraggedIndex(null);
    setValidated(false); // Reset validation on reorder

    // Notify parent of block order change
    if (onUpdate) {
      onUpdate(newBlocks.map((block) => block.id));
    }
  };

  /**
   * Handle drag end
   */
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  /**
   * Track if user completed successfully (to show Continue button)
   */
  const [completed, setCompleted] = useState(false);

  /**
   * Validate block order (does NOT navigate - just shows feedback)
   */
  const handleCheckOrder = () => {
    const currentOrder = blocks.map((block) => block.id);
    const correct = JSON.stringify(currentOrder) === JSON.stringify(config.correctOrder);

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
        attempts,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-anime-300 text-lg">{config.description}</p>

      {/* Instructions (guidance on logical flow) */}
      {config.instructions && (
        <div className="bg-anime-800/50 border border-anime-cyan/30 rounded-lg p-4">
          <p className="text-anime-cyan text-sm font-medium mb-1">💡 Think about it:</p>
          <p className="text-anime-200 text-sm">{config.instructions}</p>
        </div>
      )}

      {/* Code Blocks */}
      <div className="space-y-3">
        {blocks.map((block, index) => (
          <div
            key={block.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "bg-anime-900 border border-anime-700 rounded p-4",
              "cursor-grab active:cursor-grabbing",
              "transition-all duration-200",
              "hover:border-anime-cyan hover:shadow-neon-cyan",
              draggedIndex === index && "opacity-50",
              validated && isCorrect && "border-anime-green",
              validated && !isCorrect && "border-anime-yellow"
            )}
          >
            <div className="flex items-start gap-4">
              {/* Block Number */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-anime-800 border border-anime-700 flex items-center justify-center text-anime-500 font-bold text-sm">
                {index + 1}
              </div>

              {/* Block Content */}
              <div className="flex-1">
                <p className="text-anime-400 text-xs uppercase tracking-wider mb-2">
                  {block.label}
                </p>
                <pre className="font-mono text-sm text-anime-100 overflow-x-auto">
                  {block.code}
                </pre>
              </div>

              {/* Drag Handle Indicator */}
              <div className="flex-shrink-0 text-anime-600">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8h16M4 16h16"
                  />
                </svg>
              </div>
            </div>
          </div>
        ))}
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

      {/* Check Order Button (hidden after completion) */}
      {!completed && (
        <div className="flex justify-center">
          <button
            onClick={handleCheckOrder}
            className={cn(
              "px-6 py-3 rounded font-heading text-sm uppercase tracking-wider",
              "transition-all duration-300",
              "bg-anime-accent text-white",
              "hover:bg-anime-purple hover:shadow-neon-purple"
            )}
          >
            Check Order
          </button>
        </div>
      )}

      {/* Validation Result */}
      {validated && (
        <Callout type={isCorrect ? "tip" : "warning"}>
          {isCorrect ? (
            <p className="text-sm font-medium">
              Correct! You've arranged the code blocks in the right order.
            </p>
          ) : (
            <p className="text-sm font-medium">
              Not quite right. Try rearranging the blocks and check again.
            </p>
          )}
        </Callout>
      )}

      {/* Explanation (shown after correct validation) */}
      {validated && isCorrect && config.explanation && (
        <div className="bg-anime-950 border border-anime-800 rounded-lg p-6">
          <h3 className="font-heading text-lg text-anime-cyan mb-3">
            Explanation
          </h3>
          <p className="text-anime-300">{config.explanation}</p>
        </div>
      )}

      {/* Learnings (shown after correct validation) */}
      {validated && isCorrect && config.learnings && config.learnings.length > 0 && (
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
