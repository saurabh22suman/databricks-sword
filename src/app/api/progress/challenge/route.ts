/**
 * @file POST /api/progress/challenge
 * @description Claims XP for completing a standalone challenge.
 *
 * Authoritative server-side endpoint: looks up the challenge's canonical
 * `xpReward` from content config and writes to the `xp_awards` ledger.
 * Idempotent on (userId, "challenge", challengeId).
 *
 * Replaces the old snapshot-confirmation flow that trusted the client-side
 * sandbox for XP values.
 */

import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { claimChallengeXp } from "@/lib/gamification/serverXpService"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const ChallengeClaimSchema = z.object({
  challengeId: z.string().min(1),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest()
  if (!authResult.authenticated) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const parsed = ChallengeClaimSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const result = await claimChallengeXp({
      userId: authResult.userId,
      challengeId: parsed.data.challengeId,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error claiming challenge XP:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
