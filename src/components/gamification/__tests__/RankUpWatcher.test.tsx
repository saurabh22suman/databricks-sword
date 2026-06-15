import { RANKS, getRankForXp } from "@/lib/gamification"
import { emitXpEvent } from "@/lib/gamification/xpEventBus"
import type { SandboxData } from "@/lib/sandbox"
import { loadSandbox } from "@/lib/sandbox"
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RankUpWatcher } from "../RankUpWatcher"

vi.mock("@/lib/sandbox", () => ({
  loadSandbox: vi.fn(),
}))

const mockLoadSandbox = loadSandbox as ReturnType<typeof vi.fn>

describe("RankUpWatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders nothing initially when no celebration triggered", () => {
    mockLoadSandbox.mockReturnValue(null)

    render(<RankUpWatcher />)

    expect(screen.queryByTestId("rank-up-celebration")).not.toBeInTheDocument()
  })

  it("shows celebration when rank increases from Cadet to Recruit", async () => {
    // Cadet rank (50 XP)
    const sandboxWithCadet: SandboxData = {
      version: 1,
      missionProgress: {},
      challengeResults: {},
      userStats: { totalXp: 50, totalMissionsCompleted: 0, totalChallengesCompleted: 0, totalAchievements: 0, currentStreak: 0, longestStreak: 0, totalTimeSpentMinutes: 0 },
      streakData: { currentStreak: 0, longestStreak: 0, lastActiveDate: "", freezesAvailable: 2, freezesUsed: 0 },
      achievements: [],
      completedFieldOps: [],
      flashcardProgress: {},
      lastSynced: null,
    }
    mockLoadSandbox.mockReturnValue(sandboxWithCadet)

    render(<RankUpWatcher />)

    // Emit XP event that pushes to Recruit (100 XP needed)
    emitXpEvent({ type: "mission", amount: 100, multiplier: 1, source: "test", timestamp: new Date().toISOString() })

    await waitFor(() => {
      expect(screen.getByTestId("rank-up-celebration")).toBeInTheDocument()
    })

    expect(screen.getByText("Cadet → Recruit")).toBeInTheDocument()
  })

  it("does not show celebration when rank stays same", async () => {
    // Cadet rank (50 XP)
    const sandboxWithCadet: SandboxData = {
      version: 1,
      missionProgress: {},
      challengeResults: {},
      userStats: { totalXp: 50, totalMissionsCompleted: 0, totalChallengesCompleted: 0, totalAchievements: 0, currentStreak: 0, longestStreak: 0, totalTimeSpentMinutes: 0 },
      streakData: { currentStreak: 0, longestStreak: 0, lastActiveDate: "", freezesAvailable: 2, freezesUsed: 0 },
      achievements: [],
      completedFieldOps: [],
      flashcardProgress: {},
      lastSynced: null,
    }
    mockLoadSandbox.mockReturnValue(sandboxWithCadet)

    render(<RankUpWatcher />)

    // Emit XP event that doesn't change rank (25 more XP = 75, still Cadet)
    emitXpEvent({ type: "mission", amount: 25, multiplier: 1, source: "test", timestamp: new Date().toISOString() })

    // Wait a bit to ensure no celebration appears
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(screen.queryByTestId("rank-up-celebration")).not.toBeInTheDocument()
  })

  it("handles multiple consecutive rank-ups", async () => {
    // Start at 0 XP (Cadet)
    const sandboxAtZero: SandboxData = {
      version: 1,
      missionProgress: {},
      challengeResults: {},
      userStats: { totalXp: 0, totalMissionsCompleted: 0, totalChallengesCompleted: 0, totalAchievements: 0, currentStreak: 0, longestStreak: 0, totalTimeSpentMinutes: 0 },
      streakData: { currentStreak: 0, longestStreak: 0, lastActiveDate: "", freezesAvailable: 2, freezesUsed: 0 },
      achievements: [],
      completedFieldOps: [],
      flashcardProgress: {},
      lastSynced: null,
    }
    mockLoadSandbox.mockReturnValue(sandboxAtZero)

    render(<RankUpWatcher />)

    // Fire 200 XP event -> Cadet to Recruit
    emitXpEvent({ type: "mission", amount: 200, multiplier: 1, source: "test", timestamp: new Date().toISOString() })

    await waitFor(() => {
      expect(screen.getByTestId("rank-up-celebration")).toBeInTheDocument()
    })

    expect(screen.getByText("Cadet → Recruit")).toBeInTheDocument()

    // Dismiss to test next rank-up
    const dismissButton = screen.getByRole("button", { name: /continue/i })
    dismissButton.click()

    await waitFor(() => {
      expect(screen.queryByTestId("rank-up-celebration")).not.toBeInTheDocument()
    })

    // Fire 500 more XP -> Recruit to Operative
    emitXpEvent({ type: "mission", amount: 500, multiplier: 1, source: "test", timestamp: new Date().toISOString() })

    await waitFor(() => {
      expect(screen.getByTestId("rank-up-celebration")).toBeInTheDocument()
    })

    expect(screen.getByText("Recruit → Operative")).toBeInTheDocument()
  })

  it("unsubscribes on unmount", async () => {
    const sandboxWithCadet: SandboxData = {
      version: 1,
      missionProgress: {},
      challengeResults: {},
      userStats: { totalXp: 50, totalMissionsCompleted: 0, totalChallengesCompleted: 0, totalAchievements: 0, currentStreak: 0, longestStreak: 0, totalTimeSpentMinutes: 0 },
      streakData: { currentStreak: 0, longestStreak: 0, lastActiveDate: "", freezesAvailable: 2, freezesUsed: 0 },
      achievements: [],
      completedFieldOps: [],
      flashcardProgress: {},
      lastSynced: null,
    }
    mockLoadSandbox.mockReturnValue(sandboxWithCadet)

    const { unmount } = render(<RankUpWatcher />)

    unmount()

    // After unmount, no celebration should appear even with XP event
    emitXpEvent({ type: "mission", amount: 100, multiplier: 1, source: "test", timestamp: new Date().toISOString() })

    // Wait a bit to ensure no celebration appears
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(screen.queryByTestId("rank-up-celebration")).not.toBeInTheDocument()
  })
})