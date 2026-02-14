import { beforeEach, describe, expect, it } from "vitest"
import {
    calculateLearningStats,
    calculateRetentionEstimate,
    calculateSkillDecay,
    createReviewSession,
    formatSessionSummary,
    generateFlashcardsFromMission,
    getDueCards,
    getOptimalBatchSize,
    getReviewPriority
} from "../scheduler"
import type {
    Flashcard,
    FlashcardProgress,
    ReviewSession
} from "../types"

describe("SRS Scheduler", () => {
  const now = new Date("2026-02-12T10:00:00.000Z")
  
  const mockFlashcards: Flashcard[] = [
    {
      id: "card_1",
      missionId: "mission_delta",
      question: "What is Delta Lake?",
      answer: "A storage framework",
      difficulty: "B",
      type: "concept",
      tags: ["delta-lake", "storage"],
      createdAt: "2026-02-10T10:00:00.000Z",
      updatedAt: "2026-02-10T10:00:00.000Z"
    },
    {
      id: "card_2", 
      missionId: "mission_spark",
      question: "How to create DataFrame?",
      answer: "spark.createDataFrame()",
      difficulty: "A",
      type: "code",
      tags: ["spark", "dataframe"],
      createdAt: "2026-02-10T10:00:00.000Z",
      updatedAt: "2026-02-10T10:00:00.000Z"
    },
    {
      id: "card_3",
      missionId: "mission_streaming",
      question: "What is structured streaming?", 
      answer: "Real-time processing engine",
      difficulty: "S",
      type: "concept",
      tags: ["streaming", "spark"],
      createdAt: "2026-02-10T10:00:00.000Z",
      updatedAt: "2026-02-10T10:00:00.000Z"
    }
  ]

  let mockProgress: FlashcardProgress[]

  beforeEach(() => {
    mockProgress = [
      {
        cardId: "card_1",
        userId: "user_123",
        easinessFactor: 2.5,
        interval: 1,
        repetitions: 1,
        nextReview: "2026-02-11T10:00:00.000Z", // Overdue by 1 day
        totalReviews: 2,
        lapseCount: 0,
        isGraduated: false,
        createdAt: "2026-02-10T10:00:00.000Z",
        updatedAt: "2026-02-11T10:00:00.000Z",
        lastReview: "2026-02-11T10:00:00.000Z",
        lastQuality: 3,
        averageQuality: 3.5
      },
      {
        cardId: "card_2",
        userId: "user_123", 
        easinessFactor: 2.3,
        interval: 6,
        repetitions: 2,
        nextReview: "2026-02-12T10:00:00.000Z", // Due now
        totalReviews: 5,
        lapseCount: 1,
        isGraduated: true,
        createdAt: "2026-02-08T10:00:00.000Z", 
        updatedAt: "2026-02-10T10:00:00.000Z",
        lastReview: "2026-02-10T10:00:00.000Z",
        lastQuality: 4,
        averageQuality: 3.8
      },
      {
        cardId: "card_3",
        userId: "user_123",
        easinessFactor: 2.7,
        interval: 15,
        repetitions: 3,
        nextReview: "2026-02-15T10:00:00.000Z", // Future
        totalReviews: 8,
        lapseCount: 0,
        isGraduated: true,
        createdAt: "2026-02-05T10:00:00.000Z",
        updatedAt: "2026-02-08T10:00:00.000Z",
        lastReview: "2026-02-08T10:00:00.000Z",
        lastQuality: 5,
        averageQuality: 4.2
      }
    ]
  })

  describe("getDueCards", () => {
    it("returns cards due for review", () => {
      const result = getDueCards(mockProgress, mockFlashcards, now)
      
      expect(result).toHaveLength(2) // card_1 overdue, card_2 due now
      expect(result.map(r => r.flashcard.id)).toContain("card_1")
      expect(result.map(r => r.flashcard.id)).toContain("card_2")
      expect(result.map(r => r.flashcard.id)).not.toContain("card_3")
    })

    it("sorts by priority (overdue first)", () => {
      const result = getDueCards(mockProgress, mockFlashcards, now)
      
      // card_1 is overdue, should come first
      expect(result[0].flashcard.id).toBe("card_1")
      expect(result[0].isOverdue).toBe(true)
      
      // card_2 is due now, should come second  
      expect(result[1].flashcard.id).toBe("card_2")
      expect(result[1].isOverdue).toBe(false)
    })

    it("respects maxCards limit", () => {
      const result = getDueCards(mockProgress, mockFlashcards, now, { maxCards: 1 })
      expect(result).toHaveLength(1)
      expect(result[0].flashcard.id).toBe("card_1") // Highest priority
    })

    it("filters by difficulty", () => {
      const result = getDueCards(mockProgress, mockFlashcards, now, { 
        difficulty: "B" 
      })
      
      expect(result).toHaveLength(1)
      expect(result[0].flashcard.id).toBe("card_1")
      expect(result[0].flashcard.difficulty).toBe("B")
    })

    it("filters by tag", () => {
      const result = getDueCards(mockProgress, mockFlashcards, now, {
        tag: "spark"
      })
      
      expect(result).toHaveLength(1)
      expect(result[0].flashcard.id).toBe("card_2")
      expect(result[0].flashcard.tags).toContain("spark")
    })

    it("includes urgency score", () => {
      const result = getDueCards(mockProgress, mockFlashcards, now)
      
      result.forEach(item => {
        expect(item.urgencyScore).toBeGreaterThan(0)
        expect(typeof item.urgencyScore).toBe("number")
      })
      
      // Overdue card should have higher urgency
      const overdueCard = result.find(r => r.flashcard.id === "card_1")
      const dueCard = result.find(r => r.flashcard.id === "card_2")
      
      expect(overdueCard?.urgencyScore).toBeGreaterThan(dueCard?.urgencyScore || 0)
    })

    it("handles empty progress", () => {
      const result = getDueCards([], mockFlashcards, now)
      expect(result).toHaveLength(0)
    })

    it("handles missing flashcards", () => {
      const result = getDueCards(mockProgress, [], now)
      expect(result).toHaveLength(0)
    })
  })

  describe("calculateLearningStats", () => {
    it("calculates comprehensive stats", () => {
      const stats = calculateLearningStats(mockProgress, now)
      
      expect(stats.userId).toBe("user_123")
      expect(stats.totalCards).toBe(3)
      expect(stats.learningCards).toBe(1) // card_1 not graduated
      expect(stats.graduatedCards).toBe(2) // card_2, card_3 graduated
      expect(stats.dueToday).toBe(2) // card_1, card_2 due
      expect(stats.totalReviews).toBe(15) // 2 + 5 + 8
      expect(stats.lastCalculated).toBe(now.toISOString())
    })

    it("calculates retention rate correctly", () => {
      // card_1: 3.5 avg, card_2: 3.8 avg, card_3: 4.2 avg
      // Average: (3.5 + 3.8 + 4.2) / 3 = 3.83
      // Retention: (3.83 / 5) * 100 = 76.7%
      
      const stats = calculateLearningStats(mockProgress, now)
      expect(stats.retentionRate).toBeCloseTo(76.7, 0)
    })

    it("calculates average daily reviews", () => {
      const stats = calculateLearningStats(mockProgress, now)
      expect(stats.averageDailyReviews).toBeGreaterThan(0)
      expect(Number.isFinite(stats.averageDailyReviews)).toBe(true)
    })

    it("handles progress without last review", () => {
      const progressWithoutReview = mockProgress.map(p => ({
        ...p,
        lastReview: undefined,
        averageQuality: undefined
      }))
      
      const stats = calculateLearningStats(progressWithoutReview, now)
      expect(stats.retentionRate).toBe(0)
      expect(stats.lastReviewDate).toBeUndefined()
    })

    it("finds most recent review date", () => {
      const stats = calculateLearningStats(mockProgress, now)
      expect(stats.lastReviewDate).toBe("2026-02-11T10:00:00.000Z")
    })

    it("calculates current streak", () => {
      const stats = calculateLearningStats(mockProgress, now)
      expect(typeof stats.currentStreak).toBe("number")
      expect(stats.currentStreak).toBeGreaterThanOrEqual(0)
    })

    it("handles empty progress", () => {
      const stats = calculateLearningStats([], now)
      
      expect(stats.totalCards).toBe(0)
      expect(stats.learningCards).toBe(0)
      expect(stats.graduatedCards).toBe(0)
      expect(stats.dueToday).toBe(0)
      expect(stats.totalReviews).toBe(0)
      expect(stats.retentionRate).toBe(0)
    })
  })

  describe("calculateSkillDecay", () => {
    const mockMissions = [
      {
        id: "mission_delta",
        title: "Delta Lake Fundamentals",
        tags: ["delta-lake", "storage"],
        cardIds: ["card_1"]
      },
      {
        id: "mission_spark",
        title: "Spark DataFrames",
        tags: ["spark", "dataframe"],
        cardIds: ["card_2"]
      },
      {
        id: "mission_streaming",
        title: "Structured Streaming",
        tags: ["streaming", "spark"],
        cardIds: ["card_3"]
      }
    ]

    it("calculates skill decay for each mission", () => {
      const decayInfo = calculateSkillDecay(mockProgress, mockMissions, now)
      
      expect(decayInfo).toHaveLength(3)
      
      decayInfo.forEach(info => {
        expect(info.userId).toBe("user_123")
        expect(info.skillName).toBeDefined()
        expect(info.daysSinceLastPractice).toBeGreaterThanOrEqual(0)
        expect(info.retentionEstimate).toBeGreaterThanOrEqual(0)
        expect(info.retentionEstimate).toBeLessThanOrEqual(100)
        expect(["none", "mild", "moderate", "severe"]).toContain(info.decayLevel)
        expect(["none", "review", "practice", "relearn"]).toContain(info.recommendedAction)
      })
    })

    it("orders by decay severity", () => {
      const decayInfo = calculateSkillDecay(mockProgress, mockMissions, now)
      
      // Should be ordered by severity level first (severe > moderate > mild > none),
      // then by days since last practice (descending)
      const severityOrder: Record<string, number> = { 
        "severe": 0, 
        "moderate": 1, 
        "mild": 2, 
        "none": 3 
      }
      
      for (let i = 1; i < decayInfo.length; i++) {
        const prev = decayInfo[i - 1]
        const curr = decayInfo[i]
        
        // Previous should have same or higher severity
        if (prev.decayLevel !== curr.decayLevel) {
          expect(severityOrder[prev.decayLevel]).toBeLessThanOrEqual(severityOrder[curr.decayLevel])
        } else {
          // Same severity level - previous should have more or equal days
          expect(prev.daysSinceLastPractice).toBeGreaterThanOrEqual(curr.daysSinceLastPractice)
        }
      }
    })

    it("calculates correct days since practice", () => {
      const decayInfo = calculateSkillDecay(mockProgress, mockMissions, now)
      
      const deltaSkill = decayInfo.find(d => d.skillName.includes("Delta"))
      expect(deltaSkill?.daysSinceLastPractice).toBe(1) // Last review 2026-02-11
      
      const streamingSkill = decayInfo.find(d => d.skillName.includes("Streaming"))
      expect(streamingSkill?.daysSinceLastPractice).toBe(4) // Last review 2026-02-08
    })

    it("assigns appropriate decay levels", () => {
      const decayInfo = calculateSkillDecay(mockProgress, mockMissions, now)
      
      // Recent reviews should have less decay
      const recentSkill = decayInfo.find(d => d.daysSinceLastPractice <= 2)
      expect(["none", "mild"]).toContain(recentSkill?.decayLevel)
      
      // Decay level depends on retention estimate, not just days since practice
      // High-quality cards may retain well even after 4+ days
      decayInfo.forEach(skill => {
        if (skill.retentionEstimate >= 80) {
          expect(skill.decayLevel).toBe("none")
        } else if (skill.retentionEstimate >= 60) {
          expect(skill.decayLevel).toBe("mild")
        } else if (skill.retentionEstimate >= 40) {
          expect(skill.decayLevel).toBe("moderate")
        } else {
          expect(skill.decayLevel).toBe("severe")
        }
      })
    })

    it("recommends appropriate actions", () => {
      const decayInfo = calculateSkillDecay(mockProgress, mockMissions, now)
      
      decayInfo.forEach(info => {
        if (info.decayLevel === "none") {
          expect(info.recommendedAction).toBe("none")
        } else if (info.decayLevel === "mild") {
          expect(["none", "review"]).toContain(info.recommendedAction)
        } else if (info.decayLevel === "moderate") {
          expect(["review", "practice"]).toContain(info.recommendedAction)
        } else if (info.decayLevel === "severe") {
          expect(["practice", "relearn"]).toContain(info.recommendedAction)
        }
      })
    })

    it("handles missions without progress", () => {
      const extraMission = {
        id: "mission_new",
        title: "New Topic",
        tags: ["new"],
        cardIds: ["card_new"]
      }
      
      const decayInfo = calculateSkillDecay(mockProgress, [...mockMissions, extraMission], now)
      
      const newSkill = decayInfo.find(d => d.skillName.includes("New"))
      expect(newSkill).toBeUndefined() // Should not appear if no practice
    })
  })

  describe("createReviewSession", () => {
    it("creates valid review session", () => {
      const cardIds = ["card_1", "card_2"]
      const session = createReviewSession("user_123", cardIds, now)
      
      expect(session.id).toMatch(/^session_/)
      expect(session.userId).toBe("user_123")
      expect(session.cardIds).toEqual(cardIds)
      expect(session.cardsReviewed).toBe(0)
      expect(session.cardsCorrect).toBe(0)
      expect(session.averageQuality).toBe(0)
      expect(session.totalTimeSeconds).toBe(0)
      expect(session.startedAt).toBe(now.toISOString())
      expect(session.isCompleted).toBe(false)
      expect(session.completedAt).toBeUndefined()
    })

    it("generates unique session IDs", () => {
      const session1 = createReviewSession("user_123", ["card_1"])
      const session2 = createReviewSession("user_123", ["card_1"])
      
      expect(session1.id).not.toBe(session2.id)
    })

    it("handles empty card list", () => {
      const session = createReviewSession("user_123", [])
      expect(session.cardIds).toEqual([])
    })
  })

  describe("getOptimalBatchSize", () => {
    it("returns appropriate batch size for different counts", () => {
      expect(getOptimalBatchSize(5)).toBeLessThan(10)
      expect(getOptimalBatchSize(15)).toBeLessThanOrEqual(15)
      expect(getOptimalBatchSize(50)).toBeGreaterThanOrEqual(10)
      expect(getOptimalBatchSize(100)).toBeLessThanOrEqual(25)
    })

    it("considers difficulty and time available", () => {
      const easyBatch = getOptimalBatchSize(20, { difficulty: "B", timeMinutes: 30 })
      const hardBatch = getOptimalBatchSize(20, { difficulty: "S", timeMinutes: 30 })
      
      expect(easyBatch).toBeGreaterThanOrEqual(hardBatch)
    })

    it("returns minimum 1 for any positive count", () => {
      expect(getOptimalBatchSize(1)).toBeGreaterThanOrEqual(1)
    })

    it("returns 0 for zero count", () => {
      expect(getOptimalBatchSize(0)).toBe(0)
    })
  })

  describe("getReviewPriority", () => {
    it("assigns higher priority to overdue cards", () => {
      const overdueProgress = mockProgress[0] // Overdue
      const dueProgress = mockProgress[1] // Due now
      
      const overduePriority = getReviewPriority(overdueProgress, now)
      const duePriority = getReviewPriority(dueProgress, now)
      
      expect(overduePriority).toBeGreaterThan(duePriority)
    })

    it("considers lapse count in priority", () => {
      const highLapseProgress = { ...mockProgress[0], lapseCount: 5 }
      const lowLapseProgress = { ...mockProgress[0], lapseCount: 0 }
      
      const highLapsePriority = getReviewPriority(highLapseProgress, now)
      const lowLapsePriority = getReviewPriority(lowLapseProgress, now)
      
      expect(highLapsePriority).toBeGreaterThan(lowLapsePriority)
    })

    it("considers easiness factor in priority", () => {
      const lowEFProgress = { ...mockProgress[0], easinessFactor: 1.3 }
      const highEFProgress = { ...mockProgress[0], easinessFactor: 2.5 }
      
      const lowEFPriority = getReviewPriority(lowEFProgress, now)
      const highEFPriority = getReviewPriority(highEFProgress, now)
      
      expect(lowEFPriority).toBeGreaterThan(highEFPriority)
    })
  })

  describe("calculateRetentionEstimate", () => {
    it("calculates reasonable retention estimates", () => {
      mockProgress.forEach(progress => {
        const retention = calculateRetentionEstimate(progress, now)
        expect(retention).toBeGreaterThanOrEqual(0)
        expect(retention).toBeLessThanOrEqual(100)
      })
    })

    it("gives higher retention for recent reviews", () => {
      const recentProgress = { ...mockProgress[0], lastReview: "2026-02-11T10:00:00.000Z" }
      const oldProgress = { ...mockProgress[0], lastReview: "2026-02-05T10:00:00.000Z" }
      
      const recentRetention = calculateRetentionEstimate(recentProgress, now)
      const oldRetention = calculateRetentionEstimate(oldProgress, now)
      
      expect(recentRetention).toBeGreaterThan(oldRetention)
    })

    it("considers average quality in retention", () => {
      const highQualityProgress = { ...mockProgress[0], averageQuality: 4.5 }
      const lowQualityProgress = { ...mockProgress[0], averageQuality: 2.0 }
      
      const highQualityRetention = calculateRetentionEstimate(highQualityProgress, now)
      const lowQualityRetention = calculateRetentionEstimate(lowQualityProgress, now)
      
      expect(highQualityRetention).toBeGreaterThan(lowQualityRetention)
    })

    it("handles progress without review history", () => {
      const noHistoryProgress = {
        ...mockProgress[0],
        lastReview: undefined,
        averageQuality: undefined,
        totalReviews: 0
      }
      
      const retention = calculateRetentionEstimate(noHistoryProgress, now)
      expect(retention).toBeGreaterThanOrEqual(0)
      expect(retention).toBeLessThanOrEqual(100)
    })
  })

  describe("formatSessionSummary", () => {
    const mockSession: ReviewSession = {
      id: "session_123",
      userId: "user_456",
      cardIds: ["card_1", "card_2", "card_3"],
      cardsReviewed: 3,
      cardsCorrect: 2,
      averageQuality: 3.8,
      totalTimeSeconds: 180,
      startedAt: "2026-02-12T10:00:00.000Z",
      completedAt: "2026-02-12T10:03:00.000Z",
      isCompleted: true
    }

    it("formats completed session summary", () => {
      const summary = formatSessionSummary(mockSession)
      
      expect(summary).toContain("3 cards")
      expect(summary).toContain("2 correct")
      expect(summary).toContain("67%") // 2/3 accuracy
      expect(summary).toContain("3:00") // 180 seconds
    })

    it("formats incomplete session summary", () => {
      const incompleteSession = {
        ...mockSession,
        isCompleted: false,
        completedAt: undefined,
        cardsReviewed: 1
      }
      
      const summary = formatSessionSummary(incompleteSession)
      expect(summary).toContain("1 of 3")
      expect(summary).toContain("In Progress")
    })

    it("handles zero-time sessions", () => {
      const quickSession = { ...mockSession, totalTimeSeconds: 0 }
      const summary = formatSessionSummary(quickSession)
      
      expect(summary).toContain("0:00")
    })

    it("formats long durations correctly", () => {
      const longSession = { ...mockSession, totalTimeSeconds: 3665 } // 1h 1m 5s
      const summary = formatSessionSummary(longSession)
      
      expect(summary).toContain("1:01:05")
    })
  })

  describe("generateFlashcardsFromMission", () => {
    it("generates flashcards from mission concepts", () => {
      const cards = generateFlashcardsFromMission("lakehouse-fundamentals", {
        title: "Lakehouse Fundamentals",
        concepts: [
          {
            question: "What is a lakehouse?",
            answer: "A data management architecture combining data lake and data warehouse.",
            difficulty: "B",
            type: "concept",
            tags: ["architecture"],
          },
          {
            question: "What storage format does Delta Lake use?",
            answer: "Parquet with a transaction log.",
            hint: "Think about ACID transactions",
            codeExample: "spark.read.format('delta').load('/path')",
            difficulty: "A",
            type: "code",
          },
        ],
      })

      expect(cards).toHaveLength(2)
      expect(cards[0].id).toBe("lakehouse-fundamentals_card_1")
      expect(cards[0].missionId).toBe("lakehouse-fundamentals")
      expect(cards[0].question).toBe("What is a lakehouse?")
      expect(cards[0].answer).toContain("data management architecture")
      expect(cards[0].difficulty).toBe("B")
      expect(cards[0].type).toBe("concept")
      expect(cards[0].tags).toContain("architecture")

      expect(cards[1].id).toBe("lakehouse-fundamentals_card_2")
      expect(cards[1].hint).toBe("Think about ACID transactions")
      expect(cards[1].codeExample).toContain("delta")
    })

    it("applies defaults for missing optional fields", () => {
      const cards = generateFlashcardsFromMission("test-mission", {
        title: "Test",
        concepts: [
          { question: "Q?", answer: "A" },
        ],
      })

      expect(cards[0].difficulty).toBe("B")
      expect(cards[0].type).toBe("concept")
      expect(cards[0].tags).toEqual(["test-mission"])
    })

    it("returns empty array for missions without concepts", () => {
      const cards = generateFlashcardsFromMission("empty-mission", {
        title: "Empty",
        concepts: [],
      })

      expect(cards).toHaveLength(0)
    })
  })
})