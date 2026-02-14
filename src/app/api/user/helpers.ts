/**
 * @file helpers.ts
 * @description Shared helpers for user API routes.
 * Extracts sandbox data from the sandboxSnapshots table.
 */

import { getDb } from "@/lib/db/client"
import { sandboxSnapshots } from "@/lib/db/schema"
import type { SandboxData } from "@/lib/sandbox/types"
import { SandboxDataSchema } from "@/lib/sandbox/types"
import { desc, eq } from "drizzle-orm"

/**
 * Fetches and parses the latest SandboxData for a given user.
 *
 * @param userId - The authenticated user's ID
 * @returns Parsed SandboxData or null if no snapshot exists
 */
export async function getUserSandbox(userId: string): Promise<SandboxData | null> {
  const snapshots = await getDb()
    .select()
    .from(sandboxSnapshots)
    .where(eq(sandboxSnapshots.userId, userId))
    .orderBy(desc(sandboxSnapshots.updatedAt))
    .limit(1)

  if (snapshots.length === 0) {
    return null
  }

  try {
    const parsed = JSON.parse(snapshots[0].snapshotData)
    return SandboxDataSchema.parse(parsed)
  } catch {
    return null
  }
}
