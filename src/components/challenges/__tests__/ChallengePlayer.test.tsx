/**
 * @file ChallengePlayer.test.tsx
 * @description Tests for the ChallengePlayer component
 */

import type { Challenge } from "@/lib/challenges"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ChallengePlayer } from "../ChallengePlayer"

// Mock the child components
vi.mock("@/components/missions", () => ({
  DragDropChallenge: vi.fn(({ onComplete }) => (
    <div data-testid="drag-drop-challenge">
      <button onClick={() => onComplete({})}>Complete Drag Drop</button>
    </div>
  )),
  FillBlankChallenge: vi.fn(({ onComplete }) => (
    <div data-testid="fill-blank-challenge">
      <button onClick={() => onComplete({})}>Complete Fill Blank</button>
    </div>
  )),
  FreeTextChallenge: vi.fn(({ onComplete }) => (
    <div data-testid="free-text-challenge">
      <button onClick={() => onComplete({})}>Complete Free Text</button>
    </div>
  )),
}))

describe("ChallengePlayer", () => {
  const mockDragDropChallenge: Challenge = {
    id: "test-dd",
    title: "Test Drag Drop Challenge",
    category: "pyspark",
    difficulty: "B",
    format: "drag-drop",
    description: "Test description for drag drop",
    hints: ["Hint 1", "Hint 2"],
    xpReward: 75,
    optimalSolution: "optimal solution code",
    explanation: "This is the explanation",
    dragDrop: {
      blocks: [
        { id: "b1", code: "line 1" },
        { id: "b2", code: "line 2" },
      ],
      correctOrder: ["b1", "b2"],
    },
  }

  const mockFillBlankChallenge: Challenge = {
    id: "test-fb",
    title: "Test Fill Blank Challenge",
    category: "sql",
    difficulty: "A",
    format: "fill-blank",
    description: "Test description for fill blank",
    hints: ["Hint 1"],
    xpReward: 100,
    optimalSolution: "SELECT * FROM table",
    explanation: "SQL explanation",
    fillBlank: {
      codeTemplate: "__BLANK_0__ * FROM table",
      blanks: [
        { id: 0, correctAnswer: "SELECT", options: ["SELECT", "GET", "FETCH"] },
      ],
    },
  }

  const mockFreeTextChallenge: Challenge = {
    id: "test-ft",
    title: "Test Free Text Challenge",
    category: "delta-lake",
    difficulty: "S",
    format: "free-text",
    description: "Test description for free text",
    hints: ["Hint 1", "Hint 2", "Hint 3"],
    xpReward: 150,
    optimalSolution: "df.write.format('delta').save('/path')",
    explanation: "Delta Lake explanation",
    freeText: {
      starterCode: "# Write your solution",
      expectedPattern: "df\\.write",
      simulatedOutput: "Success",
    },
  }

  describe("renders challenge header", () => {
    it("displays challenge title and description", () => {
      render(<ChallengePlayer challenge={mockDragDropChallenge} />)

      expect(screen.getByText("Test Drag Drop Challenge")).toBeInTheDocument()
      expect(
        screen.getByText("Test description for drag drop")
      ).toBeInTheDocument()
    })
  })

  describe("renders correct format component", () => {
    it("renders DragDropChallenge for drag-drop format", () => {
      render(<ChallengePlayer challenge={mockDragDropChallenge} />)

      expect(screen.getByTestId("drag-drop-challenge")).toBeInTheDocument()
    })

    it("renders FillBlankChallenge for fill-blank format", () => {
      render(<ChallengePlayer challenge={mockFillBlankChallenge} />)

      expect(screen.getByTestId("fill-blank-challenge")).toBeInTheDocument()
    })

    it("renders FreeTextChallenge for free-text format", () => {
      render(<ChallengePlayer challenge={mockFreeTextChallenge} />)

      expect(screen.getByTestId("free-text-challenge")).toBeInTheDocument()
    })

    it("shows error for missing drag-drop config", () => {
      const invalidChallenge: Challenge = {
        ...mockDragDropChallenge,
        dragDrop: undefined,
      } as Challenge

      render(<ChallengePlayer challenge={invalidChallenge} />)

      expect(screen.getByText("Missing drag-drop config")).toBeInTheDocument()
    })

    it("shows error for missing fill-blank config", () => {
      const invalidChallenge: Challenge = {
        ...mockFillBlankChallenge,
        fillBlank: undefined,
      } as Challenge

      render(<ChallengePlayer challenge={invalidChallenge} />)

      expect(screen.getByText("Missing fill-blank config")).toBeInTheDocument()
    })

    it("shows error for missing free-text config", () => {
      const invalidChallenge: Challenge = {
        ...mockFreeTextChallenge,
        freeText: undefined,
      } as Challenge

      render(<ChallengePlayer challenge={invalidChallenge} />)

      expect(screen.getByText("Missing free-text config")).toBeInTheDocument()
    })
  })

  describe("completion flow", () => {
    it("shows completion message after challenge is completed", () => {
      render(<ChallengePlayer challenge={mockDragDropChallenge} />)

      // Initially, completion message should not be visible
      expect(screen.queryByText("Challenge Complete!")).not.toBeInTheDocument()

      // Complete the challenge
      fireEvent.click(screen.getByText("Complete Drag Drop"))

      // Completion message should now be visible
      expect(screen.getByText("Challenge Complete!")).toBeInTheDocument()
    })

    it("calls onComplete callback when challenge is completed", () => {
      const onComplete = vi.fn()
      render(
        <ChallengePlayer
          challenge={mockDragDropChallenge}
          onComplete={onComplete}
        />
      )

      fireEvent.click(screen.getByText("Complete Drag Drop"))

      expect(onComplete).toHaveBeenCalledTimes(1)
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: true,
          score: 100,
          maxScore: 100,
        })
      )
    })

    it("shows OptimalSolutionReveal after completion", () => {
      render(<ChallengePlayer challenge={mockDragDropChallenge} />)

      fireEvent.click(screen.getByText("Complete Drag Drop"))

      // Should show the optimal solution reveal component
      expect(screen.getByText("Reveal Solution")).toBeInTheDocument()
    })

    it("hides format component after completion", () => {
      render(<ChallengePlayer challenge={mockDragDropChallenge} />)

      // Before completion, format component should be visible
      expect(screen.getByTestId("drag-drop-challenge")).toBeInTheDocument()

      fireEvent.click(screen.getByText("Complete Drag Drop"))

      // After completion, format component should be hidden
      expect(
        screen.queryByTestId("drag-drop-challenge")
      ).not.toBeInTheDocument()
    })

    it("displays score after completion", () => {
      render(<ChallengePlayer challenge={mockDragDropChallenge} />)

      fireEvent.click(screen.getByText("Complete Drag Drop"))

      expect(screen.getByText("Score: 100/100")).toBeInTheDocument()
    })
  })

  describe("handles unknown format", () => {
    it("shows error message for unknown challenge format", () => {
      const unknownChallenge = {
        ...mockDragDropChallenge,
        format: "unknown-format" as "drag-drop",
        dragDrop: undefined,
      }

      render(<ChallengePlayer challenge={unknownChallenge} />)

      expect(
        screen.getByText(/Unknown challenge format:/)
      ).toBeInTheDocument()
    })
  })
})
