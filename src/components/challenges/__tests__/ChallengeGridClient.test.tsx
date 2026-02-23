/**
 * @file ChallengeGridClient.test.tsx
 * @description Tests for the ChallengeGridClient component
 */

import type { Challenge } from "@/lib/challenges"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ChallengeGridClient } from "../ChallengeGridClient"

// Mock next/navigation
const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock sandbox
vi.mock("@/lib/sandbox", () => ({
  loadSandbox: vi.fn(() => ({
    challengeResults: {
      "ps-test-1": { completed: true },
    },
  })),
}))

describe("ChallengeGridClient", () => {
  const mockChallenges: Challenge[] = [
    {
      id: "ps-test-1",
      title: "PySpark Test Challenge 1",
      category: "pyspark",
      difficulty: "B",
      format: "drag-drop",
      description: "Test PySpark challenge",
      hints: ["Hint 1"],
      xpReward: 75,
      optimalSolution: "solution",
      explanation: "explanation",
      dragDrop: {
        blocks: [
          { id: "b1", code: "line 1" },
          { id: "b2", code: "line 2" },
        ],
        correctOrder: ["b1", "b2"],
      },
    },
    {
      id: "sql-test-1",
      title: "SQL Test Challenge",
      category: "sql",
      difficulty: "A",
      format: "fill-blank",
      description: "Test SQL challenge",
      hints: ["Hint 1"],
      xpReward: 100,
      optimalSolution: "solution",
      explanation: "explanation",
      fillBlank: {
        codeTemplate: "__BLANK_0__",
        blanks: [{ id: 0, correctAnswer: "SELECT", options: ["SELECT", "GET"] }],
      },
    },
    {
      id: "dl-test-1",
      title: "Delta Lake Test Challenge",
      category: "delta-lake",
      difficulty: "S",
      format: "free-text",
      description: "Test Delta Lake challenge",
      hints: ["Hint 1"],
      xpReward: 150,
      optimalSolution: "solution",
      explanation: "explanation",
      freeText: {
        starterCode: "# code",
        expectedPattern: ".*",
        simulatedOutput: "output",
      },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("renders challenges", () => {
    it("displays all challenges when no filters applied", () => {
      render(<ChallengeGridClient challenges={mockChallenges} />)

      expect(screen.getByText("PySpark Test Challenge 1")).toBeInTheDocument()
      expect(screen.getByText("SQL Test Challenge")).toBeInTheDocument()
      expect(screen.getByText("Delta Lake Test Challenge")).toBeInTheDocument()
    })

    it("shows challenge count", () => {
      render(<ChallengeGridClient challenges={mockChallenges} />)

      expect(screen.getByText("3 challenges")).toBeInTheDocument()
    })

    it("shows singular form for 1 challenge", () => {
      render(<ChallengeGridClient challenges={[mockChallenges[0]]} />)

      expect(screen.getByText("1 challenge")).toBeInTheDocument()
    })
  })

  describe("category filtering", () => {
    it("filters by category when selected", () => {
      render(<ChallengeGridClient challenges={mockChallenges} />)

      const [categorySelect] = screen.getAllByRole("combobox")
      fireEvent.change(categorySelect, { target: { value: "pyspark" } })

      expect(screen.getByText("PySpark Test Challenge 1")).toBeInTheDocument()
      expect(
        screen.queryByText("SQL Test Challenge")
      ).not.toBeInTheDocument()
      expect(
        screen.queryByText("Delta Lake Test Challenge")
      ).not.toBeInTheDocument()
    })

    it("applies initial category filter from props", () => {
      render(
        <ChallengeGridClient
          challenges={mockChallenges}
          initialCategory="sql"
        />,
      )

      expect(screen.queryByText("PySpark Test Challenge 1")).not.toBeInTheDocument()
      expect(screen.getByText("SQL Test Challenge")).toBeInTheDocument()
      expect(screen.queryByText("Delta Lake Test Challenge")).not.toBeInTheDocument()
      expect(screen.getByText("1 challenge")).toBeInTheDocument()
    })
  })

  describe("difficulty filtering", () => {
    it("filters by difficulty when selected", () => {
      render(<ChallengeGridClient challenges={mockChallenges} />)

      const [, difficultySelect] = screen.getAllByRole("combobox")
      fireEvent.change(difficultySelect, { target: { value: "A" } })

      expect(screen.queryByText("PySpark Test Challenge 1")).not.toBeInTheDocument()
      expect(screen.getByText("SQL Test Challenge")).toBeInTheDocument()
      expect(
        screen.queryByText("Delta Lake Test Challenge")
      ).not.toBeInTheDocument()
    })
  })

  describe("navigation", () => {
    it("navigates to challenge page on card click", () => {
      render(<ChallengeGridClient challenges={mockChallenges} />)

      // ChallengeCard uses article role
      const cards = screen.getAllByRole("article")
      fireEvent.click(cards[0])

      expect(mockPush).toHaveBeenCalledWith("/challenges/ps-test-1")
    })
  })

  describe("empty state", () => {
    it("shows empty state when no challenges match filters", () => {
      render(<ChallengeGridClient challenges={mockChallenges} />)

      const [categorySelect, difficultySelect] = screen.getAllByRole("combobox")
      fireEvent.change(categorySelect, { target: { value: "pyspark" } })
      fireEvent.change(difficultySelect, { target: { value: "S" } })

      expect(
        screen.getByText("No challenges match your filters.")
      ).toBeInTheDocument()
    })

    it("shows clear filters button when no results", () => {
      render(<ChallengeGridClient challenges={mockChallenges} />)

      const [categorySelect, difficultySelect] = screen.getAllByRole("combobox")
      fireEvent.change(categorySelect, { target: { value: "pyspark" } })
      fireEvent.change(difficultySelect, { target: { value: "S" } })

      expect(screen.getByText("Clear Filters")).toBeInTheDocument()
    })

    it("clears filters when Clear Filters button clicked", () => {
      render(<ChallengeGridClient challenges={mockChallenges} />)

      const [categorySelect, difficultySelect] = screen.getAllByRole("combobox")
      fireEvent.change(categorySelect, { target: { value: "pyspark" } })
      fireEvent.change(difficultySelect, { target: { value: "S" } })

      // Clear filters
      fireEvent.click(screen.getByText("Clear Filters"))

      // All challenges should be visible again
      expect(screen.getByText("PySpark Test Challenge 1")).toBeInTheDocument()
      expect(screen.getByText("SQL Test Challenge")).toBeInTheDocument()
      expect(screen.getByText("Delta Lake Test Challenge")).toBeInTheDocument()
    })

    it("resets to initial category when clearing filters", () => {
      render(
        <ChallengeGridClient
          challenges={mockChallenges}
          initialCategory="sql"
        />,
      )

      const [, difficultySelect] = screen.getAllByRole("combobox")
      fireEvent.change(difficultySelect, { target: { value: "S" } })

      fireEvent.click(screen.getByText("Clear Filters"))

      expect(screen.queryByText("PySpark Test Challenge 1")).not.toBeInTheDocument()
      expect(screen.getByText("SQL Test Challenge")).toBeInTheDocument()
      expect(screen.queryByText("Delta Lake Test Challenge")).not.toBeInTheDocument()
      expect(screen.getByText("1 challenge")).toBeInTheDocument()
    })
  })

  describe("empty challenges array", () => {
    it("handles empty challenges array gracefully", () => {
      render(<ChallengeGridClient challenges={[]} />)

      expect(screen.getByText("0 challenges")).toBeInTheDocument()
    })
  })
})
