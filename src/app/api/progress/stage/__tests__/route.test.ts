import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the auth helper and the server XP service so the route test does
// not touch the database or filesystem.
const mockAuthenticate = vi.fn()
const mockClaimStageXp = vi.fn()

vi.mock("@/lib/auth/api-auth", () => ({
  authenticateApiRequest: (...args: unknown[]) => mockAuthenticate(...args),
}))

vi.mock("@/lib/gamification/serverXpService", () => ({
  claimStageXp: (...args: unknown[]) => mockClaimStageXp(...args),
}))

import { POST } from "../route"

const USER_ID = "user-1"
const MISSION_ID = "test-mission"
const STAGE_ID = "01-briefing"

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/progress/stage", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

describe("POST /api/progress/stage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    mockAuthenticate.mockResolvedValue({
      authenticated: false,
      error: "Unauthorized",
      status: 401,
    })

    const response = await POST(makeRequest({ missionId: MISSION_ID, stageId: STAGE_ID }))
    expect(response.status).toBe(401)
    expect(mockClaimStageXp).not.toHaveBeenCalled()
  })

  it("returns 400 when body is invalid", async () => {
    mockAuthenticate.mockResolvedValue({
      authenticated: true,
      userId: USER_ID,
    })

    const response = await POST(makeRequest({ missionId: MISSION_ID }))
    expect(response.status).toBe(400)
    expect(mockClaimStageXp).not.toHaveBeenCalled()
  })

  it("calls claimStageXp with the server-validated userId (not the body)", async () => {
    mockAuthenticate.mockResolvedValue({
      authenticated: true,
      userId: USER_ID,
    })
    mockClaimStageXp.mockResolvedValue({ xpAwarded: 100, alreadyAwarded: false })

    const response = await POST(
      makeRequest({ missionId: MISSION_ID, stageId: STAGE_ID }),
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ xpAwarded: 100, alreadyAwarded: false })
    // The userId passed to the service comes from the session, not the body
    expect(mockClaimStageXp).toHaveBeenCalledWith({
      userId: USER_ID,
      missionId: MISSION_ID,
      stageId: STAGE_ID,
      options: undefined,
    })
  })

  it("forwards attempts/hintsUsed options to the service", async () => {
    mockAuthenticate.mockResolvedValue({
      authenticated: true,
      userId: USER_ID,
    })
    mockClaimStageXp.mockResolvedValue({ xpAwarded: 165, alreadyAwarded: false })

    const response = await POST(
      makeRequest({
        missionId: MISSION_ID,
        stageId: STAGE_ID,
        attempts: 1,
        hintsUsed: 0,
      }),
    )
    expect(response.status).toBe(200)
    expect(mockClaimStageXp).toHaveBeenCalledWith({
      userId: USER_ID,
      missionId: MISSION_ID,
      stageId: STAGE_ID,
      options: { attempts: 1, hintsUsed: 0 },
    })
  })

  it("returns 400 when body uses legacy firstTry/noHints flags", async () => {
    mockAuthenticate.mockResolvedValue({ authenticated: true, userId: USER_ID })
    mockClaimStageXp.mockResolvedValue({ xpAwarded: 50, alreadyAwarded: false })
    const response = await POST(
      makeRequest({ missionId: MISSION_ID, stageId: STAGE_ID, firstTry: true }),
    )
    // Legacy keys are rejected - the API contract has changed
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain("firstTry")
    expect(mockClaimStageXp).not.toHaveBeenCalled()
  })

  it("accepts new body shape with attempts and hintsUsed", async () => {
    mockAuthenticate.mockResolvedValue({ authenticated: true, userId: USER_ID })
    mockClaimStageXp.mockResolvedValue({ xpAwarded: 100, alreadyAwarded: false })
    const response = await POST(
      makeRequest({
        missionId: MISSION_ID,
        stageId: STAGE_ID,
        attempts: 1,
        hintsUsed: 0,
      }),
    )
    expect(response.status).toBe(200)
    expect(mockClaimStageXp).toHaveBeenCalledWith({
      userId: USER_ID,
      missionId: MISSION_ID,
      stageId: STAGE_ID,
      options: { attempts: 1, hintsUsed: 0 },
    })
  })

  it("returns 200 with alreadyAwarded=true on duplicate claim (idempotent)", async () => {
    mockAuthenticate.mockResolvedValue({
      authenticated: true,
      userId: USER_ID,
    })
    mockClaimStageXp.mockResolvedValue({ xpAwarded: 0, alreadyAwarded: true })

    const response = await POST(
      makeRequest({ missionId: MISSION_ID, stageId: STAGE_ID }),
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
    mockClaimStageXp.mockRejectedValue(new Error("DB unavailable"))

    const response = await POST(
      makeRequest({ missionId: MISSION_ID, stageId: STAGE_ID }),
    )
    expect(response.status).toBe(500)
  })
})
