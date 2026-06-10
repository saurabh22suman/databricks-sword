/**
 * @file MissionBriefing.tsx
 * @description Mission briefing component displaying narrative and learning objectives
 */

"use client";

import { Badge } from "@/components/ui";
import type { BriefingConfig } from "@/lib/missions";
import { cn } from "@/lib/utils";
import React from "react";
import { renderRichText } from "./RichText";

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
  /**
   * Custom button label (overrides default "Continue")
   */
  buttonLabel?: string;
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
  buttonLabel,
}: MissionBriefingProps): React.ReactElement {
  return (
    <div className="space-y-8">
      {/* Narrative Section */}
      {config.narrative && (
        <section>
          <div className="space-y-4 text-anime-300 text-lg leading-relaxed">
            {renderRichText(config.narrative)}
          </div>
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
          {isLoading ? "Preparing..." : buttonLabel || "Continue"}
        </button>
      </div>
    </div>
  );
}
