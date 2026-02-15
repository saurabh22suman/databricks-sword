/**
 * @file /api/stats
 * @description Returns public stats like user count for the landing page.
 */

import { getDb, users } from "@/lib/db"
import { sql } from "drizzle-orm"
import { NextResponse } from "next/server"

/**
 * GET /api/stats
 * Returns public site stats.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const db = getDb()
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)

    const userCount = result[0]?.count ?? 0

    return NextResponse.json({
      userCount,
      // Add 10 to the count for display (base "units deployed")
      unitsDeployed: 10 + userCount,
    })
  } catch (error) {
    console.error("Failed to fetch stats:", error)
    return NextResponse.json({ userCount: 0, unitsDeployed: 10 })
  }
}
