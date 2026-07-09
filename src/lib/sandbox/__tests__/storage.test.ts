import { beforeEach, describe, expect, it, vi } from "vitest"
import {
    clearSandbox,
    getSandboxSize,
    initializeSandbox,
    loadSandbox,
    SANDBOX_KEY,
    saveSandbox,
    updateSandbox,
} from "../storage"
import type { SandboxData } from "../types"
import {
  notifySandboxChange,
  subscribeSandboxChange,
} from "../sandboxChangeBus"

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

// Replace global localStorage with mock
Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
})

describe("Sandbox Storage", () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe("SANDBOX_KEY", () => {
    it("has correct key value", () => {
      expect(SANDBOX_KEY).toBe("databricks-sword:sandbox")
    })
  })

  describe("initializeSandbox", () => {
    it("returns default empty sandbox state", () => {
      const sandbox = initializeSandbox()

      expect(sandbox.version).toBe(2)
      expect(sandbox.missionProgress).toEqual({})
      expect(sandbox.challengeResults).toEqual({})
      expect(sandbox.achievements).toEqual([])
      expect(sandbox.flashcardProgress).toEqual({})
      expect(sandbox.lastSynced).toBeNull()
    })

    it("has valid user stats", () => {
      const sandbox = initializeSandbox()

      expect(sandbox.userStats.totalXp).toBe(0)
      expect(sandbox.userStats.totalMissionsCompleted).toBe(0)
      expect(sandbox.userStats.totalChallengesCompleted).toBe(0)
      expect(sandbox.userStats.totalAchievements).toBe(0)
      expect(sandbox.userStats.currentStreak).toBe(0)
      expect(sandbox.userStats.longestStreak).toBe(0)
      expect(sandbox.userStats.totalTimeSpentMinutes).toBe(0)
    })

    it("has valid streak data", () => {
      const sandbox = initializeSandbox()

      expect(sandbox.streakData.currentStreak).toBe(0)
      expect(sandbox.streakData.longestStreak).toBe(0)
      expect(sandbox.streakData.lastActiveDate).toBe("")
      expect(sandbox.streakData.freezesAvailable).toBe(2)
      expect(sandbox.streakData.freezesUsed).toBe(0)
    })
  })

  describe("saveSandbox", () => {
    it("saves sandbox data to localStorage", () => {
      const sandbox = initializeSandbox()
      saveSandbox(sandbox)

      const saved = localStorageMock.getItem(SANDBOX_KEY)
      expect(saved).toBeTruthy()
      expect(() => JSON.parse(saved!)).not.toThrow()
    })

    it("serializes all fields correctly", () => {
      const sandbox: SandboxData = {
        ...initializeSandbox(),
        userStats: {
          ...initializeSandbox().userStats,
          totalXp: 500,
        },
        achievements: ["first-blood"],
      }

      saveSandbox(sandbox)

      const saved = JSON.parse(localStorageMock.getItem(SANDBOX_KEY)!)
      expect(saved.userStats.totalXp).toBe(500)
      expect(saved.achievements).toEqual(["first-blood"])
    })

    it("overwrites existing data", () => {
      const sandbox1 = initializeSandbox()
      sandbox1.userStats.totalXp = 100

      const sandbox2 = initializeSandbox()
      sandbox2.userStats.totalXp = 200

      saveSandbox(sandbox1)
      saveSandbox(sandbox2)

      const saved = JSON.parse(localStorageMock.getItem(SANDBOX_KEY)!)
      expect(saved.userStats.totalXp).toBe(200)
    })

    it("notifies sandbox-change subscribers after writing", () => {
      // Header XP bar and other UI components subscribe here so they
      // pick up server-merged XP (e.g. after refreshFromServer) without
      // a full remount.
      const listener = vi.fn()
      const unsubscribe = subscribeSandboxChange(listener)

      saveSandbox(initializeSandbox())

      expect(listener).toHaveBeenCalledTimes(1)

      saveSandbox(initializeSandbox())
      expect(listener).toHaveBeenCalledTimes(2)

      unsubscribe()
    })

    it("notifies subscribers on updateSandbox (via saveSandbox)", () => {
      const listener = vi.fn()
      const unsubscribe = subscribeSandboxChange(listener)

      // Seed a v3 sandbox so loadSandbox() inside updateSandbox doesn't
      // also fire the migration path's notify (which would inflate the
      // call count and confuse this assertion).
      saveSandbox({ ...initializeSandbox(), version: 3 })
      listener.mockClear()

      updateSandbox((data) => ({
        ...data,
        userStats: { ...data.userStats, totalXp: 999 },
      }))

      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()
    })
  })

  describe("loadSandbox", () => {
    it("returns null when no data exists", () => {
      const sandbox = loadSandbox()
      expect(sandbox).toBeNull()
    })

    it("loads and parses saved data", () => {
      const original = initializeSandbox()
      original.userStats.totalXp = 350

      saveSandbox(original)
      const loaded = loadSandbox()

      expect(loaded).not.toBeNull()
      expect(loaded!.userStats.totalXp).toBe(350)
      // initializeSandbox() returns v2, but loadSandbox() migrates to v3
      // to backfill the redeemedCoupons field. So loaded version is the
      // current schema version, not what was saved.
      expect(loaded!.version).toBe(3)
    })

    it("returns null for invalid JSON", () => {
      localStorageMock.setItem(SANDBOX_KEY, "invalid json{{{")
      const sandbox = loadSandbox()
      expect(sandbox).toBeNull()
    })

    it("returns null for data failing Zod validation", () => {
      const invalid = {
        version: -1, // Invalid
        missionProgress: {},
        challengeResults: {},
        userStats: {},
        streakData: {},
        achievements: [],
        flashcardProgress: {},
        lastSynced: null,
      }

      localStorageMock.setItem(SANDBOX_KEY, JSON.stringify(invalid))
      const sandbox = loadSandbox()
      expect(sandbox).toBeNull()
    })

    it("validates all required fields", () => {
      const sandbox = initializeSandbox()
      saveSandbox(sandbox)
      const loaded = loadSandbox()

      expect(loaded).not.toBeNull()
      expect(loaded).toHaveProperty("version")
      expect(loaded).toHaveProperty("missionProgress")
      expect(loaded).toHaveProperty("challengeResults")
      expect(loaded).toHaveProperty("userStats")
      expect(loaded).toHaveProperty("streakData")
      expect(loaded).toHaveProperty("achievements")
      expect(loaded).toHaveProperty("flashcardProgress")
      expect(loaded).toHaveProperty("lastSynced")
    })

    it("migrates v1 data through v2 to v3 (pendingClaims + redeemedCoupons)", () => {
      // Simulate v1 data in localStorage (version: 1, no pendingClaims or
      // redeemedCoupons fields).
      const v1Data = {
        version: 1,
        missionProgress: {},
        challengeResults: {},
        userStats: {
          totalXp: 0,
          totalMissionsCompleted: 0,
          totalChallengesCompleted: 0,
          totalAchievements: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalTimeSpentMinutes: 0,
        },
        streakData: {
          currentStreak: 0,
          longestStreak: 0,
          lastActiveDate: "",
          freezesAvailable: 2,
          freezesUsed: 0,
        },
        achievements: [],
        flashcardProgress: {},
        lastSynced: null,
        // Note: no pendingClaims / redeemedCoupons fields - this is v1 data
      }

      localStorageMock.setItem(SANDBOX_KEY, JSON.stringify(v1Data))

      // Call loadSandbox - should trigger both migrations
      const loaded = loadSandbox()

      // Verify both migration steps ran: v1→v2 (pendingClaims) and
      // v2→v3 (redeemedCoupons), ending at the current schema version.
      expect(loaded).not.toBeNull()
      expect(loaded!.version).toBe(3)
      expect(loaded!.pendingClaims).toEqual([])
      expect(loaded!.redeemedCoupons).toEqual([])

      // Verify final state was persisted to localStorage
      const stored = JSON.parse(localStorageMock.getItem(SANDBOX_KEY)!)
      expect(stored.version).toBe(3)
      expect(stored.pendingClaims).toEqual([])
      expect(stored.redeemedCoupons).toEqual([])
    })
  })

  describe("clearSandbox", () => {
    it("removes sandbox data from localStorage", () => {
      const sandbox = initializeSandbox()
      saveSandbox(sandbox)

      expect(localStorageMock.getItem(SANDBOX_KEY)).toBeTruthy()

      clearSandbox()

      expect(localStorageMock.getItem(SANDBOX_KEY)).toBeNull()
    })

    it("does not throw when no data exists", () => {
      expect(() => clearSandbox()).not.toThrow()
    })
  })

  describe("getSandboxSize", () => {
    it("returns 0 when no data exists", () => {
      const size = getSandboxSize()
      expect(size).toBe(0)
    })

    it("returns byte size of stored data", () => {
      const sandbox = initializeSandbox()
      saveSandbox(sandbox)

      const size = getSandboxSize()
      expect(size).toBeGreaterThan(0)

      const stored = localStorageMock.getItem(SANDBOX_KEY)!
      const expectedSize = new Blob([stored]).size

      expect(size).toBe(expectedSize)
    })

    it("increases with more data", () => {
      const sandbox1 = initializeSandbox()
      saveSandbox(sandbox1)
      const size1 = getSandboxSize()

      const sandbox2: SandboxData = {
        ...initializeSandbox(),
        missionProgress: {
          "mission-1": {
            started: true,
            completed: false,
            stageProgress: {},
            sideQuestsCompleted: [],
            totalXpEarned: 0,
          },
        },
      }
      saveSandbox(sandbox2)
      const size2 = getSandboxSize()

      expect(size2).toBeGreaterThan(size1)
    })
  })

  describe("updateSandbox", () => {
    it("loads, updates, and saves sandbox", () => {
      const sandbox = initializeSandbox()
      saveSandbox(sandbox)

      updateSandbox((data) => ({
        ...data,
        userStats: {
          ...data.userStats,
          totalXp: 500,
        },
      }))

      const updated = loadSandbox()
      expect(updated!.userStats.totalXp).toBe(500)
    })

    it("initializes sandbox if none exists", () => {
      updateSandbox((data) => ({
        ...data,
        userStats: {
          ...data.userStats,
          totalXp: 100,
        },
      }))

      const sandbox = loadSandbox()
      expect(sandbox).not.toBeNull()
      expect(sandbox!.userStats.totalXp).toBe(100)
    })

    it("applies multiple updates correctly", () => {
      saveSandbox(initializeSandbox())

      updateSandbox((data) => ({
        ...data,
        userStats: { ...data.userStats, totalXp: 100 },
      }))

      updateSandbox((data) => ({
        ...data,
        userStats: { ...data.userStats, totalXp: data.userStats.totalXp + 50 },
      }))

      const sandbox = loadSandbox()
      expect(sandbox!.userStats.totalXp).toBe(150)
    })

    it("does not modify original data object", () => {
      const sandbox = initializeSandbox()
      saveSandbox(sandbox)

      const originalXp = sandbox.userStats.totalXp

      updateSandbox((data) => ({
        ...data,
        userStats: { ...data.userStats, totalXp: 999 },
      }))

      // Original reference should not change
      expect(sandbox.userStats.totalXp).toBe(originalXp)
    })
  })
})
