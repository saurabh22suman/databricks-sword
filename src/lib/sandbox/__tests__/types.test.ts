import { describe, expect, it } from "vitest"
import type {
    ChallengeResult,
    MissionProgress,
    SandboxData,
    StageProgress,
    UserStats,
} from "../types"
import {
    ChallengeResultSchema,
    MissionProgressSchema,
    SandboxDataSchema,
    StageProgressSchema,
    UserStatsSchema,
} from "../types"

describe("Sandbox Types", () => {
  describe("StageProgressSchema", () => {
    it("validates correct stage progress", () => {
      const stageProgress: StageProgress = {
        completed: true,
        xpEarned: 50,
        codeAttempts: ["print('hello')", "df.show()"],
        hintsUsed: 1,
        completedAt: "2026-02-12T10:00:00Z",
      }

      expect(() => StageProgressSchema.parse(stageProgress)).not.toThrow()
    })

    it("validates minimal stage progress", () => {
      const stageProgress: StageProgress = {
        completed: false,
        xpEarned: 0,
        codeAttempts: [],
        hintsUsed: 0,
      }

      expect(() => StageProgressSchema.parse(stageProgress)).not.toThrow()
    })

    it("rejects negative XP", () => {
      const invalid = {
        completed: false,
        xpEarned: -10,
        codeAttempts: [],
        hintsUsed: 0,
      }

      expect(() => StageProgressSchema.parse(invalid)).toThrow()
    })

    it("rejects negative hints", () => {
      const invalid = {
        completed: false,
        xpEarned: 0,
        codeAttempts: [],
        hintsUsed: -1,
      }

      expect(() => StageProgressSchema.parse(invalid)).toThrow()
    })
  })

  describe("MissionProgressSchema", () => {
    it("validates correct mission progress", () => {
      const missionProgress: MissionProgress = {
        started: true,
        completed: false,
        currentStageId: "stage-2",
        stageProgress: {
          "stage-1": {
            completed: true,
            xpEarned: 50,
            codeAttempts: [],
            hintsUsed: 0,
            completedAt: "2026-02-12T10:00:00Z",
          },
          "stage-2": {
            completed: false,
            xpEarned: 0,
            codeAttempts: ["attempt 1"],
            hintsUsed: 1,
          },
        },
        sideQuestsCompleted: ["oss-deep-dive-1"],
        totalXpEarned: 50,
        startedAt: "2026-02-12T09:00:00Z",
      }

      expect(() => MissionProgressSchema.parse(missionProgress)).not.toThrow()
    })

    it("validates completed mission progress", () => {
      const missionProgress: MissionProgress = {
        started: true,
        completed: true,
        currentStageId: "stage-3",
        stageProgress: {},
        sideQuestsCompleted: [],
        totalXpEarned: 300,
        startedAt: "2026-02-12T09:00:00Z",
        completedAt: "2026-02-12T11:00:00Z",
      }

      expect(() => MissionProgressSchema.parse(missionProgress)).not.toThrow()
    })

    it("rejects negative total XP", () => {
      const invalid = {
        started: false,
        completed: false,
        stageProgress: {},
        sideQuestsCompleted: [],
        totalXpEarned: -50,
      }

      expect(() => MissionProgressSchema.parse(invalid)).toThrow()
    })
  })

  describe("ChallengeResultSchema", () => {
    it("validates correct challenge result", () => {
      const result: ChallengeResult = {
        attempted: true,
        completed: true,
        xpEarned: 100,
        hintsUsed: 0,
        attempts: 2,
        completionCount: 2,
        bestScore: 95,
        completedAt: "2026-02-12T10:00:00Z",
      }

      expect(() => ChallengeResultSchema.parse(result)).not.toThrow()
    })

    it("validates minimal challenge result", () => {
      const result: ChallengeResult = {
        attempted: true,
        completed: false,
        xpEarned: 0,
        hintsUsed: 2,
        attempts: 5,
        completionCount: 0,
      }

      expect(() => ChallengeResultSchema.parse(result)).not.toThrow()
    })

    it("rejects negative attempts", () => {
      const invalid = {
        attempted: true,
        completed: false,
        xpEarned: 0,
        hintsUsed: 0,
        attempts: -1,
      }

      expect(() => ChallengeResultSchema.parse(invalid)).toThrow()
    })

    it("rejects score above 100", () => {
      const invalid = {
        attempted: true,
        completed: true,
        xpEarned: 100,
        hintsUsed: 0,
        attempts: 1,
        bestScore: 150,
      }

      expect(() => ChallengeResultSchema.parse(invalid)).toThrow()
    })
  })

  describe("UserStatsSchema", () => {
    it("validates correct user stats", () => {
      const stats: UserStats = {
        totalXp: 1500,
        totalMissionsCompleted: 3,
        totalChallengesCompleted: 10,
        totalAchievements: 5,
        currentStreak: 7,
        longestStreak: 14,
        totalTimeSpentMinutes: 240,
      }

      expect(() => UserStatsSchema.parse(stats)).not.toThrow()
    })

    it("validates zero stats", () => {
      const stats: UserStats = {
        totalXp: 0,
        totalMissionsCompleted: 0,
        totalChallengesCompleted: 0,
        totalAchievements: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalTimeSpentMinutes: 0,
      }

      expect(() => UserStatsSchema.parse(stats)).not.toThrow()
    })

    it("rejects negative XP", () => {
      const invalid = {
        totalXp: -100,
        totalMissionsCompleted: 0,
        totalChallengesCompleted: 0,
        totalAchievements: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalTimeSpentMinutes: 0,
      }

      expect(() => UserStatsSchema.parse(invalid)).toThrow()
    })
  })

  describe("SandboxDataSchema", () => {
    it("validates complete sandbox data", () => {
      const sandboxData: SandboxData = {
        version: 1,
        missionProgress: {
          "mission-1": {
            started: true,
            completed: true,
            stageProgress: {},
            sideQuestsCompleted: [],
            totalXpEarned: 300,
            startedAt: "2026-02-12T09:00:00Z",
            completedAt: "2026-02-12T11:00:00Z",
          },
        },
        challengeResults: {
          "challenge-1": {
            attempted: true,
            completed: true,
            xpEarned: 100,
            hintsUsed: 0,
            attempts: 1,
            completionCount: 1,
            completedAt: "2026-02-12T12:00:00Z",
          },
        },
        userStats: {
          totalXp: 400,
          totalMissionsCompleted: 1,
          totalChallengesCompleted: 1,
          totalAchievements: 2,
          currentStreak: 5,
          longestStreak: 10,
          totalTimeSpentMinutes: 120,
        },
        streakData: {
          currentStreak: 5,
          longestStreak: 10,
          lastActiveDate: "2026-02-12",
          freezesAvailable: 2,
          freezesUsed: 0,
        },
        achievements: ["first-blood", "mission-clear"],
        flashcardProgress: {
          "card-1": {
            lastReviewed: "2026-02-12T10:00:00Z",
            interval: 3,
            easeFactor: 2.5,
            repetitions: 2,
            nextReview: "2026-02-15T10:00:00Z",
          },
        },
        lastSynced: "2026-02-12T12:00:00Z",
      }

      expect(() => SandboxDataSchema.parse(sandboxData)).not.toThrow()
    })

    it("validates empty sandbox data", () => {
      const sandboxData: SandboxData = {
        version: 1,
        missionProgress: {},
        challengeResults: {},
        userStats: {
          totalXp: 0,
          totalMissionsCompleted: 0,
          totalChallengesCompleted: 0,
          totalAchievements: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalTimeSpentMinutes: 0,
        },
        streakData: {
          currentStreak: 0,
          longestStreak: 0,
          lastActiveDate: "",
          freezesAvailable: 2,
          freezesUsed: 0,
        },
        achievements: [],
        flashcardProgress: {},
        lastSynced: null,
      }

      expect(() => SandboxDataSchema.parse(sandboxData)).not.toThrow()
    })

    it("rejects invalid version", () => {
      const invalid = {
        version: 0,
        missionProgress: {},
        challengeResults: {},
        userStats: {
          totalXp: 0,
          totalMissionsCompleted: 0,
          totalChallengesCompleted: 0,
          totalAchievements: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalTimeSpentMinutes: 0,
        },
        streakData: {
          currentStreak: 0,
          longestStreak: 0,
          lastActiveDate: "",
          freezesAvailable: 2,
          freezesUsed: 0,
        },
        achievements: [],
        flashcardProgress: {},
        lastSynced: null,
      }

      expect(() => SandboxDataSchema.parse(invalid)).toThrow()
    })

    it("rejects invalid nested data", () => {
      const invalid = {
        version: 1,
        missionProgress: {},
        challengeResults: {},
        userStats: {
          totalXp: -100, // invalid
          totalMissionsCompleted: 0,
          totalChallengesCompleted: 0,
          totalAchievements: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalTimeSpentMinutes: 0,
        },
        streakData: {
          currentStreak: 0,
          longestStreak: 0,
          lastActiveDate: "",
          freezesAvailable: 2,
          freezesUsed: 0,
        },
        achievements: [],
        flashcardProgress: {},
        lastSynced: null,
      }

      expect(() => SandboxDataSchema.parse(invalid)).toThrow()
    })
  })
})
