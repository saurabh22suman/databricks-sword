/**
 * @file POST /api/progress/stage
 * @description Claims XP for a completed stage.
 *
 * Authoritative server-side endpoint: looks up the stage's canonical
 * `xpReward` from mission content config (the client cannot inflate it),
 * applies first-try / no-hints bonuses and the server-computed streak
 * multiplier, and writes a row to the `xp_awards` ledger. Idempotent on
 * (userId, "stage", `${missionId}:${stageId}`).
 *
 * Replaces the old snapshot-confirmation flow that trusted the client-side
 * sandbox for XP values.
 */

import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { claimStageXp } from "@/lib/gamification/serverXpService"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const StageClaimSchema = z.object({
  missionId: z.string().min(1),
  stageId: z.string().min(1),
  firstTry: z.boolean().optional(),
  noHints: z.boolean().optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest()
  if (!authResult.authenticated) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const parsed = StageClaimSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const { missionId, stageId, firstTry, noHints } = parsed.data
    const options =
      firstTry !== undefined || noHints !== undefined
        ? { firstTry, noHints }
        : undefined

    const result = await claimStageXp({
      userId: authResult.userId,
      missionId,
      stageId,
      options,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error claiming stage XP:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
