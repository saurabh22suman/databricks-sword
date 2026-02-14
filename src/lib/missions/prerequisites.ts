/**
 * @file prerequisites.ts
 * @description Mission prerequisite checking and dependency graph management
 */

import { getAllMissions } from "./loader"
import type { Mission } from "./types"

/**
 * Result of prerequisite check
 */
export type PrerequisiteCheckResult = {
  met: boolean
  missing: string[]
}

/**
 * Check if a mission's prerequisites are met
 * @param missionId - The mission to check
 * @param completedMissions - List of completed mission IDs
 * @returns Whether prerequisites are met and list of missing missions
 */
export async function checkPrerequisites(
  missionId: string,
  completedMissions: string[],
): Promise<PrerequisiteCheckResult> {
  const allMissions = await getAllMissions()
  const mission = allMissions.find((m: Mission) => m.id === missionId)

  if (!mission) {
    throw new Error(`Mission not found: ${missionId}`)
  }

  // If no prerequisites, always met
  if (!mission.prerequisites || mission.prerequisites.length === 0) {
    return { met: true, missing: [] }
  }

  // Check which prerequisites are missing
  const missing = mission.prerequisites.filter(
    (prereqId: string) => !completedMissions.includes(prereqId),
  )

  return {
    met: missing.length === 0,
    missing,
  }
}

/**
 * Get the full dependency chain for a mission (all transitive prerequisites)
 * @param missionId - The mission to check
 * @param visited - Set of already visited missions (for circular dependency detection)
 * @returns Array of all prerequisite mission IDs
 */
export async function getPrerequisiteChain(
  missionId: string,
  visited: Set<string> = new Set(),
): Promise<string[]> {
  // Detect circular dependency
  if (visited.has(missionId)) {
    throw new Error(
      `Circular dependency detected in prerequisite chain for mission: ${missionId}`,
    )
  }

  visited.add(missionId)

  const allMissions = await getAllMissions()
  const mission = allMissions.find((m: Mission) => m.id === missionId)

  if (!mission) {
    throw new Error(`Mission not found: ${missionId}`)
  }

  // If no prerequisites, return empty array
  if (!mission.prerequisites || mission.prerequisites.length === 0) {
    return []
  }

  // Get all direct prerequisites
  const chain: string[] = [...mission.prerequisites]

  // Recursively get prerequisites of prerequisites
  for (const prereqId of mission.prerequisites) {
    const nestedChain = await getPrerequisiteChain(prereqId, new Set(visited))
    chain.push(...nestedChain)
  }

  // Remove duplicates and return
  return Array.from(new Set(chain))
}

/**
 * Get topologically sorted list of all missions
 * Missions with no prerequisites come first, followed by missions that depend on them
 * @returns Array of mission IDs in valid build order
 */
export async function getMissionOrder(): Promise<string[]> {
  const allMissions = await getAllMissions()
  const sorted: string[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()

  /**
   * Depth-first search for topological sort
   */
  function visit(mission: Mission): void {
    if (visited.has(mission.id)) {
      return
    }

    // Detect circular dependency
    if (visiting.has(mission.id)) {
      throw new Error(
        `Circular dependency detected in mission prerequisites: ${mission.id}`,
      )
    }

    visiting.add(mission.id)

    // Visit all prerequisites first
    for (const prereqId of mission.prerequisites || []) {
      const prereqMission = allMissions.find((m: Mission) => m.id === prereqId)
      if (prereqMission) {
        visit(prereqMission)
      }
    }

    visiting.delete(mission.id)
    visited.add(mission.id)
    sorted.push(mission.id)
  }

  // Visit all missions
  for (const mission of allMissions) {
    visit(mission)
  }

  return sorted
}
