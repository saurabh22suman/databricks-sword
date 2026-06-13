import { describe, expect, it } from "vitest"
import { getAllIndustries, getIndustryConfig, isIndustryUnlocked } from "../industries"

describe("field-ops industry unlock thresholds", () => {
  it("uses the recalibrated XP ladder", () => {
    expect(getIndustryConfig("retail").xpRequired).toBe(400)
    expect(getIndustryConfig("gaming").xpRequired).toBe(1600)
    expect(getIndustryConfig("healthcare").xpRequired).toBe(2800)
    expect(getIndustryConfig("fintech").xpRequired).toBe(4300)
    expect(getIndustryConfig("automotive").xpRequired).toBe(6200)
    expect(getIndustryConfig("manufacturing").xpRequired).toBe(8400)
    expect(getIndustryConfig("telecom").xpRequired).toBe(10900)
    expect(getIndustryConfig("agritech").xpRequired).toBe(13800)
  })

  it("applies unlock boundaries correctly", () => {
    expect(isIndustryUnlocked("retail", 399)).toBe(false)
    expect(isIndustryUnlocked("retail", 400)).toBe(true)

    expect(isIndustryUnlocked("gaming", 1599)).toBe(false)
    expect(isIndustryUnlocked("gaming", 1600)).toBe(true)

    expect(isIndustryUnlocked("agritech", 13799)).toBe(false)
    expect(isIndustryUnlocked("agritech", 13800)).toBe(true)
  })
})

describe("medtech-research industry", () => {
  it("is registered in INDUSTRY_CONFIGS", () => {
    const config = getIndustryConfig("medtech-research")
    expect(config.industry).toBe("medtech-research")
    expect(config.title).toBeTruthy()
    expect(config.schemas).toEqual(["bronze", "silver", "gold"])
  })

  it("is included in getAllIndustries()", () => {
    const all = getAllIndustries().map((c) => c.industry)
    expect(all).toContain("medtech-research")
  })

  it("is unlockable at the highest XP threshold (after agritech)", () => {
    // Pick an XP that unlocks all existing industries + medtech
    // Existing max is agritech at 13800. Set medtech at 16000 to fit the ladder pattern.
    const all = getAllIndustries()
    const maxRequired = Math.max(...all.map((c) => c.xpRequired))
    expect(isIndustryUnlocked("medtech-research", maxRequired + 1000)).toBe(true)
  })
})
