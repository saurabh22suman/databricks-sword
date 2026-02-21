import type { Challenge } from "@/lib/challenges"
import { describe, expect, it } from "vitest"
import {
  countChallengeCoverageByCategory,
  getChallengeCategoryForIntelTopic,
  getIntelTopicCoverage,
} from "../topicAlignment"

type ChallengeStub = Pick<Challenge, "category"> & { id: string }

function makeChallenge(id: string, category: Challenge["category"]): ChallengeStub {
  return { id, category }
}

describe("topicAlignment", () => {
  describe("countChallengeCoverageByCategory", () => {
    it("counts challenges per category", () => {
      const challenges = [
        makeChallenge("c1", "pyspark"),
        makeChallenge("c2", "pyspark"),
        makeChallenge("c3", "sql"),
      ]

      expect(countChallengeCoverageByCategory(challenges)).toEqual({
        pyspark: 2,
        sql: 1,
      })
    })
  })

  describe("getIntelTopicCoverage", () => {
    it("returns no missing baseline topics when all baseline categories have coverage", () => {
      const challenges = [
        makeChallenge("c1", "delta-lake"),
        makeChallenge("c2", "pyspark"),
        makeChallenge("c3", "sql"),
        makeChallenge("c4", "mlflow"),
        makeChallenge("c5", "architecture"),
        makeChallenge("c6", "streaming"),
      ]

      const coverage = getIntelTopicCoverage(challenges)

      expect(coverage.missingBaselineTopics).toEqual([])
      expect(coverage.countsByCategory["streaming"]).toBe(1)
    })

    it("detects missing baseline categories", () => {
      const challenges = [
        makeChallenge("c1", "pyspark"),
        makeChallenge("c2", "sql"),
      ]

      const coverage = getIntelTopicCoverage(challenges)

      expect(coverage.missingBaselineTopics).toEqual([
        "delta-lake",
        "mlflow",
        "architecture",
      ])
    })

    it("does not fail for future non-baseline categories without Intel baseline mapping", () => {
      const challenges = [
        makeChallenge("c1", "delta-lake"),
        makeChallenge("c2", "pyspark"),
        makeChallenge("c3", "sql"),
        makeChallenge("c4", "mlflow"),
        makeChallenge("c5", "architecture"),
      ]

      const coverage = getIntelTopicCoverage(challenges)

      expect(coverage.missingBaselineTopics).toEqual([])
      expect(coverage.countsByCategory["unity-catalog"] ?? 0).toBe(0)
    })
  })

  describe("getChallengeCategoryForIntelTopic", () => {
    it("maps baseline Intel topics to challenge categories", () => {
      expect(getChallengeCategoryForIntelTopic("delta-lake")).toBe("delta-lake")
      expect(getChallengeCategoryForIntelTopic("pyspark")).toBe("pyspark")
      expect(getChallengeCategoryForIntelTopic("sql")).toBe("sql")
      expect(getChallengeCategoryForIntelTopic("mlflow")).toBe("mlflow")
      expect(getChallengeCategoryForIntelTopic("architecture")).toBe("architecture")
    })

    it("returns null for general and future non-baseline topics", () => {
      expect(getChallengeCategoryForIntelTopic("general")).toBeNull()
      expect(getChallengeCategoryForIntelTopic("unity-catalog")).toBeNull()
      expect(getChallengeCategoryForIntelTopic("custom-admin-topic")).toBeNull()
    })
  })
})
