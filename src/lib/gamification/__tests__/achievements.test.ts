import { describe, expect, it } from "vitest"
import {
    ACHIEVEMENTS,
    checkAchievement,
    getLockedAchievements,
    getUnlockedAchievements,
} from "../achievements"
import { RANKS } from "../ranks"
import type { AchievementCondition, UserProfile } from "../types"

// Helper to create a test user profile
function createTestProfile(overrides?: Partial<UserProfile>): UserProfile {
  return {
    id: "test-user",
    displayName: "Test User",
    rank: RANKS[0],
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
    perfectQuizzes: 0,
    completedSideQuests: 0,
    createdAt: "2026-02-12T00:00:00Z",
    ...overrides,
  }
}

describe("Achievements", () => {
  describe("ACHIEVEMENTS constant", () => {
    it("has at least 20 achievements", () => {
      expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(20)
    })

    it("all achievements have unique IDs", () => {
      const ids = ACHIEVEMENTS.map((a) => a.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it("all achievements have positive XP bonuses", () => {
      ACHIEVEMENTS.forEach((achievement) => {
        expect(achievement.xpBonus).toBeGreaterThan(0)
      })
    })

    it("all achievements have non-empty titles and descriptions", () => {
      ACHIEVEMENTS.forEach((achievement) => {
        expect(achievement.title.length).toBeGreaterThan(0)
        expect(achievement.description.length).toBeGreaterThan(0)
      })
    })

    it("includes first-blood achievement", () => {
      const firstBlood = ACHIEVEMENTS.find((a) => a.id === "first-blood")
      expect(firstBlood).toBeDefined()
    })

    it("includes streak-7 achievement", () => {
      const streak7 = ACHIEVEMENTS.find((a) => a.id === "streak-7")
      expect(streak7).toBeDefined()
    })

    it("includes architect achievement (rank)", () => {
      const architect = ACHIEVEMENTS.find((a) => a.id === "architect")
      expect(architect).toBeDefined()
    })
  })

  describe("checkAchievement", () => {
    describe("mission-complete condition", () => {
      it("returns true when mission count requirement met", () => {
        const condition: AchievementCondition = {
          type: "mission-complete",
          count: 1,
        }
        const profile = createTestProfile({
          completedMissions: ["mission-1"],
        })
        expect(checkAchievement(condition, profile)).toBe(true)
      })

      it("returns false when mission count not met", () => {
        const condition: AchievementCondition = {
          type: "mission-complete",
          count: 5,
        }
        const profile = createTestProfile({
          completedMissions: ["mission-1", "mission-2"],
        })
        expect(checkAchievement(condition, profile)).toBe(false)
      })

      it("returns true when specific mission completed", () => {
        const condition: AchievementCondition = {
          type: "mission-complete",
          missionId: "mission-1",
        }
        const profile = createTestProfile({
          completedMissions: ["mission-1", "mission-2"],
        })
        expect(checkAchievement(condition, profile)).toBe(true)
      })

      it("returns false when specific mission not completed", () => {
        const condition: AchievementCondition = {
          type: "mission-complete",
          missionId: "mission-3",
        }
        const profile = createTestProfile({
          completedMissions: ["mission-1", "mission-2"],
        })
        expect(checkAchievement(condition, profile)).toBe(false)
      })
    })

    describe("quiz-perfect condition", () => {
      it("returns true when quiz perfect count met", () => {
        const condition: AchievementCondition = {
          type: "quiz-perfect",
          count: 1,
        }
        const profile = createTestProfile({
          perfectQuizzes: 3,
        })
        expect(checkAchievement(condition, profile)).toBe(true)
      })

      it("returns false when quiz perfect count not met", () => {
        const condition: AchievementCondition = {
          type: "quiz-perfect",
          count: 5,
        }
        const profile = createTestProfile({
          perfectQuizzes: 2,
        })
        expect(checkAchievement(condition, profile)).toBe(false)
      })

      it("returns false when no perfect quizzes", () => {
        const condition: AchievementCondition = {
          type: "quiz-perfect",
          count: 1,
        }
        const profile = createTestProfile()
        expect(checkAchievement(condition, profile)).toBe(false)
      })
    })

    describe("streak condition", () => {
      it("returns true when streak requirement met", () => {
        const condition: AchievementCondition = {
          type: "streak",
          days: 7,
        }
        const profile = createTestProfile({
          streakData: {
            currentStreak: 7,
            longestStreak: 10,
            lastActiveDate: "2026-02-12",
            freezesAvailable: 1,
            freezesUsed: 0,
          },
        })
        expect(checkAchievement(condition, profile)).toBe(true)
      })

      it("returns false when streak requirement not met", () => {
        const condition: AchievementCondition = {
          type: "streak",
          days: 30,
        }
        const profile = createTestProfile({
          streakData: {
            currentStreak: 15,
            longestStreak: 20,
            lastActiveDate: "2026-02-12",
            freezesAvailable: 1,
            freezesUsed: 0,
          },
        })
        expect(checkAchievement(condition, profile)).toBe(false)
      })
    })

    describe("rank-reached condition", () => {
      it("returns true when rank reached", () => {
        const condition: AchievementCondition = {
          type: "rank-reached",
          rankId: "operative",
        }
        const profile = createTestProfile({
          rank: RANKS[2], // Operative
          totalXp: 750,
        })
        expect(checkAchievement(condition, profile)).toBe(true)
      })

      it("returns true when rank exceeded", () => {
        const condition: AchievementCondition = {
          type: "rank-reached",
          rankId: "recruit",
        }
        const profile = createTestProfile({
          rank: RANKS[3], // Specialist
          totalXp: 2000,
        })
        expect(checkAchievement(condition, profile)).toBe(true)
      })

      it("returns false when rank not reached", () => {
        const condition: AchievementCondition = {
          type: "rank-reached",
          rankId: "commander",
        }
        const profile = createTestProfile({
          rank: RANKS[1], // Recruit
          totalXp: 250,
        })
        expect(checkAchievement(condition, profile)).toBe(false)
      })
    })

    describe("side-quest-complete condition", () => {
      it("returns true when side quest count met", () => {
        const condition: AchievementCondition = {
          type: "side-quest-complete",
          count: 5,
        }
        const profile = createTestProfile({
          completedSideQuests: 7,
        })
        expect(checkAchievement(condition, profile)).toBe(true)
      })

      it("returns false when side quest count not met", () => {
        const condition: AchievementCondition = {
          type: "side-quest-complete",
          count: 10,
        }
        const profile = createTestProfile({
          completedSideQuests: 4,
        })
        expect(checkAchievement(condition, profile)).toBe(false)
      })

      it("returns false when no side quests completed", () => {
        const condition: AchievementCondition = {
          type: "side-quest-complete",
          count: 1,
        }
        const profile = createTestProfile()
        expect(checkAchievement(condition, profile)).toBe(false)
      })
    })

    describe("challenge-complete condition", () => {
      it("returns true when challenge count met", () => {
        const condition: AchievementCondition = {
          type: "challenge-complete",
          count: 5,
        }
        const profile = createTestProfile({
          completedChallenges: ["c1", "c2", "c3", "c4", "c5"],
        })
        expect(checkAchievement(condition, profile)).toBe(true)
      })

      it("returns false when challenge count not met", () => {
        const condition: AchievementCondition = {
          type: "challenge-complete",
          count: 10,
        }
        const profile = createTestProfile({
          completedChallenges: ["c1", "c2", "c3"],
        })
        expect(checkAchievement(condition, profile)).toBe(false)
      })

      it("returns true when category-specific challenge count met", () => {
        const condition: AchievementCondition = {
          type: "challenge-complete",
          category: "pyspark",
          count: 3,
        }
        const profile = createTestProfile({
          completedChallenges: [
            "pyspark-1",
            "pyspark-2",
            "pyspark-3",
            "sql-1",
          ],
        })
        expect(checkAchievement(condition, profile)).toBe(true)
      })
    })
  })

  describe("getUnlockedAchievements", () => {
    it("returns empty array for new user", () => {
      const profile = createTestProfile()
      const unlocked = getUnlockedAchievements(profile)
      expect(unlocked).toEqual([])
    })

    it("returns achievements user has unlocked", () => {
      const profile = createTestProfile({
        completedMissions: ["mission-1"],
      })
      const unlocked = getUnlockedAchievements(profile)
      const firstBlood = unlocked.find((a) => a.id === "first-blood")
      expect(firstBlood).toBeDefined()
    })

    it("returns multiple unlocked achievements", () => {
      const profile = createTestProfile({
        completedMissions: ["m1", "m2", "m3", "m4", "m5"],
        rank: RANKS[2], // Operative
        totalXp: 750,
      })
      const unlocked = getUnlockedAchievements(profile)
      expect(unlocked.length).toBeGreaterThan(0)
    })

    it("does not return locked achievements", () => {
      const profile = createTestProfile({
        completedMissions: ["mission-1"],
      })
      const unlocked = getUnlockedAchievements(profile)
      const grandmaster = unlocked.find((a) => a.id === "grandmaster")
      expect(grandmaster).toBeUndefined()
    })
  })

  describe("getLockedAchievements", () => {
    it("returns all achievements for new user", () => {
      const profile = createTestProfile()
      const locked = getLockedAchievements(profile)
      expect(locked.length).toBe(ACHIEVEMENTS.length)
    })

    it("excludes unlocked achievements", () => {
      const profile = createTestProfile({
        completedMissions: ["mission-1"],
      })
      const locked = getLockedAchievements(profile)
      const firstBlood = locked.find((a) => a.id === "first-blood")
      expect(firstBlood).toBeUndefined()
    })

    it("returns fewer locked achievements as user progresses", () => {
      const profile = createTestProfile({
        completedMissions: ["m1", "m2", "m3", "m4", "m5"],
        completedChallenges: ["c1", "c2", "c3"],
        rank: RANKS[2],
        totalXp: 750,
      })
      const locked = getLockedAchievements(profile)
      expect(locked.length).toBeLessThan(ACHIEVEMENTS.length)
    })
  })
})
