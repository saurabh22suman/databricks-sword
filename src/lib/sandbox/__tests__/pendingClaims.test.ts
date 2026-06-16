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
import { drainPendingClaims, enqueuePendingClaim, getPendingClaims } from "../pendingClaims"

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
})