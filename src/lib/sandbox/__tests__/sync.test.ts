import { beforeEach, describe, expect, it, vi } from "vitest"
import { initializeSandbox } from "../storage"
import {
    mergeConflicts,
    shouldSync,
    syncFromServer,
    syncToServer,
} from "../sync"
import type { SyncResult } from "../types"

// Mock fetch
global.fetch = vi.fn()

describe("Sandbox Sync", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("syncToServer", () => {
    it("POSTs sandbox data to /api/user/sync", async () => {
      const sandbox = initializeSandbox()
      const mockResponse: SyncResult = {
        success: true,
        lastSynced: "2026-02-12T12:00:00Z",
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await syncToServer("user-123", sandbox)

      expect(fetch).toHaveBeenCalledWith("/api/user/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sandbox),
      })

      expect(result.success).toBe(true)
      expect(result.lastSynced).toBe("2026-02-12T12:00:00Z")
    })

    it("returns success false on network error", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"))

      const result = await syncToServer("user-123", initializeSandbox())

      expect(result.success).toBe(false)
    })

    it("returns success false on HTTP error", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      const result = await syncToServer("user-123", initializeSandbox())

      expect(result.success).toBe(false)
    })

    it("includes conflict data when returned by server", async () => {
      const mockResponse: SyncResult = {
        success: true,
        lastSynced: "2026-02-12T12:00:00Z",
        conflicts: [
          {
            field: "userStats.totalXp",
            localValue: 100,
            remoteValue: 150,
          },
        ],
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await syncToServer("user-123", initializeSandbox())

      expect(result.conflicts).toBeDefined()
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts![0].field).toBe("userStats.totalXp")
    })
  })

  describe("syncFromServer", () => {
    it("GETs sandbox data from /api/user/sync", async () => {
      const remoteSandbox = initializeSandbox()
      remoteSandbox.userStats.totalXp = 500

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => remoteSandbox,
      } as Response)

      const result = await syncFromServer("user-123")

      expect(fetch).toHaveBeenCalledWith("/api/user/sync")

      expect(result).not.toBeNull()
      expect(result!.userStats.totalXp).toBe(500)
    })

    it("returns null on network error", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"))

      const result = await syncFromServer("user-123")

      expect(result).toBeNull()
    })

    it("returns null on HTTP error", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      const result = await syncFromServer("user-123")

      expect(result).toBeNull()
    })

    it("returns null when no sandbox exists on server", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      } as Response)

      const result = await syncFromServer("user-123")

      expect(result).toBeNull()
    })

    it("validates returned sandbox data", async () => {
      const invalidSandbox = { invalid: "data" }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => invalidSandbox,
      } as Response)

      const result = await syncFromServer("user-123")

      // Should return null for invalid data
      expect(result).toBeNull()
    })
  })

  describe("mergeConflicts", () => {
    it("keeps higher totalXp between local and remote", () => {
      const local = initializeSandbox()
      local.userStats.totalXp = 500

      const remote = initializeSandbox()
      remote.userStats.totalXp = 300

      const merged = mergeConflicts(local, remote)

      expect(merged.userStats.totalXp).toBe(500)
    })

    it("keeps higher totalXp when remote has more", () => {
      const local = initializeSandbox()
      local.userStats.totalXp = 200

      const remote = initializeSandbox()
      remote.userStats.totalXp = 400

      const merged = mergeConflicts(local, remote)

      expect(merged.userStats.totalXp).toBe(400)
    })

    it("creates union of achievements", () => {
      const local = initializeSandbox()
      local.achievements = ["first-blood", "mission-clear"]

      const remote = initializeSandbox()
      remote.achievements = ["mission-clear", "perfect-score"]

      const merged = mergeConflicts(local, remote)

      expect(merged.achievements).toContain("first-blood")
      expect(merged.achievements).toContain("mission-clear")
      expect(merged.achievements).toContain("perfect-score")
      expect(merged.achievements).toHaveLength(3)
    })

    it("creates union of completed missions", () => {
      const local = initializeSandbox()
      local.missionProgress = {
        "mission-1": {
          started: true,
          completed: true,
          stageProgress: {},
          sideQuestsCompleted: [],
          totalXpEarned: 300,
          completedAt: "2026-02-11T10:00:00Z",
        },
      }

      const remote = initializeSandbox()
      remote.missionProgress = {
        "mission-2": {
          started: true,
          completed: true,
          stageProgress: {},
          sideQuestsCompleted: [],
          totalXpEarned: 350,
          completedAt: "2026-02-12T10:00:00Z",
        },
      }

      const merged = mergeConflicts(local, remote)

      expect(merged.missionProgress).toHaveProperty("mission-1")
      expect(merged.missionProgress).toHaveProperty("mission-2")
    })

    it("keeps latest completedAt timestamp for same mission", () => {
      const local = initializeSandbox()
      local.missionProgress = {
        "mission-1": {
          started: true,
          completed: true,
          stageProgress: {},
          sideQuestsCompleted: [],
          totalXpEarned: 300,
          completedAt: "2026-02-11T10:00:00Z",
        },
      }

      const remote = initializeSandbox()
      remote.missionProgress = {
        "mission-1": {
          started: true,
          completed: true,
          stageProgress: {},
          sideQuestsCompleted: [],
          totalXpEarned: 300,
          completedAt: "2026-02-12T10:00:00Z",
        },
      }

      const merged = mergeConflicts(local, remote)

      expect(merged.missionProgress["mission-1"].completedAt).toBe(
        "2026-02-12T10:00:00Z",
      )
    })

    it("keeps higher currentStreak", () => {
      const local = initializeSandbox()
      local.streakData.currentStreak = 7

      const remote = initializeSandbox()
      remote.streakData.currentStreak = 5

      const merged = mergeConflicts(local, remote)

      expect(merged.streakData.currentStreak).toBe(7)
    })

    it("keeps higher longestStreak", () => {
      const local = initializeSandbox()
      local.streakData.longestStreak = 10

      const remote = initializeSandbox()
      remote.streakData.longestStreak = 15

      const merged = mergeConflicts(local, remote)

      expect(merged.streakData.longestStreak).toBe(15)
    })

    it("uses latest lastSynced timestamp", () => {
      const local = initializeSandbox()
      local.lastSynced = "2026-02-11T10:00:00Z"

      const remote = initializeSandbox()
      remote.lastSynced = "2026-02-12T10:00:00Z"

      const merged = mergeConflicts(local, remote)

      expect(merged.lastSynced).toBe("2026-02-12T10:00:00Z")
    })

    it("sums totalMissionsCompleted correctly", () => {
      const local = initializeSandbox()
      local.userStats.totalMissionsCompleted = 3

      const remote = initializeSandbox()
      remote.userStats.totalMissionsCompleted = 2

      const merged = mergeConflicts(local, remote)

      // Should keep max, not sum
      expect(merged.userStats.totalMissionsCompleted).toBe(3)
    })
  })

  describe("shouldSync", () => {
    it("returns true when never synced", () => {
      const sandbox = initializeSandbox()
      expect(shouldSync(sandbox)).toBe(true)
    })

    it("returns false when recently synced (< 5 minutes)", () => {
      const sandbox = initializeSandbox()
      const now = new Date()
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000)
      sandbox.lastSynced = twoMinutesAgo.toISOString()

      expect(shouldSync(sandbox)).toBe(false)
    })

    it("returns true when last sync > 5 minutes ago", () => {
      const sandbox = initializeSandbox()
      const now = new Date()
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000)
      sandbox.lastSynced = tenMinutesAgo.toISOString()

      expect(shouldSync(sandbox)).toBe(true)
    })

    it("returns true when sandbox has significant changes", () => {
      const sandbox = initializeSandbox()
      const now = new Date()
      const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000)
      sandbox.lastSynced = oneMinuteAgo.toISOString()

      // Significant change: new XP earned
      sandbox.userStats.totalXp = 100

      // Should sync despite being recently synced
      expect(shouldSync(sandbox)).toBe(true)
    })
  })
})
