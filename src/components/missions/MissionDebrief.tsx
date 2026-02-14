/**
 * @file MissionDebrief.tsx
 * @description Mission completion summary and reflection component
 */

"use client";

import { LottieAnimation } from "@/components/ui/LottieAnimation";
import type { DebriefConfig } from "@/lib/missions";
import { cn } from "@/lib/utils";
import React from "react";

export interface MissionDebriefProps {
  /**
   * Debrief configuration
   */
  config: DebriefConfig;
  /**
   * Optional next mission ID
   */
  nextMissionId?: string;
  /**
   * Optional completion statistics
   */
  completionStats?: {
    totalStages: number;
    timeSpent: number; // seconds
    xpEarned: number;
  };
  /**
   * Callback when user proceeds
   */
  onComplete?: (result: { nextMissionId: string | null }) => void;
}

/**
 * MissionDebrief component
 *
 * Final stage that provides mission summary, industry context,
 * alternative approaches, and further reading resources.
 */
export function MissionDebrief({
  config,
  nextMissionId,
  completionStats,
  onComplete,
}: MissionDebriefProps): React.ReactElement {
  const handleContinue = () => {
    if (onComplete) {
      onComplete({
        nextMissionId: nextMissionId || null,
      });
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} min`;
  };

  return (
    <div className="space-y-6">
      {/* Completion Banner */}
      <div className="cut-corner border border-anime-green bg-anime-green/10 p-8 text-center relative overflow-hidden">
        {/* Lottie celebration animation */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <LottieAnimation name="mission-complete" width={200} height={200} />
        </div>
        <h2 className="relative z-10 font-heading text-3xl font-bold text-anime-green mb-2">
          Mission Complete!
        </h2>
        <p className="relative z-10 text-anime-200">
          You've successfully completed this mission.
        </p>
      </div>

      {/* Completion Stats */}
      {completionStats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="cut-corner border border-anime-700 bg-anime-900 p-4 text-center">
            <div className="font-heading text-2xl font-bold text-anime-cyan">
              {completionStats.totalStages}
            </div>
            <div className="text-sm text-anime-500">Stages Completed</div>
          </div>
          <div className="cut-corner border border-anime-700 bg-anime-900 p-4 text-center">
            <div className="font-heading text-2xl font-bold text-anime-cyan">
              {formatTime(completionStats.timeSpent)}
            </div>
            <div className="text-sm text-anime-500">Time Spent</div>
          </div>
          <div className="cut-corner border border-anime-700 bg-anime-900 p-4 text-center">
            <div className="font-heading text-2xl font-bold text-anime-cyan">
              {completionStats.xpEarned} XP
            </div>
            <div className="text-sm text-anime-500">XP Earned</div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="cut-corner border border-anime-700 bg-anime-900 p-6">
        <h3 className="font-heading text-xl font-bold text-anime-100 mb-4">
          Mission Summary
        </h3>
        <div className="text-anime-300 leading-relaxed whitespace-pre-line">{config.summary}</div>
      </div>

      {/* Industry Context */}
      <div className="cut-corner border border-anime-700 bg-anime-900 p-6">
        <h3 className="font-heading text-xl font-bold text-anime-100 mb-4">
          Industry Context
        </h3>
        <div className="text-anime-300 leading-relaxed whitespace-pre-line">
          {config.industryContext}
        </div>
      </div>

      {/* Alternative Approach */}
      <div className="cut-corner border border-anime-700 bg-anime-900 p-6">
        <h3 className="font-heading text-xl font-bold text-anime-100 mb-4">
          Alternative Approach
        </h3>
        <div className="text-anime-300 leading-relaxed whitespace-pre-line">
          {config.alternativeApproach}
        </div>
      </div>

      {/* Further Reading */}
      {config.furtherReading && config.furtherReading.length > 0 && (
      <div className="cut-corner border border-anime-700 bg-anime-900 p-6">
        <h3 className="font-heading text-xl font-bold text-anime-100 mb-4">
          Further Reading
        </h3>
        <ul className="space-y-3">
          {config.furtherReading.map((resource, index) => (
            <li key={index}>
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-anime-cyan hover:text-anime-purple transition-colors flex items-center gap-2 group"
              >
                <span className="group-hover:translate-x-1 transition-transform">
                  {resource.title}
                </span>
                <svg
                  className="w-4 h-4 opacity-70 group-hover:opacity-100"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      </div>
      )}

      {/* Call to Action */}
      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          className={cn(
            "px-8 py-3 rounded font-heading text-sm uppercase tracking-wider",
            "transition-all duration-300",
            nextMissionId
              ? "bg-anime-accent text-white hover:bg-anime-purple hover:shadow-neon-purple"
              : "bg-anime-cyan text-anime-950 hover:bg-anime-cyan/90 shadow-neon-cyan"
          )}
        >
          {nextMissionId ? "Next Mission" : "Return to Missions"}
        </button>
      </div>
    </div>
  );
}
