/**
 * @file MissionBriefing.tsx
 * @description Mission briefing component displaying narrative and learning objectives
 */

"use client";

import { Badge } from "@/components/ui";
import type { BriefingConfig } from "@/lib/missions";
import { cn } from "@/lib/utils";
import React from "react";

export interface MissionBriefingProps {
  /**
   * Briefing configuration data
   */
  config: BriefingConfig;
  /**
   * Estimated completion time in minutes
   */
  estimatedMinutes?: number;
  /**
   * Loading state for start button
   */
  isLoading?: boolean;
  /**
   * Callback when start button is clicked
   */
  onStart?: () => void;
}

/**
 * Format estimated time for display
 */
function formatEstimatedTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  return `${hours} ${hours === 1 ? "hour" : "hours"} ${remainingMinutes} minutes`;
}

/**
 * MissionBriefing component
 *
 * Displays mission narrative, learning objectives, industry context,
 * and provides a call-to-action to begin the mission stages.
 */
export function MissionBriefing({
  config,
  estimatedMinutes,
  isLoading = false,
  onStart,
}: MissionBriefingProps): React.ReactElement {
  return (
    <div className="space-y-8">
      {/* Narrative Section */}
      {config.narrative && (
        <section>
          <p className="text-anime-300 text-lg leading-relaxed">
            {config.narrative}
          </p>
        </section>
      )}

      {/* Mission Objective */}
      {config.objective && (
        <section className="cut-corner bg-anime-900 border-l-4 border-anime-accent p-6">
          <h2 className="font-heading text-2xl text-anime-cyan mb-4">
            Mission Objective
          </h2>
          <p className="text-anime-100 text-lg font-medium">
            {config.objective}
          </p>
        </section>
      )}

      {/* Learning Goals */}
      {config.learningGoals && config.learningGoals.length > 0 && (
        <section>
          <h2 className="font-heading text-2xl text-anime-cyan mb-4">
            Learning Goals
          </h2>
          <ul role="list" className="space-y-3">
            {config.learningGoals.map((goal, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-anime-cyan/20 border border-anime-cyan flex items-center justify-center text-anime-cyan font-bold text-sm mt-0.5">
                  {index + 1}
                </span>
                <span className="text-anime-300 flex-1">{goal}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Industry Context (Optional) */}
      {config.industryContext && (
        <section className="bg-anime-950 border border-anime-800 rounded-lg p-6">
          <h2 className="font-heading text-2xl text-anime-cyan mb-4">
            Industry Context
          </h2>

          {/* Domain */}
          {config.industryContext.domain && (
            <div className="mb-4">
              <h3 className="text-sm uppercase tracking-wider text-anime-500 mb-2">
                Domain
              </h3>
              <p className="text-anime-200">{config.industryContext.domain}</p>
            </div>
          )}

          {/* Real-World Application */}
          {config.industryContext.realWorldApplication && (
            <div className="mb-4">
              <h3 className="text-sm uppercase tracking-wider text-anime-500 mb-2">
                Real-World Application
              </h3>
              <p className="text-anime-300">
                {config.industryContext.realWorldApplication}
              </p>
            </div>
          )}

          {/* Key Stakeholders */}
          {config.industryContext.keyStakeholders &&
            config.industryContext.keyStakeholders.length > 0 && (
              <div>
                <h3 className="text-sm uppercase tracking-wider text-anime-500 mb-2">
                  Key Stakeholders
                </h3>
                <div className="flex flex-wrap gap-2">
                  {config.industryContext.keyStakeholders.map((stakeholder) => (
                    <Badge key={stakeholder} variant="default">
                      {stakeholder}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
        </section>
      )}

      {/* Estimated Time */}
      {estimatedMinutes && (
        <div className="flex items-center gap-2 text-anime-400">
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Estimated time: {formatEstimatedTime(estimatedMinutes)}</span>
        </div>
      )}

      {/* Call to Action */}
      <div className="flex justify-center pt-4">
        <button
          onClick={onStart}
          disabled={isLoading}
          className={cn(
            "px-8 py-4 rounded font-heading text-lg uppercase tracking-wider",
            "transition-all duration-300",
            "bg-anime-accent text-white",
            "hover:bg-anime-purple hover:shadow-neon-purple",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isLoading ? "Preparing..." : "Begin Mission"}
        </button>
      </div>
    </div>
  );
}
