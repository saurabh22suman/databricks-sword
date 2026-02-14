import { describe, expect, it } from "vitest"
import { RANKS, getNextRank, getRankForXp, getRankProgress, getXpToNextRank } from "../ranks"

describe("Ranks", () => {
  describe("RANKS constant", () => {
    it("has 8 ranks total", () => {
      expect(RANKS).toHaveLength(8)
    })

    it("starts with Cadet at 0 XP", () => {
      const cadet = RANKS[0]
      expect(cadet.id).toBe("cadet")
      expect(cadet.title).toBe("Cadet")
      expect(cadet.minXp).toBe(0)
      expect(cadet.icon).toBe("cadet")
      expect(cadet.badge).toBeDefined()
      expect(cadet.description).toBeDefined()
      expect(cadet.badge.src).toContain("/badges/rank-cadet.png")
    })

    it("ends with Grandmaster at 25000 XP", () => {
      const grandmaster = RANKS[7]
      expect(grandmaster.id).toBe("grandmaster")
      expect(grandmaster.title).toBe("Grandmaster")
      expect(grandmaster.minXp).toBe(25000)
      expect(grandmaster.icon).toBe("grandmaster")
      expect(grandmaster.badge).toBeDefined()
      expect(grandmaster.description).toBeDefined()
      expect(grandmaster.badge.src).toContain("/badges/rank-grandmaster.png")
    })

    it("has ranks in ascending XP order", () => {
      for (let i = 1; i < RANKS.length; i++) {
        expect(RANKS[i].minXp).toBeGreaterThan(RANKS[i - 1].minXp)
      }
    })

    it("includes all expected ranks", () => {
      const expectedIds = [
        "cadet",
        "recruit",
        "operative",
        "specialist",
        "commander",
        "sentinel",
        "architect",
        "grandmaster",
      ]
      const actualIds = RANKS.map((r) => r.id)
      expect(actualIds).toEqual(expectedIds)
    })
  })

  describe("getRankForXp", () => {
    it("returns Cadet for 0 XP", () => {
      const rank = getRankForXp(0)
      expect(rank.id).toBe("cadet")
    })

    it("returns Cadet for 99 XP", () => {
      const rank = getRankForXp(99)
      expect(rank.id).toBe("cadet")
    })

    it("returns Recruit for 100 XP", () => {
      const rank = getRankForXp(100)
      expect(rank.id).toBe("recruit")
    })

    it("returns Recruit for 499 XP", () => {
      const rank = getRankForXp(499)
      expect(rank.id).toBe("recruit")
    })

    it("returns Operative for 500 XP", () => {
      const rank = getRankForXp(500)
      expect(rank.id).toBe("operative")
    })

    it("returns Specialist for 1500 XP", () => {
      const rank = getRankForXp(1500)
      expect(rank.id).toBe("specialist")
    })

    it("returns Commander for 4000 XP", () => {
      const rank = getRankForXp(4000)
      expect(rank.id).toBe("commander")
    })

    it("returns Sentinel for 8000 XP", () => {
      const rank = getRankForXp(8000)
      expect(rank.id).toBe("sentinel")
    })

    it("returns Architect for 15000 XP", () => {
      const rank = getRankForXp(15000)
      expect(rank.id).toBe("architect")
    })

    it("returns Grandmaster for 25000 XP", () => {
      const rank = getRankForXp(25000)
      expect(rank.id).toBe("grandmaster")
    })

    it("returns Grandmaster for XP above max", () => {
      const rank = getRankForXp(50000)
      expect(rank.id).toBe("grandmaster")
    })

    it("returns Cadet for negative XP", () => {
      const rank = getRankForXp(-100)
      expect(rank.id).toBe("cadet")
    })
  })

  describe("getNextRank", () => {
    it("returns Recruit when given Cadet", () => {
      const cadet = RANKS[0]
      const next = getNextRank(cadet)
      expect(next?.id).toBe("recruit")
    })

    it("returns Operative when given Recruit", () => {
      const recruit = RANKS[1]
      const next = getNextRank(recruit)
      expect(next?.id).toBe("operative")
    })

    it("returns Grandmaster when given Architect", () => {
      const architect = RANKS[6]
      const next = getNextRank(architect)
      expect(next?.id).toBe("grandmaster")
    })

    it("returns null when given Grandmaster (max rank)", () => {
      const grandmaster = RANKS[7]
      const next = getNextRank(grandmaster)
      expect(next).toBeNull()
    })
  })

  describe("getXpToNextRank", () => {
    it("returns 100 XP needed from 0 XP (Cadet → Recruit)", () => {
      expect(getXpToNextRank(0)).toBe(100)
    })

    it("returns 50 XP needed from 50 XP (Cadet → Recruit)", () => {
      expect(getXpToNextRank(50)).toBe(50)
    })

    it("returns 400 XP needed from 100 XP (Recruit → Operative)", () => {
      expect(getXpToNextRank(100)).toBe(400)
    })

    it("returns 200 XP needed from 300 XP (Recruit → Operative)", () => {
      expect(getXpToNextRank(300)).toBe(200)
    })

    it("returns 1000 XP needed from 500 XP (Operative → Specialist)", () => {
      expect(getXpToNextRank(500)).toBe(1000)
    })

    it("returns 0 when at max rank (Grandmaster)", () => {
      expect(getXpToNextRank(25000)).toBe(0)
    })

    it("returns 0 when XP exceeds max rank", () => {
      expect(getXpToNextRank(50000)).toBe(0)
    })
  })

  describe("getRankProgress", () => {
    it("returns 0% at rank minimum (0 XP for Cadet)", () => {
      expect(getRankProgress(0)).toBe(0)
    })

    it("returns 50% at halfway through rank (50 XP for Cadet)", () => {
      expect(getRankProgress(50)).toBe(50)
    })

    it("returns ~99% just before next rank (99 XP for Cadet)", () => {
      expect(getRankProgress(99)).toBe(99)
    })

    it("returns 0% at new rank start (100 XP for Recruit)", () => {
      expect(getRankProgress(100)).toBe(0)
    })

    it("returns 50% at halfway through Recruit (300 XP)", () => {
      expect(getRankProgress(300)).toBe(50)
    })

    it("returns 100% at max rank (Grandmaster)", () => {
      expect(getRankProgress(25000)).toBe(100)
    })

    it("returns 100% when XP exceeds max rank", () => {
      expect(getRankProgress(50000)).toBe(100)
    })

    it("handles negative XP gracefully", () => {
      expect(getRankProgress(-100)).toBe(0)
    })
  })
})
