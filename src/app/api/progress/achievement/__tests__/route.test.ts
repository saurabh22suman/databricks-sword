import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the auth helper and the server XP service so the route test does
// not touch the database or filesystem.
const mockAuthenticate = vi.fn()
const mockClaimAchievementXp = vi.fn()

vi.mock("@/lib/auth/api-auth", () => ({
  authenticateApiRequest: (...args: unknown[]) => mockAuthenticate(...args),
}))

vi.mock("@/lib/gamification/serverXpService", () => ({
  claimAchievementXp: (...args: unknown[]) => mockClaimAchievementXp(...args),
}))

import { POST } from "../route"

const USER_ID = "user-1"
const ACHIEVEMENT_ID = "first-blood"

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/progress/achievement", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

describe("POST /api/progress/achievement", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    mockAuthenticate.mockResolvedValue({
      authenticated: false,
      error: "Unauthorized",
      status: 401,
    })

    const response = await POST(makeRequest({ achievementId: ACHIEVEMENT_ID }))
    expect(response.status).toBe(401)
    expect(mockClaimAchievementXp).not.toHaveBeenCalled()
  })

  it("returns 400 when body is invalid", async () => {
    mockAuthenticate.mockResolvedValue({
      authenticated: true,
      userId: USER_ID,
    })

    const response = await POST(makeRequest({}))
    expect(response.status).toBe(400)
    expect(mockClaimAchievementXp).not.toHaveBeenCalled()
  })

  it("calls claimAchievementXp with the server-validated userId", async () => {
    mockAuthenticate.mockResolvedValue({
      authenticated: true,
      userId: USER_ID,
    })
    mockClaimAchievementXp.mockResolvedValue({
      xpAwarded: 75,
      alreadyAwarded: false,
    })

    const response = await POST(
      makeRequest({ achievementId: ACHIEVEMENT_ID }),
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ xpAwarded: 75, alreadyAwarded: false })
    expect(mockClaimAchievementXp).toHaveBeenCalledWith({
      userId: USER_ID,
      achievementId: ACHIEVEMENT_ID,
    })
  })

  it("returns 200 with alreadyAwarded=true on duplicate claim (idempotent)", async () => {
    mockAuthenticate.mockResolvedValue({
      authenticated: true,
      userId: USER_ID,
    })
    mockClaimAchievementXp.mockResolvedValue({ xpAwarded: 0, alreadyAwarded: true })

    const response = await POST(
      makeRequest({ achievementId: ACHIEVEMENT_ID }),
    )
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data).toEqual({ xpAwarded: 0, alreadyAwarded: true })
  })

  it("returns 500 when the service throws", async () => {
    mockAuthenticate.mockResolvedValue({
      authenticated: true,
      userId: USER_ID,
    })
    mockClaimAchievementXp.mockRejectedValue(new Error("DB down"))

    const response = await POST(
      makeRequest({ achievementId: ACHIEVEMENT_ID }),
    )
    expect(response.status).toBe(500)
  })
})