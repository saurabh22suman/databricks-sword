import type { SandboxData } from "@/lib/sandbox/types"

export type ResumeMission = {
  missionId: string
  currentStageId: string
  totalStages: number
  completedStages: number
  lastActivityAt: string
}

/**
 * True if the sandbox has at least one mission that has been started
 * (regardless of completion). Used to distinguish "first-time visitor"
 * from "completed everything" in the dashboard empty state.
 */
export function hasStartedAnyMission(sandbox: SandboxData | null): boolean {
  if (!sandbox) return false
  return Object.values(sandbox.missionProgress).some(
    (mp) => mp && mp.started,
  )
}

/**
 * True if the sandbox has at least one mission and every started mission
 * is marked completed. Used to render the "all missions complete" state
 * instead of the "no mission in progress" empty state, which would
 * otherwise misleadingly invite a returning player to "start" again.
 */
export function hasCompletedAllStartedMissions(
  sandbox: SandboxData | null,
): boolean {
  if (!sandbox) return false
  const missions = Object.values(sandbox.missionProgress).filter(
    (mp) => mp && mp.started,
  )
  if (missions.length === 0) return false
  return missions.every((mp) => mp.completed)
}

/**
 * Finds the most recently active in-progress mission from the sandbox.
 *
 * Returns `null` if the sandbox is empty, no missions have been started,
 * or every started mission is already completed. The "most recent" criterion
 * is the highest `completedAt` timestamp across all completed stages of
 * in-progress missions. Ties are broken by insertion order (Object.entries).
 */
export function findResumeMission(sandbox: SandboxData | null): ResumeMission | null {
  if (!sandbox) return null

  let best: ResumeMission | null = null

  for (const [missionId, progress] of Object.entries(sandbox.missionProgress)) {
    if (!progress || progress.completed) continue
    const stages = Object.entries(progress.stageProgress)
    if (stages.length === 0) continue

    let lastActivity = ""
    let completedCount = 0
    let firstIncomplete: string | null = null

    for (const [stageId, sp] of stages) {
      if (sp.completed) {
        completedCount += 1
        const at = (sp as { completedAt?: string }).completedAt ?? ""
        if (at > lastActivity) lastActivity = at
      } else if (!firstIncomplete) {
        firstIncomplete = stageId
      }
    }

    if (!firstIncomplete) continue // all stages completed but mission not flagged

    const candidate: ResumeMission = {
      missionId,
      currentStageId: firstIncomplete,
      totalStages: stages.length,
      completedStages: completedCount,
      lastActivityAt: lastActivity,
    }

    if (!best || candidate.lastActivityAt > best.lastActivityAt) {
      best = candidate
    }
  }

  return best
}
