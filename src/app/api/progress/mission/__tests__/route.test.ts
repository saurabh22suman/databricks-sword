import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockAuthenticate = vi.fn()
const mockClaimMissionXp = vi.fn()

vi.mock("@/lib/auth/api-auth", () => ({
  authenticateApiRequest: (...args: unknown[]) => mockAuthenticate(...args),
}))

vi.mock("@/lib/gamification/serverXpService", () => ({
  claimMissionXp: (...args: unknown[]) => mockClaimMissionXp(...args),
}))

import { POST } from "../route"

const USER_ID = "user-1"
const MISSION_ID = "test-mission"

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/progress/mission", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

describe("POST /api/progress/mission", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    mockAuthenticate.mockResolvedValue({
      authenticated: false,
      error: "Unauthorized",
      status: 401,
    })

    const response = await POST(makeRequest({ missionId: MISSION_ID }))
    expect(response.status).toBe(401)
    expect(mockClaimMissionXp).not.toHaveBeenCalled()
  })

  it("returns 400 when missionId is missing", async () => {
    mockAuthenticate.mockResolvedValue({
      authenticated: true,
      userId: USER_ID,
    })

    const response = await POST(makeRequest({}))
    expect(response.status).toBe(400)
    expect(mockClaimMissionXp).not.toHaveBeenCalled()
  })

  it("calls claimMissionXp with server-validated userId and returns XP", async () => {
    mockAuthenticate.mockResolvedValue({
      authenticated: true,
      userId: USER_ID,
    })
    mockClaimMissionXp.mockResolvedValue({ xpAwarded: 250, alreadyAwarded: false })

    const response = await POST(makeRequest({ missionId: MISSION_ID }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ xpAwarded: 250, alreadyAwarded: false })
    expect(mockClaimMissionXp).toHaveBeenCalledWith({
      userId: USER_ID,
      missionId: MISSION_ID,
    })
  })

  it("returns alreadyAwarded=true on duplicate mission claim", async () => {
    mockAuthenticate.mockResolvedValue({
      authenticated: true,
      userId: USER_ID,
    })
    mockClaimMissionXp.mockResolvedValue({ xpAwarded: 0, alreadyAwarded: true })

    const response = await POST(makeRequest({ missionId: MISSION_ID }))
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data).toEqual({ xpAwarded: 0, alreadyAwarded: true })
  })
})
