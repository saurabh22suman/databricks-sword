import { describe, expect, it } from "vitest"
import {
    AchievementConditionSchema,
    AchievementSchema,
    RankSchema,
    StreakDataSchema,
    UserProfileSchema,
    XpEventSchema,
} from "../types"

describe("Gamification Type Schemas", () => {
  describe("RankSchema", () => {
    it("validates a valid rank object", () => {
      const validRank = {
        id: "cadet",
        title: "Cadet",
        minXp: 0,
        icon: "cadet",
        badge: {
          src: "/badges/rank-cadet.png",
          alt: "Cadet Badge - Raw gray steel chevron with faint cyan edge",
        },
        description: "A simple, glowing blue star on a circular badge, representing a new beginning."
      }
      expect(() => RankSchema.parse(validRank)).not.toThrow()
    })

    it("rejects rank with negative minXp", () => {
      const invalidRank = {
        id: "cadet",
        title: "Cadet",
        minXp: -100,
        icon: "cadet",
      }
      expect(() => RankSchema.parse(invalidRank)).toThrow()
    })

    it("rejects rank missing required fields", () => {
      const invalidRank = {
        id: "cadet",
        title: "Cadet",
      }
      expect(() => RankSchema.parse(invalidRank)).toThrow()
    })
  })

  describe("AchievementConditionSchema", () => {
    it("validates mission-complete condition", () => {
      const condition = {
        type: "mission-complete",
        missionId: "mission-1",
        count: 5,
      }
      expect(() => AchievementConditionSchema.parse(condition)).not.toThrow()
    })

    it("validates quiz-perfect condition", () => {
      const condition = {
        type: "quiz-perfect",
        count: 3,
      }
      expect(() => AchievementConditionSchema.parse(condition)).not.toThrow()
    })

    it("validates streak condition", () => {
      const condition = {
        type: "streak",
        days: 7,
      }
      expect(() => AchievementConditionSchema.parse(condition)).not.toThrow()
    })

    it("validates rank-reached condition", () => {
      const condition = {
        type: "rank-reached",
        rankId: "architect",
      }
      expect(() => AchievementConditionSchema.parse(condition)).not.toThrow()
    })

    it("validates side-quest-complete condition", () => {
      const condition = {
        type: "side-quest-complete",
        count: 10,
      }
      expect(() => AchievementConditionSchema.parse(condition)).not.toThrow()
    })

    it("validates challenge-complete condition", () => {
      const condition = {
        type: "challenge-complete",
        category: "pyspark",
        count: 5,
      }
      expect(() => AchievementConditionSchema.parse(condition)).not.toThrow()
    })

    it("rejects invalid condition type", () => {
      const invalidCondition = {
        type: "invalid-type",
        count: 5,
      }
      expect(() => AchievementConditionSchema.parse(invalidCondition)).toThrow()
    })
  })

  describe("AchievementSchema", () => {
    it("validates a valid achievement object", () => {
      const validAchievement = {
        id: "first-blood",
        title: "First Blood",
        description: "Complete your first mission",
        icon: "sword",
        xpBonus: 50,
        condition: {
          type: "mission-complete",
          count: 1,
        },
      }
      expect(() => AchievementSchema.parse(validAchievement)).not.toThrow()
    })

    it("rejects achievement with negative xpBonus", () => {
      const invalidAchievement = {
        id: "first-blood",
        title: "First Blood",
        description: "Complete your first mission",
        icon: "sword",
        xpBonus: -50,
        condition: {
          type: "mission-complete",
          count: 1,
        },
      }
      expect(() => AchievementSchema.parse(invalidAchievement)).toThrow()
    })
  })

  describe("StreakDataSchema", () => {
    it("validates valid streak data", () => {
      const validStreak = {
        currentStreak: 5,
        longestStreak: 10,
        lastActiveDate: "2026-02-12",
        freezesAvailable: 2,
        freezesUsed: 0,
      }
      expect(() => StreakDataSchema.parse(validStreak)).not.toThrow()
    })

    it("rejects negative streak values", () => {
      const invalidStreak = {
        currentStreak: -1,
        longestStreak: 10,
        lastActiveDate: "2026-02-12",
        freezesAvailable: 2,
        freezesUsed: 0,
      }
      expect(() => StreakDataSchema.parse(invalidStreak)).toThrow()
    })

    it("rejects more than max freezes available", () => {
      const invalidStreak = {
        currentStreak: 5,
        longestStreak: 10,
        lastActiveDate: "2026-02-12",
        freezesAvailable: 3, // max is 2
        freezesUsed: 0,
      }
      expect(() => StreakDataSchema.parse(invalidStreak)).toThrow()
    })
  })

  describe("UserProfileSchema", () => {
    it("validates a valid user profile", () => {
      const validProfile = {
        id: "user-123",
        displayName: "CodeNinja",
        rank: {
          id: "operative",
          title: "Operative",
          minXp: 500,
          icon: "operative",
          badge: {
            src: "/badges/rank-operative.png",
            alt: "Operative Badge - Hexagonal badge with circuit traces and cyan glow",
          },
          description: "A triangular badge featuring a blade, a microchip, and a gear, indicating a skilled, action-oriented role."
        },
        totalXp: 750,
        achievements: ["first-blood", "streak-7"],
        streakData: {
          currentStreak: 7,
          longestStreak: 10,
          lastActiveDate: "2026-02-12",
          freezesAvailable: 1,
          freezesUsed: 0,
        },
        completedMissions: ["mission-1", "mission-2"],
        completedChallenges: ["challenge-1"],
        createdAt: "2026-01-01T00:00:00Z",
      }
      expect(() => UserProfileSchema.parse(validProfile)).not.toThrow()
    })

    it("validates user profile with optional avatarUrl", () => {
      const validProfile = {
        id: "user-123",
        displayName: "CodeNinja",
        avatarUrl: "https://example.com/avatar.png",
        rank: {
          id: "cadet",
          title: "Cadet",
          minXp: 0,
          icon: "cadet",
          badge: {
            src: "/badges/rank-cadet.png",
            alt: "Cadet Badge - Raw gray steel chevron with faint cyan edge",
          },
          description: "A simple, glowing blue star on a circular badge, representing a new beginning."
        },
        totalXp: 0,
        achievements: [],
        streakData: {
          currentStreak: 0,
          longestStreak: 0,
          lastActiveDate: "2026-02-12",
          freezesAvailable: 0,
          freezesUsed: 0,
        },
        completedMissions: [],
        completedChallenges: [],
        createdAt: "2026-02-12T00:00:00Z",
      }
      expect(() => UserProfileSchema.parse(validProfile)).not.toThrow()
    })
  })

  describe("XpEventSchema", () => {
    it("validates a valid XP event", () => {
      const validEvent = {
        type: "mission",
        amount: 200,
        multiplier: 1.5,
        source: "mission-1",
        timestamp: "2026-02-12T10:30:00Z",
      }
      expect(() => XpEventSchema.parse(validEvent)).not.toThrow()
    })

    it("rejects negative XP amount", () => {
      const invalidEvent = {
        type: "mission",
        amount: -200,
        multiplier: 1.0,
        source: "mission-1",
        timestamp: "2026-02-12T10:30:00Z",
      }
      expect(() => XpEventSchema.parse(invalidEvent)).toThrow()
    })

    it("rejects multiplier less than 1", () => {
      const invalidEvent = {
        type: "mission",
        amount: 200,
        multiplier: 0.5,
        source: "mission-1",
        timestamp: "2026-02-12T10:30:00Z",
      }
      expect(() => XpEventSchema.parse(invalidEvent)).toThrow()
    })

    it("validates all XP event types", () => {
      const types = ["stage", "mission", "challenge", "quiz-bonus", "streak", "achievement"] as const
      types.forEach((type) => {
        const event = {
          type,
          amount: 100,
          multiplier: 1.0,
          source: "test",
          timestamp: "2026-02-12T10:30:00Z",
        }
        expect(() => XpEventSchema.parse(event)).not.toThrow()
      })
    })
  })
})
