import type { Challenge } from "@/lib/challenges"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ChallengeCard } from "../ChallengeCard"

const mockChallenge: Challenge = {
  id: "dd-pyspark-001",
  title: "Order PySpark Transformations",
  category: "pyspark",
  difficulty: "B",
  format: "drag-drop",
  description: "Order the transformations in the correct sequence.",
  hints: ["Start with the read operation"],
  xpReward: 50,
  optimalSolution: "spark.read.csv → filter → select → write",
  explanation: "Transformations are lazy and chain in order.",
  dragDrop: {
    blocks: [
      { id: "b1", code: "spark.read.csv('data.csv')" },
      { id: "b2", code: ".filter(col('x') > 5)" },
    ],
    correctOrder: ["b1", "b2"],
  },
}

describe("ChallengeCard", () => {
  it("renders the challenge title", () => {
    render(<ChallengeCard challenge={mockChallenge} />)
    expect(screen.getByText("Order PySpark Transformations")).toBeInTheDocument()
  })

  it("renders the difficulty badge", () => {
    render(<ChallengeCard challenge={mockChallenge} />)
    expect(screen.getByText("B")).toBeInTheDocument()
  })

  it("renders the category", () => {
    render(<ChallengeCard challenge={mockChallenge} />)
    expect(screen.getByText("pyspark")).toBeInTheDocument()
  })

  it("renders the format tag", () => {
    render(<ChallengeCard challenge={mockChallenge} />)
    expect(screen.getByText(/drag-drop/i)).toBeInTheDocument()
  })

  it("renders the XP reward", () => {
    render(<ChallengeCard challenge={mockChallenge} />)
    expect(screen.getByText(/50.*XP/i)).toBeInTheDocument()
  })

  it("renders the description", () => {
    render(<ChallengeCard challenge={mockChallenge} />)
    expect(screen.getByText(/Order the transformations/)).toBeInTheDocument()
  })

  it("calls onClick when clicked", async () => {
    const { default: userEvent } = await import("@testing-library/user-event")
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(<ChallengeCard challenge={mockChallenge} onClick={onClick} />)
    await user.click(screen.getByRole("article"))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("renders S-rank with accent styling", () => {
    const sRankChallenge = { ...mockChallenge, difficulty: "S" as const }
    render(<ChallengeCard challenge={sRankChallenge} />)
    expect(screen.getByText("S")).toBeInTheDocument()
  })

  it("shows XP reward when completionCount is 0", () => {
    render(<ChallengeCard challenge={mockChallenge} completionCount={0} />)
    expect(screen.getByText(/50.*XP/i)).toBeInTheDocument()
    expect(screen.queryByText(/XP Maxed/i)).not.toBeInTheDocument()
  })

  it("shows completion progress when completionCount is 1", () => {
    render(<ChallengeCard challenge={mockChallenge} completionCount={1} />)
    expect(screen.getByText(/50.*XP/i)).toBeInTheDocument()
    expect(screen.getByText(/Completed 1\/2/)).toBeInTheDocument()
  })

  it("shows XP Maxed when completionCount reaches max", () => {
    render(<ChallengeCard challenge={mockChallenge} completionCount={2} />)
    expect(screen.queryByText(/50.*XP/i)).not.toBeInTheDocument()
    expect(screen.getByText(/XP Maxed/i)).toBeInTheDocument()
    expect(screen.getByText(/Completed 2\/2/)).toBeInTheDocument()
  })
})
