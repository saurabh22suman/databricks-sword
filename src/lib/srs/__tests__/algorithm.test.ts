import { describe, expect, it } from "vitest"
import {
    calculateEasinessFactor,
    calculateInterval,
    createInitialProgress,
    formatNextReview,
    getQualityDescription,
    isCardDue,
    processReview
} from "../algorithm"
import type { FlashcardProgress } from "../types"

describe("SRS Algorithm", () => {
  describe("calculateEasinessFactor", () => {
    it("calculates correct easiness factor for quality 3", () => {
      const result = calculateEasinessFactor(2.5, 3)
      // SM-2 formula: 2.5 + (0.1 - 2 * (0.08 + 2 * 0.02)) = 2.5 + (0.1 - 0.24) = 2.36
      expect(result).toBeCloseTo(2.36, 2)
    })

    it("increases easiness factor for quality > 3", () => {
      // Quality 4: 2.5 + (0.1 - 1 * (0.08 + 1 * 0.02)) = 2.5 + (0.1 - 0.1) = 2.5
      expect(calculateEasinessFactor(2.5, 4)).toBeCloseTo(2.5, 2)
      // Quality 5: 2.5 + (0.1 - 0 * (0.08 + 0 * 0.02)) = 2.5 + 0.1 = 2.6
      // But capped at MAX_EASINESS_FACTOR which is 2.5
      expect(calculateEasinessFactor(2.5, 5)).toBe(2.5)
    })

    it("decreases easiness factor for quality < 3", () => {
      // Quality 2: 2.5 + (0.1 - 3 * (0.08 + 3 * 0.02)) = 2.5 + (0.1 - 3 * 0.14) = 2.5 + (0.1 - 0.42) = 2.18
      expect(calculateEasinessFactor(2.5, 2)).toBeCloseTo(2.18, 2)
      // Quality 1: 2.5 + (0.1 - 4 * (0.08 + 4 * 0.02)) = 2.5 + (0.1 - 4 * 0.16) = 2.5 + (0.1 - 0.64) = 1.96
      expect(calculateEasinessFactor(2.5, 1)).toBeCloseTo(1.96, 2)
      // Quality 0: 2.5 + (0.1 - 5 * (0.08 + 5 * 0.02)) = 2.5 + (0.1 - 5 * 0.18) = 2.5 + (0.1 - 0.9) = 1.7
      expect(calculateEasinessFactor(2.5, 0)).toBeCloseTo(1.7, 2)
    })

    it("enforces minimum easiness factor", () => {
      expect(calculateEasinessFactor(1.3, 0)).toBe(1.3)
      expect(calculateEasinessFactor(1.4, 1)).toBeGreaterThanOrEqual(1.3)
    })

    it("enforces maximum easiness factor", () => {
      expect(calculateEasinessFactor(2.5, 5)).toBeLessThanOrEqual(2.5)
    })

    it("handles edge cases", () => {
      // Minimum EF with poor quality should remain at minimum
      expect(calculateEasinessFactor(1.3, 0)).toBe(1.3)
      
      // Maximum EF with excellent quality - capped at MAX_EASINESS_FACTOR (2.5)
      expect(calculateEasinessFactor(2.5, 5)).toBeCloseTo(2.5, 1) // Will be capped at 2.5
    })
  })

  describe("calculateInterval", () => {
    it("returns 1 for first successful review", () => {
      expect(calculateInterval(0, 2.5, 3, 0)).toBe(1)
    })

    it("returns 6 for second successful review", () => {
      expect(calculateInterval(1, 2.5, 3, 1)).toBe(6)
    })

    it("uses easiness factor for subsequent reviews", () => {
      expect(calculateInterval(2, 2.5, 3, 6)).toBe(15) // 6 * 2.5 = 15
      expect(calculateInterval(3, 2.0, 3, 15)).toBe(30) // 15 * 2.0 = 30
    })

    it("resets to 1 for failed reviews (quality < 3)", () => {
      expect(calculateInterval(5, 2.5, 2, 30)).toBe(1)
      expect(calculateInterval(10, 2.5, 1, 100)).toBe(1)
      expect(calculateInterval(2, 2.5, 0, 15)).toBe(1)
    })

    it("rounds to nearest integer", () => {
      // 6 * 2.3 = 13.8 → 14
      expect(calculateInterval(2, 2.3, 4, 6)).toBe(14)
      
      // 6 * 2.1 = 12.6 → 13  
      expect(calculateInterval(2, 2.1, 3, 6)).toBe(13)
    })

    it("handles large intervals", () => {
      const largeInterval = calculateInterval(10, 2.5, 4, 1000)
      expect(largeInterval).toBeGreaterThan(1000)
      expect(Number.isInteger(largeInterval)).toBe(true)
    })
  })

  describe("processReview", () => {
    const baseProgress: FlashcardProgress = {
      cardId: "card_123",
      userId: "user_456",
      easinessFactor: 2.5,
      interval: 6,
      repetitions: 2,
      nextReview: "2026-02-12T10:00:00.000Z",
      totalReviews: 10,
      lapseCount: 1,
      isGraduated: true,
      createdAt: "2026-02-10T10:00:00.000Z",
      updatedAt: "2026-02-11T10:00:00.000Z"
    }

    it("processes successful review correctly", () => {
      const result = processReview(baseProgress, 4)
      
      expect(result.updatedProgress.easinessFactor).toBeCloseTo(2.5, 2)
      expect(result.updatedProgress.repetitions).toBe(3)
      expect(result.updatedProgress.totalReviews).toBe(11)
      expect(result.updatedProgress.lapseCount).toBe(1) // unchanged
      expect(result.updatedProgress.isGraduated).toBe(true)
      expect(result.updatedProgress.lastQuality).toBe(4)
      
      // Check review result
      expect(result.reviewResult.quality).toBe(4)
      expect(result.reviewResult.previousInterval).toBe(6)
      expect(result.reviewResult.newInterval).toBeGreaterThan(6)
      expect(result.reviewResult.previousEasinessFactor).toBe(2.5)
      expect(result.reviewResult.newEasinessFactor).toBeCloseTo(2.5, 2)
    })

    it("processes failed review correctly", () => {
      const result = processReview(baseProgress, 1)
      
      expect(result.updatedProgress.easinessFactor).toBeLessThan(2.5)
      expect(result.updatedProgress.repetitions).toBe(0) // reset
      expect(result.updatedProgress.interval).toBe(1) // reset
      expect(result.updatedProgress.totalReviews).toBe(11)
      expect(result.updatedProgress.lapseCount).toBe(2) // incremented
      expect(result.updatedProgress.isGraduated).toBe(false) // reset
      expect(result.updatedProgress.lastQuality).toBe(1)
    })

    it("marks card as graduated after successful repetitions", () => {
      const newCardProgress = {
        ...baseProgress,
        repetitions: 0,
        isGraduated: false
      }
      
      // First review (quality 3 = pass)
      const firstResult = processReview(newCardProgress, 3)
      expect(firstResult.updatedProgress.repetitions).toBe(1)
      expect(firstResult.updatedProgress.isGraduated).toBe(false)
      
      // Second review  
      const secondResult = processReview(firstResult.updatedProgress, 3)
      expect(secondResult.updatedProgress.repetitions).toBe(2)
      expect(secondResult.updatedProgress.isGraduated).toBe(true)
    })

    it("updates nextReview date correctly", () => {
      const now = new Date("2026-02-12T10:00:00.000Z")
      const result = processReview(baseProgress, 4, now)
      
      const nextReview = new Date(result.updatedProgress.nextReview)
      const expectedDays = result.updatedProgress.interval
      const expectedDate = new Date(now)
      expectedDate.setDate(expectedDate.getDate() + expectedDays)
      
      expect(nextReview.getTime()).toBe(expectedDate.getTime())
    })

    it("calculates average quality", () => {
      const progressWithHistory = {
        ...baseProgress,
        averageQuality: 3.0
      }
      
      const result = processReview(progressWithHistory, 5)
      
      // (3.0 * 10 + 5) / 11 = 35 / 11 ≈ 3.18
      expect(result.updatedProgress.averageQuality).toBeCloseTo(3.18, 2)
    })

    it("handles first review (no previous average)", () => {
      const firstReview = {
        ...baseProgress,
        totalReviews: 0,
        averageQuality: undefined
      }
      
      const result = processReview(firstReview, 4)
      expect(result.updatedProgress.averageQuality).toBe(4)
    })

    it("updates timestamps correctly", () => {
      const now = new Date("2026-02-12T15:30:00.000Z")
      const result = processReview(baseProgress, 3, now)
      
      expect(result.updatedProgress.lastReview).toBe(now.toISOString())
      expect(result.updatedProgress.updatedAt).toBe(now.toISOString())
      expect(result.reviewResult.reviewedAt).toBe(now.toISOString())
    })
  })

  describe("createInitialProgress", () => {
    it("creates initial progress with defaults", () => {
      const now = new Date("2026-02-12T10:00:00.000Z")
      const progress = createInitialProgress("card_123", "user_456", now)
      
      expect(progress.cardId).toBe("card_123")
      expect(progress.userId).toBe("user_456")
      expect(progress.easinessFactor).toBe(2.5)
      expect(progress.interval).toBe(0)
      expect(progress.repetitions).toBe(0)
      expect(progress.totalReviews).toBe(0)
      expect(progress.lapseCount).toBe(0)
      expect(progress.isGraduated).toBe(false)
      expect(progress.createdAt).toBe(now.toISOString())
      expect(progress.updatedAt).toBe(now.toISOString())
      expect(progress.nextReview).toBe(now.toISOString()) // Due immediately
    })

    it("uses current time by default", () => {
      const before = new Date()
      const progress = createInitialProgress("card_123", "user_456")
      const after = new Date()
      
      const createdAt = new Date(progress.createdAt)
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe("isCardDue", () => {
    it("returns true for cards due now", () => {
      const now = new Date("2026-02-12T10:00:00.000Z")
      const progress = {
        nextReview: "2026-02-12T10:00:00.000Z"
      } as FlashcardProgress
      
      expect(isCardDue(progress, now)).toBe(true)
    })

    it("returns true for overdue cards", () => {
      const now = new Date("2026-02-12T10:00:00.000Z")
      const progress = {
        nextReview: "2026-02-11T10:00:00.000Z"
      } as FlashcardProgress
      
      expect(isCardDue(progress, now)).toBe(true)
    })

    it("returns false for cards not yet due", () => {
      const now = new Date("2026-02-12T10:00:00.000Z")
      const progress = {
        nextReview: "2026-02-13T10:00:00.000Z"
      } as FlashcardProgress
      
      expect(isCardDue(progress, now)).toBe(false)
    })

    it("uses current time by default", () => {
      const futureProgress = {
        nextReview: "2030-01-01T00:00:00.000Z"
      } as FlashcardProgress
      
      expect(isCardDue(futureProgress)).toBe(false)
    })
  })

  describe("getQualityDescription", () => {
    it("returns correct descriptions", () => {
      expect(getQualityDescription(0)).toBe("Total blackout")
      expect(getQualityDescription(1)).toBe("Incorrect response")
      expect(getQualityDescription(2)).toBe("Incorrect response, but correct on hint")
      expect(getQualityDescription(3)).toBe("Correct response with serious difficulty")
      expect(getQualityDescription(4)).toBe("Correct response after hesitation")
      expect(getQualityDescription(5)).toBe("Perfect response")
    })

    it("handles invalid quality", () => {
      expect(getQualityDescription(-1 as any)).toBe("Unknown")
      expect(getQualityDescription(6 as any)).toBe("Unknown")
    })
  })

  describe("formatNextReview", () => {
    it("formats next review correctly", () => {
      const progress = {
        nextReview: "2026-02-15T14:30:00.000Z"
      } as FlashcardProgress
      
      const result = formatNextReview(progress)
      expect(result).toMatch(/Feb 15, 2026/)
    })

    it("handles date formatting", () => {
      const progress = {
        nextReview: "2026-12-25T00:00:00.000Z"
      } as FlashcardProgress
      
      const result = formatNextReview(progress)
      expect(result).toMatch(/Dec 25, 2026/)
    })
  })

  describe("Edge Cases", () => {
    it("handles extreme easiness factors", () => {
      // Very low EF with good quality
      // 1.3 + (0.1 - 0) = 1.4
      expect(calculateEasinessFactor(1.3, 5)).toBeCloseTo(1.4, 2)
      
      // Very high EF with poor quality
      // 2.5 + (0.1 - 5 * 0.18) = 2.5 + (0.1 - 0.9) = 1.7
      expect(calculateEasinessFactor(2.5, 0)).toBeCloseTo(1.7, 2)
    })

    it("handles very large intervals", () => {
      const largeProgress = {
        cardId: "card_123",
        userId: "user_456",
        easinessFactor: 2.5,
        interval: 365, // 1 year
        repetitions: 10,
        nextReview: "2026-02-12T10:00:00.000Z",
        totalReviews: 50,
        lapseCount: 0,
        isGraduated: true,
        createdAt: "2025-01-01T10:00:00.000Z",
        updatedAt: "2026-01-01T10:00:00.000Z"
      }
      
      const result = processReview(largeProgress, 4)
      expect(result.updatedProgress.interval).toBeGreaterThan(365)
      expect(Number.isInteger(result.updatedProgress.interval)).toBe(true)
    })

    it("handles multiple consecutive failures", () => {
      let progress = createInitialProgress("card_123", "user_456")
      
      // Multiple failures should reset each time
      for (let i = 0; i < 5; i++) {
        const result = processReview(progress, 0)
        expect(result.updatedProgress.repetitions).toBe(0)
        expect(result.updatedProgress.interval).toBe(1)
        expect(result.updatedProgress.lapseCount).toBe(i + 1)
        
        progress = result.updatedProgress
      }
    })
  })
})