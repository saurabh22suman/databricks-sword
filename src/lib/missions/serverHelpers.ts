/**
 * @file serverHelpers.ts
 * @description Server-side helpers for mission data from DB sandbox snapshots.
 */

import { getUserSandbox } from "@/app/api/user/helpers"
import { auth } from "@/lib/auth/auth"
import { isMockAuth, MOCK_SESSION } from "@/lib/auth/mockSession"
import { getAllMissions } from "./loader"

/**
 * Gets the list of completed mission IDs for the current user.
 * Reads from the server-side sandbox snapshot in the DB.
 *
 * When MOCK_AUTH is enabled, returns all mission IDs to bypass
 * prerequisite checks for testing purposes.
 *
 * @returns Array of completed mission ID strings, or empty array if no user/snapshot
 */
export async function getUserCompletedMissions(): Promise<string[]> {
  try {
    // In mock mode, return all missions as "completed" to skip prerequisites
    if (isMockAuth) {
      const allMissions = await getAllMissions()
      return allMissions.map((m) => m.id)
    }

    const session = await auth()
    const userId = session?.user?.id

    if (!userId) {
      return []
    }

    const sandbox = await getUserSandbox(userId)
    if (!sandbox) {
      return []
    }

    // Extract completed mission IDs from sandbox data
    return Object.entries(sandbox.missionProgress)
      .filter(([, progress]) => progress.completed)
      .map(([missionId]) => missionId)
  } catch {
    // Fail gracefully — don't block the page
    return []
  }
}
