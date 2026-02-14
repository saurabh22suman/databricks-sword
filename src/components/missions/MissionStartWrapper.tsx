/**
 * @file MissionStartWrapper.tsx
 * @description Client wrapper for MissionBriefing that handles navigation to first stage
 */

"use client";

import type { BriefingConfig } from "@/lib/missions";
import { useRouter } from "next/navigation";
import React from "react";
import { MissionBriefing } from "./MissionBriefing";

export type MissionStartWrapperProps = {
  /** Briefing configuration data */
  config: BriefingConfig;
  /** Estimated completion time in minutes */
  estimatedMinutes?: number;
  /** Mission ID for navigation */
  missionId: string;
  /** First stage ID for navigation */
  firstStageId: string;
};

/**
 * Client wrapper around MissionBriefing that provides navigation
 * via useRouter instead of passing event handlers from Server Components.
 */
export function MissionStartWrapper({
  config,
  estimatedMinutes,
  missionId,
  firstStageId,
}: MissionStartWrapperProps): React.ReactElement {
  const router = useRouter();

  const handleStart = (): void => {
    router.push(`/missions/${missionId}/stage/${firstStageId}`);
  };

  return (
    <MissionBriefing
      config={config}
      estimatedMinutes={estimatedMinutes}
      onStart={handleStart}
    />
  );
}
