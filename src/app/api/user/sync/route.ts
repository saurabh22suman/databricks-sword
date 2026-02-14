import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { getDb } from "@/lib/db/client"
import { sandboxSnapshots } from "@/lib/db/schema"
import { SandboxDataSchema } from "@/lib/sandbox/types"
import { desc, eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/user/sync
 * Syncs browser sandbox data to the database.
 * Requires authentication.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const authResult = await authenticateApiRequest()
  if (!authResult.authenticated) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    // Parse and validate request body
    const body = await request.json()
    const validationResult = SandboxDataSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({ error: "Invalid sandbox data" }, { status: 400 })
    }

    const sandboxData = validationResult.data
    const userId = authResult.userId

    // Upsert sandbox snapshot
    await getDb()
      .insert(sandboxSnapshots)
      .values({
        id: nanoid(),
        userId,
        snapshotData: JSON.stringify(sandboxData),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: sandboxSnapshots.userId,
        set: {
          snapshotData: JSON.stringify(sandboxData),
          updatedAt: new Date(),
        },
      })

    const lastSynced = new Date().toISOString()

    return NextResponse.json(
      { success: true, lastSynced } satisfies { success: boolean; lastSynced: string },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error syncing sandbox data:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/user/sync
 * Retrieves the latest sandbox snapshot for the authenticated user.
 * Requires authentication.
 * Returns null if no snapshot exists.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const authResult = await authenticateApiRequest()
  if (!authResult.authenticated) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const userId = authResult.userId

    // Fetch latest snapshot
    const snapshots = await getDb()
      .select()
      .from(sandboxSnapshots)
      .where(eq(sandboxSnapshots.userId, userId))
      .orderBy(desc(sandboxSnapshots.updatedAt))
      .limit(1)

    if (snapshots.length === 0) {
      return NextResponse.json(null, { status: 200 })
    }

    const snapshot = snapshots[0]
    const sandboxData = JSON.parse(snapshot.snapshotData)

    return NextResponse.json(sandboxData, { status: 200 })
  } catch (error) {
    console.error("Error fetching sandbox data:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
