import { describe, expect, it } from "vitest"
import { initializeSandbox, recalculateStats } from "../storage"

describe("recalculateStats", () => {
  it("returns zeroed stats for empty sandbox", () => {
    const sandbox = initializeSandbox()
    const result = recalculateStats(sandbox)

    expect(result.userStats.totalXp).toBe(0)
    expect(result.userStats.totalMissionsCompleted).toBe(0)
    expect(result.userStats.totalChallengesCompleted).toBe(0)
    expect(result.userStats.totalAchievements).toBe(0)
  })

  it("sums XP from completed missions", () => {
    const sandbox = initializeSandbox()
    sandbox.missionProgress["mission-a"] = {
      started: true,
      completed: true,
      stageProgress: {
        "01-briefing": { completed: true, xpEarned: 50, codeAttempts: [], hintsUsed: 0 },
        "02-code": { completed: true, xpEarned: 100, codeAttempts: [], hintsUsed: 1 },
      },
      sideQuestsCompleted: [],
      totalXpEarned: 150,
      completedAt: "2026-01-01T00:00:00Z",
    }
    sandbox.missionProgress["mission-b"] = {
      started: true,
      completed: false,
      stageProgress: {
        "01-briefing": { completed: true, xpEarned: 25, codeAttempts: [], hintsUsed: 0 },
      },
      sideQuestsCompleted: [],
      totalXpEarned: 25,
    }

    const result = recalculateStats(sandbox)

    // totalXp = sum of all stage xpEarned across all missions
    expect(result.userStats.totalXp).toBe(175) // 50 + 100 + 25
    expect(result.userStats.totalMissionsCompleted).toBe(1) // only mission-a is completed
  })

  it("sums XP from completed challenges", () => {
    const sandbox = initializeSandbox()
    sandbox.challengeResults["challenge-1"] = {
      attempted: true,
      completed: true,
      xpEarned: 75,
      hintsUsed: 0,
      attempts: 1,
    }
    sandbox.challengeResults["challenge-2"] = {
      attempted: true,
      completed: true,
      xpEarned: 50,
      hintsUsed: 2,
      attempts: 3,
    }
    sandbox.challengeResults["challenge-3"] = {
      attempted: true,
      completed: false,
      xpEarned: 0,
      hintsUsed: 1,
      attempts: 1,
    }

    const result = recalculateStats(sandbox)

    // totalXp from challenges only
    expect(result.userStats.totalXp).toBe(125) // 75 + 50
    expect(result.userStats.totalChallengesCompleted).toBe(2) // challenge-3 incomplete
  })

  it("combines mission + challenge XP", () => {
    const sandbox = initializeSandbox()
    sandbox.missionProgress["mission-a"] = {
      started: true,
      completed: true,
      stageProgress: {
        "01-briefing": { completed: true, xpEarned: 100, codeAttempts: [], hintsUsed: 0 },
      },
      sideQuestsCompleted: [],
      totalXpEarned: 100,
      completedAt: "2026-01-01T00:00:00Z",
    }
    sandbox.challengeResults["challenge-1"] = {
      attempted: true,
      completed: true,
      xpEarned: 50,
      hintsUsed: 0,
      attempts: 1,
    }

    const result = recalculateStats(sandbox)

    expect(result.userStats.totalXp).toBe(150) // 100 + 50
    expect(result.userStats.totalMissionsCompleted).toBe(1)
    expect(result.userStats.totalChallengesCompleted).toBe(1)
  })

  it("counts achievements correctly", () => {
    const sandbox = initializeSandbox()
    sandbox.achievements = ["first-blood", "mission-clear", "streak-3"]

    const result = recalculateStats(sandbox)

    expect(result.userStats.totalAchievements).toBe(3)
  })

  it("syncs streak data into userStats", () => {
    const sandbox = initializeSandbox()
    sandbox.streakData = {
      currentStreak: 7,
      longestStreak: 14,
      lastActiveDate: "2026-02-13",
      freezesAvailable: 1,
      freezesUsed: 1,
    }

    const result = recalculateStats(sandbox)

    expect(result.userStats.currentStreak).toBe(7)
    expect(result.userStats.longestStreak).toBe(14)
  })

  it("preserves non-computed fields", () => {
    const sandbox = initializeSandbox()
    sandbox.userStats.totalTimeSpentMinutes = 120
    sandbox.lastSynced = "2026-02-13T09:00:00Z"

    const result = recalculateStats(sandbox)

    expect(result.userStats.totalTimeSpentMinutes).toBe(120)
    expect(result.lastSynced).toBe("2026-02-13T09:00:00Z")
    expect(result.version).toBe(1)
  })

  it("does not mutate the input sandbox", () => {
    const sandbox = initializeSandbox()
    sandbox.missionProgress["mission-a"] = {
      started: true,
      completed: true,
      stageProgress: {
        "01-briefing": { completed: true, xpEarned: 100, codeAttempts: [], hintsUsed: 0 },
      },
      sideQuestsCompleted: [],
      totalXpEarned: 100,
      completedAt: "2026-01-01T00:00:00Z",
    }

    const originalXp = sandbox.userStats.totalXp
    recalculateStats(sandbox)

    expect(sandbox.userStats.totalXp).toBe(originalXp)
  })
})
