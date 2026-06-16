import { beforeEach, describe, expect, it, vi } from "vitest"
import { initializeSandbox } from "../storage"
import type { PendingClaim } from "../types"

vi.mock("../storage", async () => {
  const actual = await vi.importActual("../storage")
  return {
    ...actual,
    loadSandbox: vi.fn(),
    updateSandbox: vi.fn(),
  }
})

import { loadSandbox, updateSandbox } from "../storage"
import {
  MAX_PENDING_CLAIMS,
  drainPendingClaims,
  enqueuePendingClaim,
  getPendingClaims,
} from "../pendingClaims"

describe("pendingClaims", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("enqueuePendingClaim", () => {
    it("appends a claim to the queue in the sandbox", () => {
      const sandbox = initializeSandbox()
      vi.mocked(loadSandbox).mockReturnValue(sandbox)
      vi.mocked(updateSandbox).mockImplementation((updater) => {
        const next = updater(sandbox)
        vi.mocked(loadSandbox).mockReturnValue(next)
      })

      enqueuePendingClaim({
        type: "stage",
        missionId: "m1",
        stageId: "01-briefing",
        attempts: 1,
        hintsUsed: 0,
        queuedAt: "2026-06-16T00:00:00Z",
      })

      expect(updateSandbox).toHaveBeenCalled()
      const queue = getPendingClaims()
      expect(queue).toHaveLength(1)
      expect(queue[0].type).toBe("stage")
    })
  })

  describe("drainPendingClaims", () => {
    it("returns { drained: 0, failed: 0 } when queue is empty", async () => {
      vi.mocked(loadSandbox).mockReturnValue(initializeSandbox())
      const result = await drainPendingClaims()
      expect(result).toEqual({ drained: 0, failed: 0 })
    })

    it("removes a claim from the queue on successful server response", async () => {
      const sandbox = initializeSandbox()
      sandbox.pendingClaims = [
        {
          type: "mission",
          missionId: "m1",
          queuedAt: "2026-06-16T00:00:00Z",
        },
      ]
      vi.mocked(loadSandbox).mockReturnValue(sandbox)
      vi.mocked(updateSandbox).mockImplementation((updater) => {
        const next = updater(sandbox)
        vi.mocked(loadSandbox).mockReturnValue(next)
      })

      // Mock successful claim
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ xpAwarded: 200, alreadyAwarded: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ))

      const result = await drainPendingClaims()
      expect(result.drained).toBe(1)
      expect(result.failed).toBe(0)
      expect(getPendingClaims()).toHaveLength(0)
    })

    it("keeps a claim in the queue on network failure", async () => {
      const sandbox = initializeSandbox()
      sandbox.pendingClaims = [
        {
          type: "mission",
          missionId: "m1",
          queuedAt: "2026-06-16T00:00:00Z",
        },
      ]
      vi.mocked(loadSandbox).mockReturnValue(sandbox)
      vi.mocked(updateSandbox).mockImplementation((updater) => {
        const next = updater(sandbox)
        vi.mocked(loadSandbox).mockReturnValue(next)
      })

      // Mock network failure
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")))

      const result = await drainPendingClaims()
      expect(result.drained).toBe(0)
      expect(result.failed).toBe(1)
      expect(getPendingClaims()).toHaveLength(1)
    })

    it("keeps a claim in the queue on non-2xx response", async () => {
      const sandbox = initializeSandbox()
      sandbox.pendingClaims = [
        {
          type: "mission",
          missionId: "m1",
          queuedAt: "2026-06-16T00:00:00Z",
        },
      ]
      vi.mocked(loadSandbox).mockReturnValue(sandbox)

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
        new Response("server error", { status: 500 }),
      ))

      const result = await drainPendingClaims()
      expect(result.drained).toBe(0)
      expect(result.failed).toBe(1)
      expect(getPendingClaims()).toHaveLength(1)
    })
  })

  describe("MAX_PENDING_CLAIMS", () => {
    it("exports MAX_PENDING_CLAIMS with value 50", () => {
      expect(MAX_PENDING_CLAIMS).toBe(50)
    })
  })

  describe("enqueuePendingClaim graceful degradation", () => {
    it("does not throw when updateSandbox throws (graceful degradation)", () => {
      const sandbox = initializeSandbox()
      vi.mocked(loadSandbox).mockReturnValue(sandbox)
      vi.mocked(updateSandbox).mockImplementation(() => {
        throw new Error("QuotaExceededError")
      })

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      expect(() => {
        enqueuePendingClaim({
          type: "mission",
          missionId: "m1",
          queuedAt: "2026-06-16T00:00:00Z",
        })
      }).not.toThrow()

      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it("warns with error details when storage throws", () => {
      const sandbox = initializeSandbox()
      vi.mocked(loadSandbox).mockReturnValue(sandbox)
      vi.mocked(updateSandbox).mockImplementation(() => {
        throw new Error("quota exceeded")
      })

      const warnSpy = vi.spyOn(console, "warn")

      enqueuePendingClaim({
        type: "mission",
        missionId: "m1",
        queuedAt: "2026-06-16T00:00:00Z",
      })

      expect(warnSpy).toHaveBeenCalled()
      // The warning should mention the error - verify at least one call includes error info
      const warnCall = warnSpy.mock.calls.flat()
      expect(warnCall.some((arg) => String(arg).includes("quota exceeded"))).toBe(true)
    })

    it("still enqueues successfully on the happy path", () => {
      const sandbox = initializeSandbox()
      vi.mocked(loadSandbox).mockReturnValue(sandbox)
      vi.mocked(updateSandbox).mockImplementation((updater) => {
        const next = updater(sandbox)
        vi.mocked(loadSandbox).mockReturnValue(next)
      })

      enqueuePendingClaim({
        type: "mission",
        missionId: "m1",
        queuedAt: "2026-06-16T00:00:00Z",
      })

      const queue = getPendingClaims()
      expect(queue).toHaveLength(1)
      expect((queue[0] as { missionId: string }).missionId).toBe("m1")
    })
  })

  describe("enqueuePendingClaim FIFO eviction", () => {
    it("evicts the oldest claim when the queue is at capacity", () => {
      const sandbox = initializeSandbox()
      // Fill the queue with MAX_PENDING_CLAIMS claims (each with distinct queuedAt)
      sandbox.pendingClaims = Array.from({ length: MAX_PENDING_CLAIMS }, (_, i) => ({
        type: "stage" as const,
        missionId: `m${i}`,
        stageId: "01-briefing",
        attempts: 1,
        hintsUsed: 0,
        queuedAt: `2026-06-16T00:0${i.toString().padStart(2, "0")}:00Z`,
      }))
      vi.mocked(loadSandbox).mockReturnValue(sandbox)
      vi.mocked(updateSandbox).mockImplementation((updater) => {
        const next = updater(sandbox)
        vi.mocked(loadSandbox).mockReturnValue(next)
      })

      // Enqueue a new claim
      enqueuePendingClaim({
        type: "stage",
        missionId: "m-new",
        stageId: "02-action",
        attempts: 1,
        hintsUsed: 0,
        queuedAt: "2026-06-16T00:59:00Z",
      })

      const queue = getPendingClaims()
      // Queue should be at exactly MAX_PENDING_CLAIMS
      expect(queue).toHaveLength(MAX_PENDING_CLAIMS)
      // The NEWEST claim should be present (cast to stage type since we control the test data)
      expect((queue[MAX_PENDING_CLAIMS - 1] as { missionId: string }).missionId).toBe("m-new")
      // The OLDEST claim should NOT be present (it was evicted)
      expect((queue[0] as { missionId: string }).missionId).not.toBe("m0")
    })

    it("does not evict when the queue is below capacity", () => {
      const sandbox = initializeSandbox()
      // Fill the queue with MAX_PENDING_CLAIMS - 1 claims
      sandbox.pendingClaims = Array.from({ length: MAX_PENDING_CLAIMS - 1 }, (_, i) => ({
        type: "stage" as const,
        missionId: `m${i}`,
        stageId: "01-briefing",
        attempts: 1,
        hintsUsed: 0,
        queuedAt: `2026-06-16T00:0${i.toString().padStart(2, "0")}:00Z`,
      }))
      vi.mocked(loadSandbox).mockReturnValue(sandbox)
      vi.mocked(updateSandbox).mockImplementation((updater) => {
        const next = updater(sandbox)
        vi.mocked(loadSandbox).mockReturnValue(next)
      })

      // Enqueue a new claim
      enqueuePendingClaim({
        type: "stage",
        missionId: "m-new",
        stageId: "02-action",
        attempts: 1,
        hintsUsed: 0,
        queuedAt: "2026-06-16T00:59:00Z",
      })

      const queue = getPendingClaims()
      // Queue should have grown to MAX_PENDING_CLAIMS
      expect(queue).toHaveLength(MAX_PENDING_CLAIMS)
      // The oldest claim (m0) should still be present (cast to stage type since we control the test data)
      expect((queue[0] as { missionId: string }).missionId).toBe("m0")
    })

    it("evicts multiple oldest claims when many enqueues happen past capacity", () => {
      const sandbox = initializeSandbox()
      // Start with an empty queue and do MAX_PENDING_CLAIMS + 5 enqueues
      sandbox.pendingClaims = []
      vi.mocked(loadSandbox).mockReturnValue(sandbox)
      vi.mocked(updateSandbox).mockImplementation((updater) => {
        const next = updater(sandbox)
        vi.mocked(loadSandbox).mockReturnValue(next)
        sandbox.pendingClaims = next.pendingClaims
      })

      // Enqueue MAX_PENDING_CLAIMS + 5 claims
      for (let i = 0; i < MAX_PENDING_CLAIMS + 5; i++) {
        enqueuePendingClaim({
          type: "stage" as const,
          missionId: `m${i}`,
          stageId: "01-briefing",
          attempts: 1,
          hintsUsed: 0,
          queuedAt: `2026-06-16T00:0${i.toString().padStart(2, "0")}:00Z`,
        })
      }

      const queue = getPendingClaims()
      // Queue should be capped at MAX_PENDING_CLAIMS
      expect(queue).toHaveLength(MAX_PENDING_CLAIMS)
      // The first 5 enqueues should NOT be present (they were evicted)
      expect((queue[0] as { missionId: string }).missionId).not.toBe("m0")
      // The last MAX_PENDING_CLAIMS enqueues should be present (cast to stage type since we control the test data)
      expect((queue[0] as { missionId: string }).missionId).toBe("m5")
      expect((queue[MAX_PENDING_CLAIMS - 1] as { missionId: string }).missionId).toBe(`m${MAX_PENDING_CLAIMS + 4}`)
    })
  })
})