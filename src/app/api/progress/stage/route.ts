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
  attempts: z.number().int().nonnegative().optional(),
  hintsUsed: z.number().int().nonnegative().optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest()
  if (!authResult.authenticated) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()

    // Reject legacy keys explicitly
    if ("firstTry" in body || "noHints" in body) {
      return NextResponse.json(
        { error: "Legacy firstTry/noHints keys are no longer supported. Use attempts/hintsUsed." },
        { status: 400 },
      )
    }

    const parsed = StageClaimSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const { missionId, stageId, attempts, hintsUsed } = parsed.data
    const options =
      attempts !== undefined || hintsUsed !== undefined
        ? { attempts, hintsUsed }
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
