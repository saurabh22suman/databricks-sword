import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { getDb } from "@/lib/db/client"
import { sandboxSnapshots } from "@/lib/db/schema"
import { desc, eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/user/sync/status
 *
 * Cheap since-check for hybrid pull strategy. Returns whether the server has a newer
 * snapshot than the client's last sync time.
 *
 * Query params:
 * - since (optional): ISO timestamp to compare against
 *
 * Returns:
 * - 200: { updated: boolean, updatedAt: string | null }
 * - 400: { error: "Invalid 'since' parameter" }
 * - 401: { error: "Unauthorized" }
 * - 500: { error: "Internal server error" }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const authResult = await authenticateApiRequest()
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    )
  }

  try {
    const userId = authResult.userId

    // Parse optional 'since' query parameter
    const sinceParam = request.nextUrl.searchParams.get("since")
    let since: Date | null = null

    if (sinceParam) {
      since = new Date(sinceParam)
      if (isNaN(since.getTime())) {
        return NextResponse.json(
          { error: "Invalid 'since' parameter" },
          { status: 400 },
        )
      }
    }

    // Fetch latest snapshot for the user
    const snapshots = await getDb()
      .select()
      .from(sandboxSnapshots)
      .where(eq(sandboxSnapshots.userId, userId))
      .orderBy(desc(sandboxSnapshots.updatedAt))
      .limit(1)

    // No snapshot exists
    if (snapshots.length === 0) {
      return NextResponse.json(
        { updated: false, updatedAt: null },
        { status: 200 },
      )
    }

    const snapshot = snapshots[0]
    const updatedAt = snapshot.updatedAt

    // No since provided - caller wants to know "do you have anything?"
    if (!since) {
      return NextResponse.json(
        { updated: true, updatedAt: updatedAt.toISOString() },
        { status: 200 },
      )
    }

    // Compare snapshot's updatedAt to since
    const isUpdated = updatedAt.getTime() > since.getTime()

    return NextResponse.json(
      { updated: isUpdated, updatedAt: updatedAt.toISOString() },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error checking sync status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}