/**
 * @file serverHelpers.ts
 * @description Server-side helpers for mission data from DB sandbox snapshots.
 */

import { getUserSandbox } from "@/app/api/user/helpers"
import { auth } from "@/lib/auth/auth"
import { isMockAuth, MOCK_SESSION } from "@/lib/auth/mockSession"

/**
 * Gets the list of completed mission IDs for the current user.
 * Reads from the server-side sandbox snapshot in the DB.
 *
 * @returns Array of completed mission ID strings, or empty array if no user/snapshot
 */
export async function getUserCompletedMissions(): Promise<string[]> {
  try {
    let userId: string | undefined

    if (isMockAuth) {
      userId = MOCK_SESSION.user?.id
    } else {
      const session = await auth()
      userId = session?.user?.id
    }

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
