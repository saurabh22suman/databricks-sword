import { describe, it, expect } from "vitest"
import { findResumeMission } from "../resume"
import type { SandboxData } from "@/lib/sandbox/types"

function makeSandbox(overrides: Partial<SandboxData> = {}): SandboxData {
  return {
    missionProgress: {},
    challengeResults: {},
    achievements: [],
    userStats: {
      totalXp: 0,
      totalMissionsCompleted: 0,
      totalChallengesCompleted: 0,
      totalAchievements: 0,
    },
    streakData: {
      currentStreak: 0,
      longestStreak: 0,
      freezesAvailable: 2,
      lastActiveDate: "2026-06-15",
    },
    ...overrides,
  } as SandboxData
}

describe("findResumeMission", () => {
  it("returns null when sandbox is null", () => {
    expect(findResumeMission(null)).toBeNull()
  })

  it("returns null when no missions started", () => {
    expect(findResumeMission(makeSandbox())).toBeNull()
  })

  it("returns null when all missions are completed", () => {
    const sandbox = makeSandbox({
      missionProgress: {
        "mission-a": {
          started: true,
          completed: true,
          stageProgress: {},
          sideQuestsCompleted: [],
          totalXpEarned: 100,
          completedAt: "2026-06-14T10:00:00Z",
        },
      },
    })
    expect(findResumeMission(sandbox)).toBeNull()
  })

  it("returns the most recently active in-progress mission", () => {
    const sandbox = makeSandbox({
      missionProgress: {
        "old-mission": {
          started: true,
          completed: false,
          stageProgress: {
            "stage-1": { completed: true, completedAt: "2026-06-10T10:00:00Z", xpEarned: 50, codeAttempts: [], hintsUsed: 0 },
            "stage-2": { completed: false, xpEarned: 0, codeAttempts: [], hintsUsed: 0 },
          },
          sideQuestsCompleted: [],
          totalXpEarned: 50,
        },
        "new-mission": {
          started: true,
          completed: false,
          stageProgress: {
            "stage-1": { completed: true, completedAt: "2026-06-14T10:00:00Z", xpEarned: 50, codeAttempts: [], hintsUsed: 0 },
            "stage-2": { completed: false, xpEarned: 0, codeAttempts: [], hintsUsed: 0 },
          },
          sideQuestsCompleted: [],
          totalXpEarned: 50,
        },
      },
    })
    const result = findResumeMission(sandbox)
    expect(result?.missionId).toBe("new-mission")
    expect(result?.currentStageId).toBe("stage-2")
  })

  it("returns the first uncompleted stage as currentStageId", () => {
    const sandbox = makeSandbox({
      missionProgress: {
        m1: {
          started: true,
          completed: false,
          stageProgress: {
            "stage-1": { completed: true, completedAt: "2026-06-14T10:00:00Z", xpEarned: 50, codeAttempts: [], hintsUsed: 0 },
            "stage-2": { completed: false, xpEarned: 0, codeAttempts: [], hintsUsed: 0 },
            "stage-3": { completed: false, xpEarned: 0, codeAttempts: [], hintsUsed: 0 },
          },
          sideQuestsCompleted: [],
          totalXpEarned: 50,
        },
      },
    })
    const result = findResumeMission(sandbox)
    expect(result?.currentStageId).toBe("stage-2")
    expect(result?.completedStages).toBe(1)
    expect(result?.totalStages).toBe(3)
  })

  it("skips missions whose stages are all completed but flag is not set", () => {
    const sandbox = makeSandbox({
      missionProgress: {
        ghost: {
          started: true,
          completed: false,
          stageProgress: {
            "stage-1": { completed: true, completedAt: "2026-06-10T10:00:00Z", xpEarned: 50, codeAttempts: [], hintsUsed: 0 },
          },
          sideQuestsCompleted: [],
          totalXpEarned: 50,
        },
        active: {
          started: true,
          completed: false,
          stageProgress: {
            "stage-1": { completed: true, completedAt: "2026-06-14T10:00:00Z", xpEarned: 50, codeAttempts: [], hintsUsed: 0 },
            "stage-2": { completed: false, xpEarned: 0, codeAttempts: [], hintsUsed: 0 },
          },
          sideQuestsCompleted: [],
          totalXpEarned: 50,
        },
      },
    })
    const result = findResumeMission(sandbox)
    expect(result?.missionId).toBe("active")
  })
})
