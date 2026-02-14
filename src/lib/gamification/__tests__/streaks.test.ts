import { describe, expect, it } from "vitest"
import {
    calculateStreak,
    canUseFreeze,
    earnFreeze,
    getStreakMultiplier,
    useFreeze,
} from "../streaks"
import type { StreakData } from "../types"

describe("Streaks", () => {
  describe("calculateStreak", () => {
    it("maintains streak when active today", () => {
      const result = calculateStreak("2026-02-12", "2026-02-12")
      expect(result.maintained).toBe(true)
      expect(result.newStreak).toBe(1)
      expect(result.freezeUsed).toBe(false)
    })

    it("maintains streak when active yesterday", () => {
      const result = calculateStreak("2026-02-11", "2026-02-12")
      expect(result.maintained).toBe(true)
      expect(result.newStreak).toBe(2)
      expect(result.freezeUsed).toBe(false)
    })

    it("breaks streak when inactive for 2+ days", () => {
      const result = calculateStreak("2026-02-09", "2026-02-12")
      expect(result.maintained).toBe(false)
      expect(result.newStreak).toBe(0)
      expect(result.freezeUsed).toBe(false)
    })

    it("breaks streak when last active is in the future", () => {
      const result = calculateStreak("2026-02-13", "2026-02-12")
      expect(result.maintained).toBe(false)
      expect(result.newStreak).toBe(0)
      expect(result.freezeUsed).toBe(false)
    })

    it("maintains streak with freeze for 1-day gap", () => {
      const result = calculateStreak("2026-02-10", "2026-02-12", {
        freezesAvailable: 1,
      })
      expect(result.maintained).toBe(true)
      expect(result.freezeUsed).toBe(true)
    })

    it("does not use freeze when no freezes available", () => {
      const result = calculateStreak("2026-02-10", "2026-02-12", {
        freezesAvailable: 0,
      })
      expect(result.maintained).toBe(false)
      expect(result.newStreak).toBe(0)
      expect(result.freezeUsed).toBe(false)
    })

    it("does not use freeze when gap is too large", () => {
      const result = calculateStreak("2026-02-08", "2026-02-12", {
        freezesAvailable: 2,
      })
      expect(result.maintained).toBe(false)
      expect(result.newStreak).toBe(0)
      expect(result.freezeUsed).toBe(false)
    })

    it("handles same-day activity correctly", () => {
      const result = calculateStreak("2026-02-12", "2026-02-12")
      expect(result.maintained).toBe(true)
      expect(result.newStreak).toBe(1)
    })
  })

  describe("getStreakMultiplier", () => {
    it("returns 1x for day 0 (no streak)", () => {
      expect(getStreakMultiplier(0)).toBe(1.0)
    })

    it("returns 1x for day 1", () => {
      expect(getStreakMultiplier(1)).toBe(1.0)
    })

    it("returns 1x for day 2", () => {
      expect(getStreakMultiplier(2)).toBe(1.0)
    })

    it("returns 1.25x for day 3", () => {
      expect(getStreakMultiplier(3)).toBe(1.25)
    })

    it("returns 1.25x for day 6", () => {
      expect(getStreakMultiplier(6)).toBe(1.25)
    })

    it("returns 1.5x for day 7", () => {
      expect(getStreakMultiplier(7)).toBe(1.5)
    })

    it("returns 1.5x for day 13", () => {
      expect(getStreakMultiplier(13)).toBe(1.5)
    })

    it("returns 2x for day 14", () => {
      expect(getStreakMultiplier(14)).toBe(2.0)
    })

    it("returns 2x for day 30", () => {
      expect(getStreakMultiplier(30)).toBe(2.0)
    })

    it("returns 2x for day 100+", () => {
      expect(getStreakMultiplier(100)).toBe(2.0)
    })
  })

  describe("canUseFreeze", () => {
    it("returns true when freezes are available", () => {
      const streakData: StreakData = {
        currentStreak: 5,
        longestStreak: 10,
        lastActiveDate: "2026-02-10",
        freezesAvailable: 1,
        freezesUsed: 0,
      }
      expect(canUseFreeze(streakData)).toBe(true)
    })

    it("returns false when no freezes available", () => {
      const streakData: StreakData = {
        currentStreak: 5,
        longestStreak: 10,
        lastActiveDate: "2026-02-10",
        freezesAvailable: 0,
        freezesUsed: 0,
      }
      expect(canUseFreeze(streakData)).toBe(false)
    })

    it("returns true when multiple freezes available", () => {
      const streakData: StreakData = {
        currentStreak: 5,
        longestStreak: 10,
        lastActiveDate: "2026-02-10",
        freezesAvailable: 2,
        freezesUsed: 0,
      }
      expect(canUseFreeze(streakData)).toBe(true)
    })
  })

  describe("useFreeze", () => {
    it("decrements freezesAvailable by 1", () => {
      const streakData: StreakData = {
        currentStreak: 5,
        longestStreak: 10,
        lastActiveDate: "2026-02-10",
        freezesAvailable: 2,
        freezesUsed: 0,
      }
      const result = useFreeze(streakData)
      expect(result.freezesAvailable).toBe(1)
    })

    it("increments freezesUsed by 1", () => {
      const streakData: StreakData = {
        currentStreak: 5,
        longestStreak: 10,
        lastActiveDate: "2026-02-10",
        freezesAvailable: 1,
        freezesUsed: 0,
      }
      const result = useFreeze(streakData)
      expect(result.freezesUsed).toBe(1)
    })

    it("does not modify other fields", () => {
      const streakData: StreakData = {
        currentStreak: 5,
        longestStreak: 10,
        lastActiveDate: "2026-02-10",
        freezesAvailable: 1,
        freezesUsed: 0,
      }
      const result = useFreeze(streakData)
      expect(result.currentStreak).toBe(5)
      expect(result.longestStreak).toBe(10)
      expect(result.lastActiveDate).toBe("2026-02-10")
    })

    it("returns new object (immutable)", () => {
      const streakData: StreakData = {
        currentStreak: 5,
        longestStreak: 10,
        lastActiveDate: "2026-02-10",
        freezesAvailable: 1,
        freezesUsed: 0,
      }
      const result = useFreeze(streakData)
      expect(result).not.toBe(streakData)
    })
  })

  describe("earnFreeze", () => {
    it("increments freezesAvailable when below max", () => {
      const streakData: StreakData = {
        currentStreak: 5,
        longestStreak: 10,
        lastActiveDate: "2026-02-10",
        freezesAvailable: 0,
        freezesUsed: 0,
      }
      const result = earnFreeze(streakData)
      expect(result.freezesAvailable).toBe(1)
    })

    it("does not exceed max of 2 freezes", () => {
      const streakData: StreakData = {
        currentStreak: 5,
        longestStreak: 10,
        lastActiveDate: "2026-02-10",
        freezesAvailable: 2,
        freezesUsed: 0,
      }
      const result = earnFreeze(streakData)
      expect(result.freezesAvailable).toBe(2)
    })

    it("can earn from 1 to 2 freezes", () => {
      const streakData: StreakData = {
        currentStreak: 5,
        longestStreak: 10,
        lastActiveDate: "2026-02-10",
        freezesAvailable: 1,
        freezesUsed: 0,
      }
      const result = earnFreeze(streakData)
      expect(result.freezesAvailable).toBe(2)
    })

    it("does not modify other fields", () => {
      const streakData: StreakData = {
        currentStreak: 5,
        longestStreak: 10,
        lastActiveDate: "2026-02-10",
        freezesAvailable: 0,
        freezesUsed: 0,
      }
      const result = earnFreeze(streakData)
      expect(result.currentStreak).toBe(5)
      expect(result.longestStreak).toBe(10)
      expect(result.freezesUsed).toBe(0)
    })

    it("returns new object (immutable)", () => {
      const streakData: StreakData = {
        currentStreak: 5,
        longestStreak: 10,
        lastActiveDate: "2026-02-10",
        freezesAvailable: 0,
        freezesUsed: 0,
      }
      const result = earnFreeze(streakData)
      expect(result).not.toBe(streakData)
    })
  })
})
