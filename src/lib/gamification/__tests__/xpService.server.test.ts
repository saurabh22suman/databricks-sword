import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SandboxData } from "../../sandbox/types"

// Mock sandbox storage so the service can mutate state without touching real localStorage.
vi.mock("../../sandbox/storage", async () => {
  const actual = await vi.importActual("../../sandbox/storage")
  return {
    ...actual,
    loadSandbox: vi.fn(),
    saveSandbox: vi.fn(),
    updateSandbox: vi.fn(),
  }
})

// Capture emitted XP events for assertions.
const emittedEvents: unknown[] = []
vi.mock("../xpEventBus", () => ({
  emitXpEvent: (event: unknown) => {
    emittedEvents.push(event)
  },
}))

import { loadSandbox, saveSandbox, updateSandbox } from "../../sandbox/storage"
import { initializeSandbox } from "../../sandbox/storage"
import { awardChallengeXp, awardMissionXp, awardStageXp } from "../xpService"

const MISSION_ID = "test-mission"
const STAGE_ID = "01-briefing"
const CHALLENGE_ID = "test-challenge-1"

function mockFetchResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

function mockFetchOnce(response: Response) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response))
}

function mockFetchTwice(response1: Response, response2: Response) {
  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce(response1)
    .mockResolvedValueOnce(response2))
}

describe("xpService — server-first", () => {
  let sandbox: SandboxData

  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    emittedEvents.length = 0
    sandbox = initializeSandbox()
    vi.mocked(loadSandbox).mockReturnValue(sandbox)
    vi.mocked(updateSandbox).mockImplementation((updater) => {
      sandbox = updater(sandbox)
      vi.mocked(loadSandbox).mockReturnValue(sandbox)
      vi.mocked(saveSandbox).mockImplementation(() => {})
      saveSandbox(sandbox)
    })
  })

  describe("awardStageXp", () => {
    it("POSTs to /api/progress/stage with the claim payload", async () => {
      mockFetchOnce(
        mockFetchResponse({ xpAwarded: 100, alreadyAwarded: false }),
      )

      await awardStageXp(MISSION_ID, STAGE_ID, 50, {
        firstTry: true,
        noHints: true,
      })

      const fetchMock = vi.mocked(global.fetch)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe("/api/progress/stage")
      expect(init?.method).toBe("POST")
      const body = JSON.parse((init?.body as string) ?? "{}")
      expect(body).toEqual({
        missionId: MISSION_ID,
        stageId: STAGE_ID,
        firstTry: true,
        noHints: true,
      })
    })

    it("uses the server-returned XP amount for the emitted XpEvent", async () => {
      mockFetchOnce(
        mockFetchResponse({ xpAwarded: 250, alreadyAwarded: false }),
      )

      const event = await awardStageXp(MISSION_ID, STAGE_ID, 50)

      expect(event.amount).toBe(250)
      expect(event.type).toBe("stage")
      expect(event.source).toBe(`${MISSION_ID}/${STAGE_ID}`)
    })

    it("emits an XpEvent when the server confirms a new award", async () => {
      mockFetchOnce(
        mockFetchResponse({ xpAwarded: 100, alreadyAwarded: false }),
      )

      await awardStageXp(MISSION_ID, STAGE_ID, 50)

      expect(emittedEvents).toHaveLength(1)
    })

    it("does NOT emit an XpEvent when the server says alreadyAwarded=true", async () => {
      mockFetchOnce(
        mockFetchResponse({ xpAwarded: 0, alreadyAwarded: true }),
      )

      await awardStageXp(MISSION_ID, STAGE_ID, 50)

      expect(emittedEvents).toHaveLength(0)
    })

    it("falls back to local XP computation when fetch throws (offline mode)", async () => {
      // Network error
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValueOnce(new Error("network down")),
      )

      const event = await awardStageXp(MISSION_ID, STAGE_ID, 50)

      // Local fallback: base 50 * 1.0x multiplier = 50
      expect(event.amount).toBe(50)
      expect(event.multiplier).toBe(1.0)
    })

    it("falls back to local XP computation when the server returns 5xx", async () => {
      mockFetchOnce(mockFetchResponse({}, false, 500))

      const event = await awardStageXp(MISSION_ID, STAGE_ID, 50)

      // Local fallback: 50 * 1.0x = 50
      expect(event.amount).toBe(50)
    })

    it("updates the local sandbox totalXp to match the server-computed amount", async () => {
      mockFetchOnce(
        mockFetchResponse({ xpAwarded: 250, alreadyAwarded: false }),
      )

      await awardStageXp(MISSION_ID, STAGE_ID, 50)

      expect(sandbox.userStats.totalXp).toBe(250)
      expect(
        sandbox.missionProgress[MISSION_ID]?.stageProgress[STAGE_ID]?.xpEarned,
      ).toBe(250)
    })
  })

  describe("awardMissionXp", () => {
    it("POSTs to /api/progress/mission and uses the server XP", async () => {
      // First call for mission claim, second for achievement claim (first-blood)
      mockFetchTwice(
        mockFetchResponse({ xpAwarded: 300, alreadyAwarded: false }),
        mockFetchResponse({ xpAwarded: 75, alreadyAwarded: false }),
      )

      const event = await awardMissionXp(MISSION_ID, 250)

      const fetchMock = vi.mocked(global.fetch)
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(fetchMock.mock.calls[0][0]).toBe("/api/progress/mission")
      expect(event.amount).toBe(300)
    })

    it("marks the mission as completed in the local sandbox", async () => {
      mockFetchOnce(
        mockFetchResponse({ xpAwarded: 300, alreadyAwarded: false }),
      )

      await awardMissionXp(MISSION_ID, 250)

      expect(sandbox.missionProgress[MISSION_ID]?.completed).toBe(true)
    })
  })

  describe("awardChallengeXp", () => {
    it("POSTs to /api/progress/challenge and uses the server XP", async () => {
      // First call for challenge claim, second for achievement claim (getting-started)
      mockFetchTwice(
        mockFetchResponse({ xpAwarded: 75, alreadyAwarded: false }),
        mockFetchResponse({ xpAwarded: 35, alreadyAwarded: false }),
      )

      const event = await awardChallengeXp(CHALLENGE_ID, 50)

      const fetchMock = vi.mocked(global.fetch)
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(fetchMock.mock.calls[0][0]).toBe("/api/progress/challenge")
      expect(event.amount).toBe(75)
    })

    it("records the challenge as completed in the local sandbox", async () => {
      mockFetchOnce(
        mockFetchResponse({ xpAwarded: 75, alreadyAwarded: false }),
      )

      await awardChallengeXp(CHALLENGE_ID, 50)

      expect(sandbox.challengeResults[CHALLENGE_ID]?.completed).toBe(true)
    })
  })
})
