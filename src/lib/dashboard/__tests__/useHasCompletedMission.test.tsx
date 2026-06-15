import { renderHook, act } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { useHasCompletedMission } from "../useHasCompletedMission"
import type { SandboxData } from "@/lib/sandbox/types"

function makeSandbox(overrides: Partial<SandboxData> = {}): SandboxData {
  return {
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
    completedFieldOps: [],
    flashcardProgress: {},
    lastSynced: null,
    ...overrides,
  } as SandboxData
}

vi.mock("@/lib/sandbox", () => ({
  loadSandbox: vi.fn(),
}))

import { loadSandbox } from "@/lib/sandbox"

describe("useHasCompletedMission", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns false when no sandbox is loaded", async () => {
    vi.mocked(loadSandbox).mockReturnValue(null)

    const { result } = renderHook(() => useHasCompletedMission())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current).toBe(false)
  })

  it("returns false when sandbox has no completed missions", async () => {
    const sandbox = makeSandbox({
      missionProgress: {
        "mission-a": {
          started: true,
          completed: false,
          stageProgress: {},
          sideQuestsCompleted: [],
          totalXpEarned: 0,
        },
      },
    })
    vi.mocked(loadSandbox).mockReturnValue(sandbox)

    const { result } = renderHook(() => useHasCompletedMission())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current).toBe(false)
  })

  it("returns true when at least one mission has completed: true", async () => {
    const sandbox = makeSandbox({
      missionProgress: {
        "mission-a": {
          started: true,
          completed: false,
          stageProgress: {},
          sideQuestsCompleted: [],
          totalXpEarned: 0,
        },
        "mission-b": {
          started: true,
          completed: true,
          stageProgress: {},
          sideQuestsCompleted: [],
          totalXpEarned: 100,
          completedAt: "2026-06-14T10:00:00Z",
        },
      },
    })
    vi.mocked(loadSandbox).mockReturnValue(sandbox)

    const { result } = renderHook(() => useHasCompletedMission())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current).toBe(true)
  })
})