import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ChallengeFilters } from "../ChallengeFilters"

describe("ChallengeFilters", () => {
  const defaultProps = {
    selectedCategory: null as string | null,
    selectedDifficulty: null as string | null,
    selectedStatus: null as string | null,
    onCategoryChange: vi.fn(),
    onDifficultyChange: vi.fn(),
    onStatusChange: vi.fn(),
  }

  it("renders category filter buttons", () => {
    render(<ChallengeFilters {...defaultProps} />)
    expect(screen.getAllByRole("button", { name: /all/i })).toHaveLength(3)
    expect(screen.getByRole("button", { name: /pyspark/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sql/i })).toBeInTheDocument()
  })

  it("renders difficulty filter buttons", () => {
    render(<ChallengeFilters {...defaultProps} />)
    expect(screen.getByRole("button", { name: /^B$/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^A$/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^S$/i })).toBeInTheDocument()
  })

  it("calls onCategoryChange when a category is clicked", async () => {
    const onCategoryChange = vi.fn()
    const user = userEvent.setup()
    render(<ChallengeFilters {...defaultProps} onCategoryChange={onCategoryChange} />)

    await user.click(screen.getByRole("button", { name: /pyspark/i }))
    expect(onCategoryChange).toHaveBeenCalledWith("pyspark")
  })

  it("calls onDifficultyChange when a difficulty is clicked", async () => {
    const onDifficultyChange = vi.fn()
    const user = userEvent.setup()
    render(<ChallengeFilters {...defaultProps} onDifficultyChange={onDifficultyChange} />)

    await user.click(screen.getByRole("button", { name: /^S$/i }))
    expect(onDifficultyChange).toHaveBeenCalledWith("S")
  })

  it("highlights the active category filter", () => {
    render(<ChallengeFilters {...defaultProps} selectedCategory="sql" />)
    const sqlButton = screen.getByRole("button", { name: /sql/i })
    expect(sqlButton.className).toMatch(/cyan|active|selected/i)
  })

  it("calls onCategoryChange with null when All is clicked", async () => {
    const onCategoryChange = vi.fn()
    const user = userEvent.setup()
    render(
      <ChallengeFilters
        {...defaultProps}
        selectedCategory="pyspark"
        onCategoryChange={onCategoryChange}
      />
    )

    const allButtons = screen.getAllByRole("button", { name: /all/i })
    await user.click(allButtons[0])
    expect(onCategoryChange).toHaveBeenCalledWith(null)
  })

  it("renders status filter buttons", () => {
    render(<ChallengeFilters {...defaultProps} />)
    expect(screen.getByRole("button", { name: /not started/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /completed/i })).toBeInTheDocument()
  })

  it("calls onStatusChange when a status is clicked", async () => {
    const onStatusChange = vi.fn()
    const user = userEvent.setup()
    render(<ChallengeFilters {...defaultProps} onStatusChange={onStatusChange} />)

    await user.click(screen.getByRole("button", { name: /completed/i }))
    expect(onStatusChange).toHaveBeenCalledWith("completed")
  })
})
