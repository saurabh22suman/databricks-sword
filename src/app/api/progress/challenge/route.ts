/**
 * @file POST /api/progress/challenge
 * @description Confirms challenge completion from the server-side snapshot.
 */

import { getUserSandbox } from "@/app/api/user/helpers"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const ChallengeCompleteSchema = z.object({
  challengeId: z.string().min(1),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest()
  if (!authResult.authenticated) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const parsed = ChallengeCompleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const { challengeId } = parsed.data
    const sandbox = await getUserSandbox(authResult.userId)

    if (!sandbox) {
      return NextResponse.json({ error: "No progress data found" }, { status: 404 })
    }

    const challengeResult = sandbox.challengeResults[challengeId]

    return NextResponse.json({
      confirmed: !!challengeResult?.completed,
      xpEarned: challengeResult?.xpEarned ?? 0,
      attempts: challengeResult?.attempts ?? 0,
      totalXp: sandbox.userStats.totalXp,
    })
  } catch (error) {
    console.error("Error confirming challenge progress:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
