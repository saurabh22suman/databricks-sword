import { describe, expect, it } from "vitest"
import {
    CardType,
    DifficultyLevel,
    FlashcardProgressSchema,
    FlashcardSchema,
    LearningStatsSchema,
    QualityRating,
    ReviewResultSchema,
    ReviewSessionSchema,
    SkillDecaySchema
} from "../types"

describe("SRS Types", () => {
  describe("QualityRating", () => {
    it("accepts valid ratings 0-5", () => {
      for (let i = 0; i <= 5; i++) {
        expect(() => QualityRating.parse(i)).not.toThrow()
      }
    })

    it("rejects ratings outside 0-5 range", () => {
      expect(() => QualityRating.parse(-1)).toThrow()
      expect(() => QualityRating.parse(6)).toThrow()
      expect(() => QualityRating.parse(3.5)).toThrow()
    })
  })

  describe("DifficultyLevel", () => {
    it("accepts valid difficulty levels", () => {
      expect(() => DifficultyLevel.parse("B")).not.toThrow()
      expect(() => DifficultyLevel.parse("A")).not.toThrow()
      expect(() => DifficultyLevel.parse("S")).not.toThrow()
    })

    it("rejects invalid difficulty levels", () => {
      expect(() => DifficultyLevel.parse("C")).toThrow()
      expect(() => DifficultyLevel.parse("easy")).toThrow()
    })
  })

  describe("CardType", () => {
    it("accepts valid card types", () => {
      expect(() => CardType.parse("concept")).not.toThrow()
      expect(() => CardType.parse("code")).not.toThrow()
      expect(() => CardType.parse("comparison")).not.toThrow()
      expect(() => CardType.parse("procedure")).not.toThrow()
    })

    it("rejects invalid card types", () => {
      expect(() => CardType.parse("invalid")).toThrow()
    })
  })

  describe("FlashcardSchema", () => {
    const validFlashcard = {
      id: "card_123",
      missionId: "mission_abc",
      question: "What is Delta Lake?",
      answer: "A storage framework that brings reliability to data lakes",
      difficulty: "B" as const,
      type: "concept" as const,
      tags: ["delta-lake", "storage"],
      createdAt: "2026-02-12T10:00:00.000Z",
      updatedAt: "2026-02-12T10:00:00.000Z"
    }

    it("validates complete flashcard", () => {
      expect(() => FlashcardSchema.parse(validFlashcard)).not.toThrow()
    })

    it("validates flashcard with optional fields", () => {
      const withOptionals = {
        ...validFlashcard,
        codeExample: "spark.read.format('delta').load('/path/to/table')",
        hint: "Think about ACID properties"
      }
      expect(() => FlashcardSchema.parse(withOptionals)).not.toThrow()
    })

    it("requires mandatory fields", () => {
      const { id, ...withoutId } = validFlashcard
      expect(() => FlashcardSchema.parse(withoutId)).toThrow()
    })

    it("validates datetime strings", () => {
      const invalidDate = { ...validFlashcard, createdAt: "invalid-date" }
      expect(() => FlashcardSchema.parse(invalidDate)).toThrow()
    })
  })

  describe("FlashcardProgressSchema", () => {
    const validProgress = {
      cardId: "card_123",
      userId: "user_456",
      easinessFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReview: "2026-02-13T10:00:00.000Z",
      totalReviews: 0,
      lapseCount: 0,
      isGraduated: false,
      createdAt: "2026-02-12T10:00:00.000Z",
      updatedAt: "2026-02-12T10:00:00.000Z"
    }

    it("validates complete progress", () => {
      expect(() => FlashcardProgressSchema.parse(validProgress)).not.toThrow()
    })

    it("applies default values", () => {
      const minimal = {
        cardId: "card_123",
        userId: "user_456",
        nextReview: "2026-02-13T10:00:00.000Z",
        createdAt: "2026-02-12T10:00:00.000Z",
        updatedAt: "2026-02-12T10:00:00.000Z"
      }
      
      const parsed = FlashcardProgressSchema.parse(minimal)
      expect(parsed.easinessFactor).toBe(2.5)
      expect(parsed.interval).toBe(0)
      expect(parsed.repetitions).toBe(0)
      expect(parsed.totalReviews).toBe(0)
      expect(parsed.lapseCount).toBe(0)
      expect(parsed.isGraduated).toBe(false)
    })

    it("enforces easiness factor bounds", () => {
      const lowEF = { ...validProgress, easinessFactor: 1.2 }
      const highEF = { ...validProgress, easinessFactor: 2.6 }
      
      expect(() => FlashcardProgressSchema.parse(lowEF)).toThrow()
      expect(() => FlashcardProgressSchema.parse(highEF)).toThrow()
    })

    it("validates with optional fields", () => {
      const withOptionals = {
        ...validProgress,
        lastReview: "2026-02-12T10:00:00.000Z",
        lastQuality: 4,
        averageQuality: 3.8
      }
      expect(() => FlashcardProgressSchema.parse(withOptionals)).not.toThrow()
    })
  })

  describe("ReviewResultSchema", () => {
    const validResult = {
      cardId: "card_123",
      userId: "user_456",
      quality: 4,
      reviewedAt: "2026-02-12T10:00:00.000Z",
      previousInterval: 1,
      newInterval: 6,
      previousEasinessFactor: 2.3,
      newEasinessFactor: 2.4
    }

    it("validates complete review result", () => {
      expect(() => ReviewResultSchema.parse(validResult)).not.toThrow()
    })

    it("validates with optional fields", () => {
      const withOptionals = {
        ...validResult,
        responseTime: 15.5,
        usedHint: true
      }
      expect(() => ReviewResultSchema.parse(withOptionals)).not.toThrow()
    })

    it("applies default values", () => {
      const parsed = ReviewResultSchema.parse(validResult)
      expect(parsed.usedHint).toBe(false)
    })

    it("validates quality bounds", () => {
      const invalidQuality = { ...validResult, quality: 6 }
      expect(() => ReviewResultSchema.parse(invalidQuality)).toThrow()
    })

    it("validates easiness factor bounds", () => {
      const invalidEF = { ...validResult, newEasinessFactor: 3.0 }
      expect(() => ReviewResultSchema.parse(invalidEF)).toThrow()
    })
  })

  describe("ReviewSessionSchema", () => {
    const validSession = {
      id: "session_123",
      userId: "user_456",
      cardIds: ["card_1", "card_2", "card_3"],
      cardsReviewed: 2,
      cardsCorrect: 1,
      averageQuality: 3.5,
      totalTimeSeconds: 120,
      startedAt: "2026-02-12T10:00:00.000Z",
      isCompleted: false
    }

    it("validates complete session", () => {
      expect(() => ReviewSessionSchema.parse(validSession)).not.toThrow()
    })

    it("validates with optional completion", () => {
      const completed = {
        ...validSession,
        completedAt: "2026-02-12T10:05:00.000Z",
        isCompleted: true
      }
      expect(() => ReviewSessionSchema.parse(completed)).not.toThrow()
    })

    it("applies default values", () => {
      const minimal = {
        id: "session_123",
        userId: "user_456",
        cardIds: [],
        cardsReviewed: 0,
        cardsCorrect: 0,
        averageQuality: 0,
        totalTimeSeconds: 0,
        startedAt: "2026-02-12T10:00:00.000Z"
      }
      
      const parsed = ReviewSessionSchema.parse(minimal)
      expect(parsed.isCompleted).toBe(false)
    })
  })

  describe("LearningStatsSchema", () => {
    const validStats = {
      userId: "user_456",
      totalCards: 25,
      learningCards: 15,
      graduatedCards: 10,
      dueToday: 5,
      totalReviews: 150,
      currentStreak: 7,
      longestStreak: 21,
      averageDailyReviews: 8,
      retentionRate: 85,
      lastCalculated: "2026-02-12T10:00:00.000Z"
    }

    it("validates complete stats", () => {
      expect(() => LearningStatsSchema.parse(validStats)).not.toThrow()
    })

    it("applies default values", () => {
      const minimal = {
        userId: "user_456",
        lastCalculated: "2026-02-12T10:00:00.000Z"
      }
      
      const parsed = LearningStatsSchema.parse(minimal)
      expect(parsed.totalCards).toBe(0)
      expect(parsed.learningCards).toBe(0)
      expect(parsed.retentionRate).toBe(0)
    })

    it("validates retention rate bounds", () => {
      const invalidRate = { ...validStats, retentionRate: 101 }
      expect(() => LearningStatsSchema.parse(invalidRate)).toThrow()
    })

    it("validates with optional last review date", () => {
      const withLastReview = {
        ...validStats,
        lastReviewDate: "2026-02-12T09:00:00.000Z"
      }
      expect(() => LearningStatsSchema.parse(withLastReview)).not.toThrow()
    })
  })

  describe("SkillDecaySchema", () => {
    const validDecay = {
      skillId: "skill_123",
      userId: "user_456",
      skillName: "Delta Lake Fundamentals",
      missionIds: ["mission_1", "mission_2"],
      lastPracticed: "2026-02-05T10:00:00.000Z",
      daysSinceLastPractice: 7,
      retentionEstimate: 75,
      decayLevel: "mild" as const,
      recommendedAction: "review" as const,
      relatedCards: 8,
      cardsDue: 2
    }

    it("validates complete decay info", () => {
      expect(() => SkillDecaySchema.parse(validDecay)).not.toThrow()
    })

    it("validates decay levels", () => {
      const levels = ["none", "mild", "moderate", "severe"]
      levels.forEach(level => {
        const withLevel = { ...validDecay, decayLevel: level }
        expect(() => SkillDecaySchema.parse(withLevel)).not.toThrow()
      })
    })

    it("validates recommended actions", () => {
      const actions = ["none", "review", "practice", "relearn"]
      actions.forEach(action => {
        const withAction = { ...validDecay, recommendedAction: action }
        expect(() => SkillDecaySchema.parse(withAction)).not.toThrow()
      })
    })

    it("applies default values", () => {
      const minimal = {
        skillId: "skill_123",
        userId: "user_456", 
        skillName: "Delta Lake",
        missionIds: ["mission_1"],
        lastPracticed: "2026-02-05T10:00:00.000Z",
        daysSinceLastPractice: 7,
        retentionEstimate: 75,
        decayLevel: "mild" as const,
        recommendedAction: "review" as const
      }
      
      const parsed = SkillDecaySchema.parse(minimal)
      expect(parsed.relatedCards).toBe(0)
      expect(parsed.cardsDue).toBe(0)
    })

    it("validates retention estimate bounds", () => {
      const invalidEstimate = { ...validDecay, retentionEstimate: 101 }
      expect(() => SkillDecaySchema.parse(invalidEstimate)).toThrow()
    })
  })
})