import type { BundleStatus } from "@/lib/databricks/types";
import type { MissionProgress } from "./types";

/**
 * DAB Lifecycle Functions for Sandbox
 * 
 * Functions for managing Databricks Asset Bundle lifecycle
 * during mission init, close, and reset operations.
 */

type ExecutionMode = "simulated" | "databricks";

/**
 * Initialize a mission with the specified execution mode.
 * In Databricks mode, triggers bundle deployment.
 * 
 * @param missionSlug - Mission identifier
 * @param mode - Execution mode (simulated or databricks)
 * @returns Initial mission progress with execution mode set
 */
export async function initMission(
  missionSlug: string,
  mode: ExecutionMode
): Promise<MissionProgress> {
  const baseProgress: MissionProgress = {
    started: true,
    completed: false,
    stageProgress: {},
    sideQuestsCompleted: [],
    totalXpEarned: 0,
    startedAt: new Date().toISOString(),
    executionMode: mode,
  };

  if (mode === "simulated") {
    return baseProgress;
  }

  // Databricks mode - trigger deploy
  try {
    const response = await fetch("/api/databricks/deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ missionSlug }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        ...baseProgress,
        bundleStatus: "error",
      };
    }

    return {
      ...baseProgress,
      bundleStatus: data.status as BundleStatus,
      deployedAt: data.deployedAt,
    };
  } catch {
    return {
      ...baseProgress,
      bundleStatus: "error",
    };
  }
}

/**
 * Close a mission, destroying the bundle if in Databricks mode.
 * 
 * @param missionSlug - Mission identifier
 * @param progress - Current mission progress
 * @returns Updated mission progress after cleanup
 */
export async function closeMission(
  missionSlug: string,
  progress: MissionProgress
): Promise<MissionProgress> {
  // Skip destroy for simulated missions
  if (progress.executionMode !== "databricks") {
    return {
      ...progress,
      completedAt: progress.completed ? new Date().toISOString() : undefined,
    };
  }

  // Skip destroy if bundle is not deployed
  if (progress.bundleStatus !== "deployed") {
    return {
      ...progress,
      completedAt: progress.completed ? new Date().toISOString() : undefined,
    };
  }

  // Destroy the bundle
  try {
    const response = await fetch("/api/databricks/destroy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ missionSlug }),
    });

    const data = await response.json();

    return {
      ...progress,
      bundleStatus: response.ok ? (data.status as BundleStatus) : "error",
      completedAt: progress.completed ? new Date().toISOString() : undefined,
    };
  } catch {
    return {
      ...progress,
      bundleStatus: "error",
      completedAt: progress.completed ? new Date().toISOString() : undefined,
    };
  }
}

/**
 * Reset a mission, destroying the bundle if deployed and clearing progress.
 * 
 * @param missionSlug - Mission identifier
 * @param progress - Current mission progress
 * @returns Fresh mission progress after reset
 */
export async function resetMission(
  missionSlug: string,
  progress: MissionProgress
): Promise<MissionProgress> {
  const freshProgress: MissionProgress = {
    started: false,
    completed: false,
    stageProgress: {},
    sideQuestsCompleted: [],
    totalXpEarned: 0,
    executionMode: progress.executionMode,
    bundleStatus: "not-deployed",
  };

  // Skip destroy for simulated missions or non-deployed bundles
  if (
    progress.executionMode !== "databricks" ||
    progress.bundleStatus !== "deployed"
  ) {
    return freshProgress;
  }

  // Destroy the bundle before resetting
  try {
    await fetch("/api/databricks/destroy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ missionSlug }),
    });

    return freshProgress;
  } catch {
    return {
      ...freshProgress,
      bundleStatus: "error",
    };
  }
}

/**
 * Update bundle status in mission progress.
 * 
 * @param progress - Current mission progress
 * @param status - New bundle status
 * @param deployedAt - Optional deployment timestamp
 * @returns Updated mission progress
 */
export function updateBundleStatus(
  progress: MissionProgress,
  status: BundleStatus,
  deployedAt?: string
): MissionProgress {
  return {
    ...progress,
    bundleStatus: status,
    deployedAt: deployedAt ?? progress.deployedAt,
  };
}
