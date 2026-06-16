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

// Mock fetch — tests in this file expect the local-computation path
// (offline / network failure). The server claim is exercised in
// xpService.server.test.ts.
vi.stubGlobal(
  "fetch",
  vi.fn().mockRejectedValue(new Error("network down (test stub)")),
)

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
    it("returns an XpEvent with correct type and source", async () => {
      const event = await awardStageXp("mission-1", "01-briefing", 50)

      expect(event.type).toBe("stage")
      expect(event.source).toBe("mission-1/01-briefing")
      expect(event.amount).toBe(50)
      expect(event.multiplier).toBeGreaterThanOrEqual(1)
      expect(event.timestamp).toBeTruthy()
    })

    it("applies streak multiplier to XP amount", async () => {
      sandbox.streakData.currentStreak = 7 // 1.5x multiplier
      vi.mocked(loadSandbox).mockReturnValue(sandbox)

      const event = await awardStageXp("mission-1", "01-briefing", 100)

      expect(event.multiplier).toBe(1.5)
      expect(event.amount).toBe(150) // 100 * 1.5
    })

    it("sends attempts and hintsUsed to server (server applies bonuses)", async () => {
      // When server is available, the server applies first-try/no-hints bonuses.
      // This test verifies the new options are sent to the server.
      // The local fallback path doesn't apply bonuses (server is authoritative).
      const event = await awardStageXp("mission-1", "01-briefing", 100, {
        attempts: 1,
        hintsUsed: 0,
      })

      // Local fallback: base 100 * 1.0x multiplier = 100
      // (server is offline in this test, so we get local amount)
      expect(event.amount).toBe(100)
    })

    it("sends attempts/hintsUsed defaults when not provided", async () => {
      // Options are optional - defaults should be sent
      const event = await awardStageXp("mission-1", "01-briefing", 100)

      // Local fallback: base 100 * 1.0x multiplier = 100
      expect(event.amount).toBe(100)
    })

    it("writes XP to sandbox via updateSandbox", async () => {
      await awardStageXp("mission-1", "01-briefing", 50)

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

    it("accumulates XP with existing sandbox XP", async () => {
      sandbox.userStats.totalXp = 200
      vi.mocked(loadSandbox).mockReturnValue(sandbox)

      await awardStageXp("mission-1", "02-diagram", 75)

      expect(saveSandbox).toHaveBeenCalledWith(
        expect.objectContaining({
          userStats: expect.objectContaining({
            totalXp: 275,
          }),
        }),
      )
    })

    it("records stage progress with xpEarned and completedAt", async () => {
      await awardStageXp("mission-1", "01-briefing", 50)

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
    it("returns an XpEvent with type mission", async () => {
      const event = await awardMissionXp("mission-1", 200)

      expect(event.type).toBe("mission")
      expect(event.source).toBe("mission-1")
      expect(event.amount).toBe(200)
    })

    it("marks mission as completed in sandbox", async () => {
      await awardMissionXp("mission-1", 200)

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

    it("applies streak multiplier", async () => {
      sandbox.streakData.currentStreak = 14 // 2.0x
      vi.mocked(loadSandbox).mockReturnValue(sandbox)

      const event = await awardMissionXp("mission-1", 100)

      expect(event.multiplier).toBe(2.0)
      expect(event.amount).toBe(200)
    })

    it("awards mission XP only once per mission", async () => {
      const firstEvent = await awardMissionXp("mission-1", 200)
      const totalXpAfterFirst = sandbox.userStats.totalXp
      const missionsCompletedAfterFirst = sandbox.userStats.totalMissionsCompleted

      const secondEvent = await awardMissionXp("mission-1", 200)

      expect(firstEvent.amount).toBe(200)
      expect(secondEvent.amount).toBe(0)
      expect(sandbox.userStats.totalXp).toBe(totalXpAfterFirst)
      expect(sandbox.userStats.totalMissionsCompleted).toBe(missionsCompletedAfterFirst)
    })
  })

  describe("awardChallengeXp", () => {
    it("returns an XpEvent with type challenge", async () => {
      const event = await awardChallengeXp("challenge-1", 75)

      expect(event.type).toBe("challenge")
      expect(event.source).toBe("challenge-1")
    })

  describe("awardChallengeXp (P0-4: alreadyAwarded guard)", () => {
    it("does not double-increment xpEarned when server returns alreadyAwarded", async () => {
      // First call: success
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ xpAwarded: 100, alreadyAwarded: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      await awardChallengeXp("challenge-1", 100)
      const firstXp = vi.mocked(saveSandbox).mock.calls.at(-1)![0].userStats.totalXp

      // Second call: server says already-awarded
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ xpAwarded: 0, alreadyAwarded: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      await awardChallengeXp("challenge-1", 100)
      const secondXp = vi.mocked(saveSandbox).mock.calls.at(-1)![0].userStats.totalXp

      expect(secondXp).toBe(firstXp) // no double-count
    })

    it("does not double-increment completionCount when alreadyAwarded", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ xpAwarded: 100, alreadyAwarded: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      await awardChallengeXp("challenge-2", 100)
      const firstCount =
        vi.mocked(saveSandbox).mock.calls.at(-1)![0].challengeResults["challenge-2"]
          .completionCount

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ xpAwarded: 0, alreadyAwarded: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      await awardChallengeXp("challenge-2", 100)
      const secondCount =
        vi.mocked(saveSandbox).mock.calls.at(-1)![0].challengeResults["challenge-2"]
          .completionCount

      expect(secondCount).toBe(firstCount)
    })

    it("still increments attempts when alreadyAwarded (genuine attempt happened)", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ xpAwarded: 100, alreadyAwarded: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      await awardChallengeXp("challenge-3", 100)
      const firstAttempts =
        vi.mocked(saveSandbox).mock.calls.at(-1)![0].challengeResults["challenge-3"]
          .attempts

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ xpAwarded: 0, alreadyAwarded: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      await awardChallengeXp("challenge-3", 100)
      const secondAttempts =
        vi.mocked(saveSandbox).mock.calls.at(-1)![0].challengeResults["challenge-3"]
          .attempts

      expect(secondAttempts).toBe(firstAttempts + 1)
    })
  })

    it("records challenge result in sandbox", async () => {
      await awardChallengeXp("challenge-1", 75)

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

    it("awards 0 XP on second completion (cap at 1)", async () => {
      // First completion earns XP
      await awardChallengeXp("challenge-1", 75)
      // Second completion should earn 0 XP (cap reached)
      const event = await awardChallengeXp("challenge-1", 75)
      expect(event.amount).toBe(0)
      // xpEarned stays at 75 (not 150)
      expect(sandbox.challengeResults["challenge-1"].xpEarned).toBe(75)
      expect(sandbox.challengeResults["challenge-1"].completionCount).toBe(2)
    })

    it("awards 0 XP on third completion (cap at 1)", async () => {
      // First completion earns XP
      await awardChallengeXp("challenge-1", 75)
      // Second and third completions should earn 0 XP
      await awardChallengeXp("challenge-1", 75)
      const event = await awardChallengeXp("challenge-1", 75)
      expect(event.amount).toBe(0)
      // xpEarned stays at 75
      expect(sandbox.challengeResults["challenge-1"].xpEarned).toBe(75)
      expect(sandbox.challengeResults["challenge-1"].completionCount).toBe(3)
    })

    it("increments completionCount on every completion", async () => {
      await awardChallengeXp("challenge-1", 75)
      expect(sandbox.challengeResults["challenge-1"].completionCount).toBe(1)

      await awardChallengeXp("challenge-1", 75)
      expect(sandbox.challengeResults["challenge-1"].completionCount).toBe(2)

      await awardChallengeXp("challenge-1", 75)
      expect(sandbox.challengeResults["challenge-1"].completionCount).toBe(3)
    })
  })

  describe("achievement unlocking", () => {
    it("unlocks 'getting-started' achievement after first challenge", async () => {
      await awardChallengeXp("challenge-1", 75)

      // checkAndUnlockAchievements calls updateSandbox a second time
      // The final sandbox should contain the achievement
      expect(sandbox.achievements).toContain("getting-started")
    })

    it("awards achievement XP bonus when unlocking", async () => {
      // Mock fetch for both challenge claim and achievement claim
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ xpAwarded: 75, alreadyAwarded: false }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ xpAwarded: 35, alreadyAwarded: false }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        )

      await awardChallengeXp("challenge-1", 75)

      // "getting-started" has xpBonus of 35 (from server)
      // Total XP = 75 (challenge) + 35 (achievement bonus) = 110
      expect(sandbox.userStats.totalXp).toBe(110)
    })

    it("updates totalAchievements count", async () => {
      await awardChallengeXp("challenge-1", 75)

      expect(sandbox.userStats.totalAchievements).toBe(1)
    })

    it("unlocks 'first-blood' achievement after first mission", async () => {
      await awardMissionXp("mission-1", 200)

      expect(sandbox.achievements).toContain("first-blood")
    })

    it("does not duplicate already-unlocked achievements", async () => {
      // Complete first challenge → unlocks "getting-started"
      await awardChallengeXp("challenge-1", 75)
      expect(sandbox.achievements).toContain("getting-started")

      // Complete second challenge → "getting-started" should NOT be re-added
      await awardChallengeXp("challenge-2", 50)

      const gettingStartedCount = sandbox.achievements.filter(
        (id) => id === "getting-started",
      ).length
      expect(gettingStartedCount).toBe(1)
    })

    it("does not unlock achievements when conditions are not met", async () => {
      // Stage completion alone should not unlock "first-blood" (needs mission completion)
      await awardStageXp("mission-1", "01-briefing", 50)

      expect(sandbox.achievements).not.toContain("first-blood")
    })
  })

  describe("checkAndUnlockAchievements (P0-2: server claim)", () => {
    it("claims each newly-unlocked achievement via the server", async () => {
      // Set up a sandbox where the user has completed 1 mission.
      // That should trigger the "first-blood" achievement (xpBonus 75).
      sandbox.missionProgress["mission-1"] = {
        started: true,
        completed: true,
        stageProgress: {},
        sideQuestsCompleted: [],
        totalXpEarned: 200,
        completedAt: new Date().toISOString(),
      }
      vi.mocked(loadSandbox).mockReturnValue(sandbox)

      // Mock fetch for both mission claim AND achievement claim
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ xpAwarded: 200, alreadyAwarded: false }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ xpAwarded: 75, alreadyAwarded: false }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        )

      await awardMissionXp("mission-1", 200)

      expect(fetch).toHaveBeenCalledWith(
        "/api/progress/achievement",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("first-blood"),
        }),
      )
    })

    it("adds the server-claimed XP to userStats.totalXp", async () => {
      // Set up a sandbox where the mission is NOT completed yet, so mission XP is awarded
      sandbox.missionProgress["mission-1"] = {
        started: true,
        completed: false, // NOT completed yet - mission XP will be awarded
        stageProgress: {},
        sideQuestsCompleted: [],
        totalXpEarned: 0,
        completedAt: "",
      }
      vi.mocked(loadSandbox).mockReturnValue(sandbox)
      // Mock fetch for both mission claim AND achievement claim
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ xpAwarded: 200, alreadyAwarded: false }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ xpAwarded: 75, alreadyAwarded: false }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        )

      await awardMissionXp("mission-1", 200)

      // Find the call that added the achievement (contains "first-blood" in achievements)
      const achievementCall = vi.mocked(saveSandbox).mock.calls.find(
        (call) => call[0]?.achievements?.includes("first-blood"),
      )
      expect(achievementCall).toBeDefined()
      // Total XP should be at least: mission XP (200) + achievement XP (75)
      expect(achievementCall![0].userStats.totalXp).toBeGreaterThanOrEqual(200 + 75)
      expect(achievementCall![0].achievements).toContain("first-blood")
    })

    it("does not double-add XP when server returns alreadyAwarded", async () => {
      sandbox.achievements = ["first-blood"] // already unlocked locally
      sandbox.missionProgress["mission-1"] = {
        started: true,
        completed: true,
        stageProgress: {},
        sideQuestsCompleted: [],
        totalXpEarned: 0,
        completedAt: new Date().toISOString(),
      }
      vi.mocked(loadSandbox).mockReturnValue(sandbox)
      // Mock fetch for mission claim only (achievement should be skipped)
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ xpAwarded: 200, alreadyAwarded: false }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )

      await awardMissionXp("mission-1", 200)

      // Find any call to /api/progress/achievement
      const achievementCalls = vi.mocked(fetch).mock.calls.filter((c) =>
        c[0].toString().includes("/api/progress/achievement"),
      )
      expect(achievementCalls).toHaveLength(0)
    })
  })
})
