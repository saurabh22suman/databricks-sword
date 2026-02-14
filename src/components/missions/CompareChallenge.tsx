/**
 * @file CompareChallenge.tsx
 * @description Side-by-side comparison of two code solutions with
 * explanations and key comparison points. Used for "compare" stage type.
 */

"use client";

import type { CompareConfig } from "@/lib/missions";
import { cn } from "@/lib/utils";
import React, { useState } from "react";

export type CompareChallengeProps = {
  /** Compare stage configuration */
  config: CompareConfig;
  /** Callback when user completes the comparison */
  onComplete: () => void;
};

/**
 * CompareChallenge component
 *
 * Renders two solutions side-by-side with code, output, and explanation.
 * Displays comparison points highlighting key differences.
 * User clicks "Continue" when they've reviewed both approaches.
 *
 * @example
 * ```tsx
 * <CompareChallenge config={compareConfig} onComplete={() => advance()} />
 * ```
 */
export function CompareChallenge({
  config,
  onComplete,
}: CompareChallengeProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<1 | 2>(1);

  const activeSolution = activeTab === 1 ? config.solution1 : config.solution2;

  return (
    <div className="cut-corner border border-anime-700 bg-anime-900 p-6 space-y-6">
      {/* Description */}
      <p className="text-anime-300 text-lg">{config.description}</p>

      {/* Solution Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab(1)}
          className={cn(
            "px-4 py-2 rounded font-heading text-sm transition-colors",
            activeTab === 1
              ? "bg-anime-cyan text-anime-950"
              : "bg-anime-800 text-anime-400 hover:text-anime-200",
          )}
        >
          {config.solution1.title}
        </button>
        <button
          onClick={() => setActiveTab(2)}
          className={cn(
            "px-4 py-2 rounded font-heading text-sm transition-colors",
            activeTab === 2
              ? "bg-anime-purple text-anime-100"
              : "bg-anime-800 text-anime-400 hover:text-anime-200",
          )}
        >
          {config.solution2.title}
        </button>
      </div>

      {/* Active Solution */}
      <div className="space-y-4">
        <h3 className="font-heading text-xl font-bold text-anime-100">
          {activeSolution.title}
        </h3>

        {/* Code */}
        <div className="rounded bg-anime-950 border border-anime-700 p-4 overflow-x-auto">
          <pre className="font-mono text-sm text-anime-200 whitespace-pre-wrap">
            {activeSolution.code}
          </pre>
        </div>

        {/* Output */}
        <div className="rounded bg-anime-950/70 border border-anime-700/50 p-4">
          <p className="text-xs uppercase tracking-wider text-anime-500 mb-2">
            Output
          </p>
          <pre className="font-mono text-sm text-anime-green whitespace-pre-wrap">
            {activeSolution.output}
          </pre>
        </div>

        {/* Explanation */}
        <p className="text-anime-300">{activeSolution.explanation}</p>
      </div>

      {/* Comparison Points */}
      <div className="border-t border-anime-700 pt-6">
        <h3 className="font-heading text-lg font-bold text-anime-yellow mb-3">
          Key Differences
        </h3>
        <ul className="space-y-2">
          {config.comparisonPoints.map((point, idx) => (
            <li key={idx} className="flex items-start gap-2 text-anime-300">
              <span className="text-anime-cyan mt-1 shrink-0">▸</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Continue Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onComplete}
          className="px-6 py-3 rounded bg-anime-cyan text-anime-950 font-heading font-bold hover:bg-anime-cyan/90 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
