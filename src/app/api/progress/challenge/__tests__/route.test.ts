import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockAuthenticate = vi.fn()
const mockClaimChallengeXp = vi.fn()

vi.mock("@/lib/auth/api-auth", () => ({
  authenticateApiRequest: (...args: unknown[]) => mockAuthenticate(...args),
}))

vi.mock("@/lib/gamification/serverXpService", () => ({
  claimChallengeXp: (...args: unknown[]) => mockClaimChallengeXp(...args),
}))

import { POST } from "../route"

const USER_ID = "user-1"
const CHALLENGE_ID = "test-challenge-1"

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/progress/challenge", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

describe("POST /api/progress/challenge", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    mockAuthenticate.mockResolvedValue({
      authenticated: false,
      error: "Unauthorized",
      status: 401,
    })

    const response = await POST(makeRequest({ challengeId: CHALLENGE_ID }))
    expect(response.status).toBe(401)
    expect(mockClaimChallengeXp).not.toHaveBeenCalled()
  })

  it("returns 400 when challengeId is missing", async () => {
    mockAuthenticate.mockResolvedValue({
      authenticated: true,
      userId: USER_ID,
    })

    const response = await POST(makeRequest({}))
    expect(response.status).toBe(400)
    expect(mockClaimChallengeXp).not.toHaveBeenCalled()
  })

  it("calls claimChallengeXp with server-validated userId and returns XP", async () => {
    mockAuthenticate.mockResolvedValue({
      authenticated: true,
      userId: USER_ID,
    })
    mockClaimChallengeXp.mockResolvedValue({ xpAwarded: 75, alreadyAwarded: false })

    const response = await POST(makeRequest({ challengeId: CHALLENGE_ID }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ xpAwarded: 75, alreadyAwarded: false })
    expect(mockClaimChallengeXp).toHaveBeenCalledWith({
      userId: USER_ID,
      challengeId: CHALLENGE_ID,
    })
  })

  it("returns alreadyAwarded=true on duplicate challenge claim", async () => {
    mockAuthenticate.mockResolvedValue({
      authenticated: true,
      userId: USER_ID,
    })
    mockClaimChallengeXp.mockResolvedValue({ xpAwarded: 0, alreadyAwarded: true })

    const response = await POST(makeRequest({ challengeId: CHALLENGE_ID }))
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data).toEqual({ xpAwarded: 0, alreadyAwarded: true })
  })
})
