/**
 * @file DailyForgeClient.test.tsx
 * @description Tests for the DailyForgeClient component
 */

import type { Challenge } from "@/lib/challenges"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DailyForgeClient } from "../DailyForgeClient"

// Mock DailyForge component
vi.mock("../DailyForge", () => ({
  DailyForge: vi.fn(({
    challenge,
    streakCount,
    completedToday,
    onComplete,
  }) => (
    <div data-testid="daily-forge">
      <div data-testid="streak-count">{streakCount}</div>
      <div data-testid="completed-today">{completedToday ? "yes" : "no"}</div>
      <div data-testid="challenge-title">{challenge.title}</div>
      <button
        onClick={() =>
          onComplete({
            isValid: true,
            score: 100,
            maxScore: 100,
            details: ["Done"],
          })
        }
      >
        Complete Challenge
      </button>
    </div>
  )),
}))

// Mock sandbox
vi.mock("@/lib/sandbox", () => ({
  loadSandbox: vi.fn(() => ({
    userStats: { totalXp: 0 },
    streakData: {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
    },
  })),
  saveSandbox: vi.fn(),
}))

// Mock gamification
vi.mock("@/lib/gamification", () => ({
  calculateDailyForgeXp: vi.fn(() => ({ base: 50, streak: 0, total: 50 })),
}))

describe("DailyForgeClient", () => {
  const mockChallenge: Challenge = {
    id: "daily-test",
    title: "Daily Test Challenge",
    category: "pyspark",
    difficulty: "B",
    format: "drag-drop",
    description: "Daily test description",
    hints: ["Hint 1"],
    xpReward: 50,
    optimalSolution: "solution",
    explanation: "explanation",
    dragDrop: {
      blocks: [
        { id: "b1", code: "line 1" },
        { id: "b2", code: "line 2" },
      ],
      correctOrder: ["b1", "b2"],
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe("initial render", () => {
    it("shows loading state initially", () => {
      render(<DailyForgeClient challenge={mockChallenge} />)

      // Should pass through loading quickly, but renders DailyForge
      expect(screen.getByTestId("daily-forge")).toBeInTheDocument()
    })

    it("renders DailyForge component after loading", async () => {
      render(<DailyForgeClient challenge={mockChallenge} />)

      await waitFor(() => {
        expect(screen.getByTestId("daily-forge")).toBeInTheDocument()
      })
    })

    it("passes challenge to DailyForge", async () => {
      render(<DailyForgeClient challenge={mockChallenge} />)

      await waitFor(() => {
        expect(screen.getByTestId("challenge-title")).toHaveTextContent(
          "Daily Test Challenge"
        )
      })
    })

    it("starts with streak count of 0 when no saved state", async () => {
      render(<DailyForgeClient challenge={mockChallenge} />)

      await waitFor(() => {
        expect(screen.getByTestId("streak-count")).toHaveTextContent("0")
      })
    })

    it("shows completedToday as no when not completed", async () => {
      render(<DailyForgeClient challenge={mockChallenge} />)

      await waitFor(() => {
        expect(screen.getByTestId("completed-today")).toHaveTextContent("no")
      })
    })
  })

  describe("loads saved state from localStorage", () => {
    it("loads streak count from localStorage", async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split("T")[0]

      localStorage.setItem(
        "databricks-sword-daily-forge",
        JSON.stringify({
          lastCompletedDate: yesterdayStr,
          streakCount: 5,
        })
      )

      render(<DailyForgeClient challenge={mockChallenge} />)

      await waitFor(() => {
        expect(screen.getByTestId("streak-count")).toHaveTextContent("5")
      })
    })

    it("shows completedToday as yes when completed today", async () => {
      const today = new Date().toISOString().split("T")[0]

      localStorage.setItem(
        "databricks-sword-daily-forge",
        JSON.stringify({
          lastCompletedDate: today,
          streakCount: 3,
        })
      )

      render(<DailyForgeClient challenge={mockChallenge} />)

      await waitFor(() => {
        expect(screen.getByTestId("completed-today")).toHaveTextContent("yes")
      })
    })
  })

  describe("completion handling", () => {
    it("updates streak count when completing challenge", async () => {
      render(<DailyForgeClient challenge={mockChallenge} />)

      await waitFor(() => {
        expect(screen.getByTestId("daily-forge")).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText("Complete Challenge"))

      await waitFor(() => {
        expect(screen.getByTestId("streak-count")).toHaveTextContent("1")
      })
    })

    it("sets completedToday to yes after completion", async () => {
      render(<DailyForgeClient challenge={mockChallenge} />)

      await waitFor(() => {
        expect(screen.getByTestId("daily-forge")).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText("Complete Challenge"))

      await waitFor(() => {
        expect(screen.getByTestId("completed-today")).toHaveTextContent("yes")
      })
    })

    it("continues streak when completed yesterday", async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split("T")[0]

      localStorage.setItem(
        "databricks-sword-daily-forge",
        JSON.stringify({
          lastCompletedDate: yesterdayStr,
          streakCount: 3,
        })
      )

      render(<DailyForgeClient challenge={mockChallenge} />)

      await waitFor(() => {
        expect(screen.getByTestId("daily-forge")).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText("Complete Challenge"))

      await waitFor(() => {
        // Streak should increment from 3 to 4
        expect(screen.getByTestId("streak-count")).toHaveTextContent("4")
      })
    })

    it("resets streak when missed a day", async () => {
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      const twoDaysAgoStr = twoDaysAgo.toISOString().split("T")[0]

      localStorage.setItem(
        "databricks-sword-daily-forge",
        JSON.stringify({
          lastCompletedDate: twoDaysAgoStr,
          streakCount: 10,
        })
      )

      render(<DailyForgeClient challenge={mockChallenge} />)

      await waitFor(() => {
        expect(screen.getByTestId("daily-forge")).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText("Complete Challenge"))

      await waitFor(() => {
        // Streak should reset to 1
        expect(screen.getByTestId("streak-count")).toHaveTextContent("1")
      })
    })

    it("persists state to localStorage after completion", async () => {
      render(<DailyForgeClient challenge={mockChallenge} />)

      await waitFor(() => {
        expect(screen.getByTestId("daily-forge")).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText("Complete Challenge"))

      await waitFor(() => {
        const saved = localStorage.getItem("databricks-sword-daily-forge")
        expect(saved).toBeTruthy()
        const parsed = JSON.parse(saved!)
        expect(parsed.streakCount).toBe(1)
        expect(parsed.lastCompletedDate).toBe(
          new Date().toISOString().split("T")[0]
        )
      })
    })
  })

  describe("handles localStorage errors", () => {
    it("handles JSON parse error gracefully", async () => {
      localStorage.setItem("databricks-sword-daily-forge", "invalid-json")

      // Should not throw
      render(<DailyForgeClient challenge={mockChallenge} />)

      await waitFor(() => {
        expect(screen.getByTestId("daily-forge")).toBeInTheDocument()
        // Falls back to default state
        expect(screen.getByTestId("streak-count")).toHaveTextContent("0")
      })
    })
  })
})
