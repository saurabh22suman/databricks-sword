/**
 * @file MissionCard.tsx
 * @description Mission card component displaying mission metadata with gamification elements
 */

"use client";

import { Badge } from "@/components/ui";
import type { Mission } from "@/lib/missions";
import { cn } from "@/lib/utils";
import React from "react";

export interface MissionCardProps {
  /**
   * Mission data to display
   */
  mission: Mission;
  /**
   * Current user XP (for lock state)
   */
  userXp?: number;
  /**
   * Mission progress percentage (0-100)
   */
  progress?: number;
  /**
   * Click handler for card interaction
   */
  onClick?: () => void;
}

/**
 * Get rank badge color based on rank
 */
function getRankColor(rank: Mission["rank"]): string {
  switch (rank) {
    case "B":
      return "bg-anime-green";
    case "A":
      return "bg-anime-yellow";
    case "S":
      return "bg-anime-accent";
  }
}

/**
 * Format estimated time for display
 */
function formatTime(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  }
  return `${minutes} min`;
}

/**
 * Get industry display name
 */
function getIndustryLabel(industry: Mission["industry"]): string {
  return industry
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * MissionCard component
 *
 * Displays mission metadata with rank badge, XP reward, estimated time,
 * locked/unlocked state, progress, and primary features.
 */
export function MissionCard({
  mission,
  userXp,
  progress,
  onClick,
}: MissionCardProps): React.ReactElement {
  const isLocked = userXp !== undefined && userXp < mission.xpRequired;
  const isInProgress = progress !== undefined && progress > 0 && progress < 100;
  const isCompleted = progress === 100;

  const handleClick = () => {
    if (!isLocked && onClick) {
      onClick();
    }
  };

  return (
    <div
      className={cn(
        "cut-corner bg-anime-900 border border-anime-700",
        "flex flex-col p-6 transition-all duration-300",
        "hover:border-anime-cyan hover:shadow-neon-cyan",
        isLocked && "opacity-50 cursor-not-allowed",
        !isLocked && "cursor-pointer"
      )}
    >
      {/* Header: Rank Badge + Industry */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-11 h-11 rounded-md flex items-center justify-center",
              "font-heading text-lg font-extrabold text-anime-950",
              getRankColor(mission.rank)
            )}
          >
            {mission.rank}
          </div>
          <span className="text-xs font-bold text-anime-500 uppercase tracking-widest">
            {getIndustryLabel(mission.industry)}
          </span>
        </div>

        {/* Completion Badge */}
        {isCompleted && (
          <Badge variant="advanced">Completed</Badge>
        )}
      </div>

      {/* Title + Subtitle */}
      <h3 className="font-heading text-2xl font-bold leading-tight text-anime-cyan mb-1.5">
        {mission.title}
      </h3>
      <p className="text-sm font-medium text-anime-400 mb-3">{mission.subtitle}</p>

      {/* Description */}
      <p className="text-sm leading-relaxed text-anime-300 mb-5 line-clamp-3">
        {mission.description}
      </p>

      {/* Primary Features */}
      {mission.primaryFeatures.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {mission.primaryFeatures.slice(0, 3).map((feature) => (
            <Badge key={feature} variant="default">
              {feature}
            </Badge>
          ))}
          {mission.primaryFeatures.length > 3 && (
            <Badge variant="default">
              +{mission.primaryFeatures.length - 3} more
            </Badge>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {isInProgress && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-anime-400">Progress</span>
            <span className="text-xs text-anime-cyan font-bold">{progress}%</span>
          </div>
          <div className="h-1.5 bg-anime-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-anime-cyan rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Spacer pushes footer to bottom */}
      <div className="flex-1" />

      {/* Footer: XP + Time + Action Button */}
      <div className="flex items-center justify-between pt-4 border-t border-anime-800">
        <div className="flex items-center gap-4">
          {/* XP Reward */}
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-anime-accent">
              {mission.xpReward}
            </span>
            <span className="text-xs font-bold text-anime-500 uppercase">XP</span>
          </div>

          {/* Estimated Time */}
          <span className="text-sm text-anime-500">
            {formatTime(mission.estimatedMinutes)}
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={handleClick}
          disabled={isLocked}
          className={cn(
            "cut-corner px-5 py-2.5 font-heading text-sm font-bold uppercase tracking-wider",
            "transition-all duration-300",
            isLocked
              ? "bg-anime-800 text-anime-600 cursor-not-allowed"
              : isInProgress
              ? "bg-anime-cyan text-anime-950 hover:bg-anime-purple hover:shadow-neon-cyan"
              : "bg-anime-accent text-white hover:bg-anime-purple hover:shadow-neon-purple"
          )}
        >
          {isLocked ? "Locked" : isInProgress ? "Continue" : "Start"}
        </button>
      </div>

      {/* Locked State Message */}
      {isLocked && (
        <p className="text-xs text-anime-500 mt-3 text-center">
          Requires {mission.xpRequired} XP to unlock
        </p>
      )}
    </div>
  );
}
