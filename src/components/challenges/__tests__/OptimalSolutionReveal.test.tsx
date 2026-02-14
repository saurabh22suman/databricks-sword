import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { OptimalSolutionReveal } from "../OptimalSolutionReveal"

describe("OptimalSolutionReveal", () => {
  const defaultProps = {
    optimalSolution: "df.filter(col('x') > 5).select('y')",
    explanation: "Filter first, then select to minimize data shuffled.",
  }

  it("does not show the solution initially", () => {
    render(<OptimalSolutionReveal {...defaultProps} />)
    expect(screen.queryByText(/df\.filter/)).not.toBeInTheDocument()
  })

  it("shows a reveal button", () => {
    render(<OptimalSolutionReveal {...defaultProps} />)
    expect(screen.getByRole("button", { name: /reveal|show|solution/i })).toBeInTheDocument()
  })

  it("reveals the solution when button is clicked", async () => {
    const user = userEvent.setup()
    render(<OptimalSolutionReveal {...defaultProps} />)

    await user.click(screen.getByRole("button", { name: /reveal|show|solution/i }))
    expect(screen.getByText(/df\.filter/)).toBeInTheDocument()
  })

  it("shows the explanation after revealing", async () => {
    const user = userEvent.setup()
    render(<OptimalSolutionReveal {...defaultProps} />)

    await user.click(screen.getByRole("button", { name: /reveal|show|solution/i }))
    expect(screen.getByText(/Filter first/)).toBeInTheDocument()
  })
})
