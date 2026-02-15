import { beforeEach, describe, expect, it, vi } from "vitest"
import { initializeSandbox } from "../../sandbox/storage"
import type { SandboxData } from "../../sandbox/types"

// Mock sandbox storage
vi.mock("../../sandbox/storage", async () => {
  const actual = await vi.importActual("../../sandbox/storage")
  return {
    ...actual,
    loadSandbox: vi.fn(),
    saveSandbox: vi.fn(),
    updateSandbox: vi.fn(),
  }
})

import { loadSandbox, saveSandbox, updateSandbox } from "../../sandbox/storage"
import {
    awardChallengeXp,
    awardMissionXp,
    awardStageXp,
} from "../xpService"

describe("XP Event Service", () => {
  let sandbox: SandboxData

  beforeEach(() => {
    vi.clearAllMocks()
    sandbox = initializeSandbox()
    vi.mocked(loadSandbox).mockReturnValue(sandbox)
    // Make updateSandbox actually call the updater and update the sandbox
    // so subsequent loadSandbox calls (e.g. from checkAndUnlockAchievements)
    // return the updated state
    vi.mocked(updateSandbox).mockImplementation((updater) => {
      const current = vi.mocked(loadSandbox)() ?? initializeSandbox()
      sandbox = updater(current)
      vi.mocked(loadSandbox).mockReturnValue(sandbox)
      vi.mocked(saveSandbox).mockImplementation(() => {})
      saveSandbox(sandbox)
    })
  })

  describe("awardStageXp", () => {
    it("returns an XpEvent with correct type and source", () => {
      const event = awardStageXp("mission-1", "01-briefing", 50)

      expect(event.type).toBe("stage")
      expect(event.source).toBe("mission-1/01-briefing")
      expect(event.amount).toBe(50)
      expect(event.multiplier).toBeGreaterThanOrEqual(1)
      expect(event.timestamp).toBeTruthy()
    })

    it("applies streak multiplier to XP amount", () => {
      sandbox.streakData.currentStreak = 7 // 1.5x multiplier
      vi.mocked(loadSandbox).mockReturnValue(sandbox)

      const event = awardStageXp("mission-1", "01-briefing", 100)

      expect(event.multiplier).toBe(1.5)
      expect(event.amount).toBe(150) // 100 * 1.5
    })

    it("adds first-try bonus when option is set", () => {
      const event = awardStageXp("mission-1", "01-briefing", 100, { firstTry: true })

      // 100 base + 15 first-try bonus = 115
      expect(event.amount).toBe(115)
    })

    it("adds no-hints bonus when option is set", () => {
      const event = awardStageXp("mission-1", "01-briefing", 100, { noHints: true })

      // 100 base + 50 no-hints bonus = 150
      expect(event.amount).toBe(150)
    })

    it("writes XP to sandbox via updateSandbox", () => {
      awardStageXp("mission-1", "01-briefing", 50)

      expect(updateSandbox).toHaveBeenCalled()
      // Verify saveSandbox was called with updated totalXp
      expect(saveSandbox).toHaveBeenCalledWith(
        expect.objectContaining({
          userStats: expect.objectContaining({
            totalXp: 50,
          }),
        }),
      )
    })

    it("accumulates XP with existing sandbox XP", () => {
      sandbox.userStats.totalXp = 200
      vi.mocked(loadSandbox).mockReturnValue(sandbox)

      awardStageXp("mission-1", "02-diagram", 75)

      expect(saveSandbox).toHaveBeenCalledWith(
        expect.objectContaining({
          userStats: expect.objectContaining({
            totalXp: 275,
          }),
        }),
      )
    })

    it("records stage progress with xpEarned and completedAt", () => {
      awardStageXp("mission-1", "01-briefing", 50)

      expect(saveSandbox).toHaveBeenCalledWith(
        expect.objectContaining({
          missionProgress: expect.objectContaining({
            "mission-1": expect.objectContaining({
              stageProgress: expect.objectContaining({
                "01-briefing": expect.objectContaining({
                  xpEarned: 50,
                  completed: true,
                }),
              }),
            }),
          }),
        }),
      )
    })
  })

  describe("awardMissionXp", () => {
    it("returns an XpEvent with type mission", () => {
      const event = awardMissionXp("mission-1", 200)

      expect(event.type).toBe("mission")
      expect(event.source).toBe("mission-1")
      expect(event.amount).toBe(200)
    })

    it("marks mission as completed in sandbox", () => {
      awardMissionXp("mission-1", 200)

      expect(saveSandbox).toHaveBeenCalledWith(
        expect.objectContaining({
          missionProgress: expect.objectContaining({
            "mission-1": expect.objectContaining({
              completed: true,
            }),
          }),
          userStats: expect.objectContaining({
            totalMissionsCompleted: 1,
          }),
        }),
      )
    })

    it("applies streak multiplier", () => {
      sandbox.streakData.currentStreak = 14 // 2.0x
      vi.mocked(loadSandbox).mockReturnValue(sandbox)

      const event = awardMissionXp("mission-1", 100)

      expect(event.multiplier).toBe(2.0)
      expect(event.amount).toBe(200)
    })
  })

  describe("awardChallengeXp", () => {
    it("returns an XpEvent with type challenge", () => {
      const event = awardChallengeXp("challenge-1", 75)

      expect(event.type).toBe("challenge")
      expect(event.source).toBe("challenge-1")
    })

    it("records challenge result in sandbox", () => {
      awardChallengeXp("challenge-1", 75)

      expect(saveSandbox).toHaveBeenCalledWith(
        expect.objectContaining({
          challengeResults: expect.objectContaining({
            "challenge-1": expect.objectContaining({
              completed: true,
              xpEarned: 75,
            }),
          }),
          userStats: expect.objectContaining({
            totalChallengesCompleted: 1,
          }),
        }),
      )
    })

    it("awards XP on second completion (within cap)", () => {
      // First completion
      awardChallengeXp("challenge-1", 75)
      // Second completion
      const event = awardChallengeXp("challenge-1", 75)
      expect(event.amount).toBe(75)
      // xpEarned should be cumulative: 75 + 75 = 150
      expect(sandbox.challengeResults["challenge-1"].xpEarned).toBe(150)
      expect(sandbox.challengeResults["challenge-1"].completionCount).toBe(2)
    })

    it("awards 0 XP after max completions (cap at 2)", () => {
      // First and second completions earn XP
      awardChallengeXp("challenge-1", 75)
      awardChallengeXp("challenge-1", 75)
      // Third completion should earn 0 XP
      const event = awardChallengeXp("challenge-1", 75)
      expect(event.amount).toBe(0)
      // xpEarned stays at 150 (not 225)
      expect(sandbox.challengeResults["challenge-1"].xpEarned).toBe(150)
      expect(sandbox.challengeResults["challenge-1"].completionCount).toBe(3)
    })

    it("increments completionCount on every completion", () => {
      awardChallengeXp("challenge-1", 75)
      expect(sandbox.challengeResults["challenge-1"].completionCount).toBe(1)

      awardChallengeXp("challenge-1", 75)
      expect(sandbox.challengeResults["challenge-1"].completionCount).toBe(2)

      awardChallengeXp("challenge-1", 75)
      expect(sandbox.challengeResults["challenge-1"].completionCount).toBe(3)
    })
  })

  describe("achievement unlocking", () => {
    it("unlocks 'getting-started' achievement after first challenge", () => {
      awardChallengeXp("challenge-1", 75)

      // checkAndUnlockAchievements calls updateSandbox a second time
      // The final sandbox should contain the achievement
      expect(sandbox.achievements).toContain("getting-started")
    })

    it("awards achievement XP bonus when unlocking", () => {
      awardChallengeXp("challenge-1", 75)

      // "getting-started" has xpBonus of 35
      // Total XP = 75 (challenge) + 35 (achievement bonus) = 110
      expect(sandbox.userStats.totalXp).toBe(110)
    })

    it("updates totalAchievements count", () => {
      awardChallengeXp("challenge-1", 75)

      expect(sandbox.userStats.totalAchievements).toBe(1)
    })

    it("unlocks 'first-blood' achievement after first mission", () => {
      awardMissionXp("mission-1", 200)

      expect(sandbox.achievements).toContain("first-blood")
    })

    it("does not duplicate already-unlocked achievements", () => {
      // Complete first challenge → unlocks "getting-started"
      awardChallengeXp("challenge-1", 75)
      expect(sandbox.achievements).toContain("getting-started")

      // Complete second challenge → "getting-started" should NOT be re-added
      awardChallengeXp("challenge-2", 50)

      const gettingStartedCount = sandbox.achievements.filter(
        (id) => id === "getting-started",
      ).length
      expect(gettingStartedCount).toBe(1)
    })

    it("does not unlock achievements when conditions are not met", () => {
      // Stage completion alone should not unlock "first-blood" (needs mission completion)
      awardStageXp("mission-1", "01-briefing", 50)

      expect(sandbox.achievements).not.toContain("first-blood")
    })
  })
})
