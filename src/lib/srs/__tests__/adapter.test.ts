import { describe, expect, it } from "vitest"
import {
    sandboxToSrsProgress,
    srsToSandboxProgress,
} from "../adapter"

describe("SRS Adapter", () => {
  describe("sandboxToSrsProgress", () => {
    it("converts sandbox progress to SRS progress format", () => {
      const result = sandboxToSrsProgress("card_1", "user_1", {
        lastReviewed: "2026-02-11T10:00:00.000Z",
        interval: 3,
        easeFactor: 2.3,
        repetitions: 2,
        nextReview: "2026-02-14T10:00:00.000Z",
      })

      expect(result.cardId).toBe("card_1")
      expect(result.userId).toBe("user_1")
      expect(result.easinessFactor).toBe(2.3)
      expect(result.interval).toBe(3)
      expect(result.repetitions).toBe(2)
      expect(result.nextReview).toBe("2026-02-14T10:00:00.000Z")
      expect(result.lastReview).toBe("2026-02-11T10:00:00.000Z")
      expect(result.totalReviews).toBe(2)
      expect(result.isGraduated).toBe(false)
    })
  })

  describe("srsToSandboxProgress", () => {
    it("converts SRS progress to sandbox progress format", () => {
      const result = srsToSandboxProgress({
        cardId: "card_1",
        userId: "user_1",
        easinessFactor: 2.5,
        interval: 7,
        repetitions: 4,
        nextReview: "2026-02-19T10:00:00.000Z",
        lastReview: "2026-02-12T10:00:00.000Z",
        totalReviews: 6,
        lapseCount: 1,
        isGraduated: true,
        createdAt: "2026-02-01T10:00:00.000Z",
        updatedAt: "2026-02-12T10:00:00.000Z",
      })

      expect(result.lastReviewed).toBe("2026-02-12T10:00:00.000Z")
      expect(result.interval).toBe(7)
      expect(result.easeFactor).toBe(2.5)
      expect(result.repetitions).toBe(4)
      expect(result.nextReview).toBe("2026-02-19T10:00:00.000Z")
    })
  })
})
