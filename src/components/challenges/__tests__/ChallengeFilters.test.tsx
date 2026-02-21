import type { ChallengeCategory } from "@/lib/challenges"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ChallengeFilters } from "../ChallengeFilters"

describe("ChallengeFilters", () => {
  const defaultProps = {
    selectedCategory: null as ChallengeCategory | null,
    selectedDifficulty: null as string | null,
    selectedStatus: null as string | null,
    onCategoryChange: vi.fn(),
    onDifficultyChange: vi.fn(),
    onStatusChange: vi.fn(),
  }

  it("renders three filter dropdowns", () => {
    render(<ChallengeFilters {...defaultProps} />)
    expect(screen.getAllByRole("combobox")).toHaveLength(3)
    expect(screen.getByRole("option", { name: "PySpark" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "SQL" })).toBeInTheDocument()
  })

  it("renders difficulty options", () => {
    render(<ChallengeFilters {...defaultProps} />)
    expect(screen.getByRole("option", { name: "B — Beginner" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "A — Intermediate" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "S — Advanced" })).toBeInTheDocument()
  })

  it("calls onCategoryChange when a category is selected", async () => {
    const onCategoryChange = vi.fn()
    const user = userEvent.setup()
    render(<ChallengeFilters {...defaultProps} onCategoryChange={onCategoryChange} />)

    const [categorySelect] = screen.getAllByRole("combobox")
    await user.selectOptions(categorySelect, "pyspark")
    expect(onCategoryChange).toHaveBeenCalledWith("pyspark")
  })

  it("calls onDifficultyChange when a difficulty is selected", async () => {
    const onDifficultyChange = vi.fn()
    const user = userEvent.setup()
    render(<ChallengeFilters {...defaultProps} onDifficultyChange={onDifficultyChange} />)

    const [, difficultySelect] = screen.getAllByRole("combobox")
    await user.selectOptions(difficultySelect, "S")
    expect(onDifficultyChange).toHaveBeenCalledWith("S")
  })

  it("applies selected category styles", () => {
    render(<ChallengeFilters {...defaultProps} selectedCategory={"sql" as ChallengeCategory} />)
    const [categorySelect] = screen.getAllByRole("combobox")
    expect(categorySelect.className).toMatch(/anime-cyan/i)
  })

  it("calls onCategoryChange with null when All Categories is selected", async () => {
    const onCategoryChange = vi.fn()
    const user = userEvent.setup()
    render(
      <ChallengeFilters
        {...defaultProps}
        selectedCategory={"pyspark" as ChallengeCategory}
        onCategoryChange={onCategoryChange}
      />,
    )

    const [categorySelect] = screen.getAllByRole("combobox")
    await user.selectOptions(categorySelect, "")
    expect(onCategoryChange).toHaveBeenCalledWith(null)
  })

  it("renders status options", () => {
    render(<ChallengeFilters {...defaultProps} />)
    expect(screen.getByRole("option", { name: "Not Started" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Completed" })).toBeInTheDocument()
  })

  it("calls onStatusChange when a status is selected", async () => {
    const onStatusChange = vi.fn()
    const user = userEvent.setup()
    render(<ChallengeFilters {...defaultProps} onStatusChange={onStatusChange} />)

    const [, , statusSelect] = screen.getAllByRole("combobox")
    await user.selectOptions(statusSelect, "completed")
    expect(onStatusChange).toHaveBeenCalledWith("completed")
  })
})
