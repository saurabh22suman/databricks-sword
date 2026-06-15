/**
 * @file POST /api/progress/mission
 * @description Claims XP for completing an entire mission.
 *
 * Authoritative server-side endpoint: looks up the mission's canonical
 * `xpReward` (mission completion bonus) from content config and writes
 * to the `xp_awards` ledger. Idempotent on (userId, "mission", missionId).
 *
 * Replaces the old snapshot-confirmation flow that trusted the client-side
 * sandbox for XP values.
 */

import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { claimMissionXp } from "@/lib/gamification/serverXpService"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const MissionClaimSchema = z.object({
  missionId: z.string().min(1),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest()
  if (!authResult.authenticated) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const parsed = MissionClaimSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const result = await claimMissionXp({
      userId: authResult.userId,
      missionId: parsed.data.missionId,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error claiming mission XP:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
