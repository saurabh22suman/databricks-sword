import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { StreakFreezeButton } from "../StreakFreezeButton"

describe("StreakFreezeButton", () => {
  it("displays available freeze count", () => {
    render(<StreakFreezeButton freezesAvailable={2} />)
    
    expect(screen.getByText("2 freezes available")).toBeInTheDocument()
  })

  it("shows freeze button when freezes are available", () => {
    render(<StreakFreezeButton freezesAvailable={1} />)
    
    const freezeButton = screen.getByText("Use Freeze")
    expect(freezeButton).toBeInTheDocument()
    expect(freezeButton).not.toBeDisabled()
  })

  it("disables button when no freezes available", () => {
    render(<StreakFreezeButton freezesAvailable={0} />)
    
    const freezeButton = screen.getByText("Use Freeze")
    expect(freezeButton).toBeDisabled()
  })

  it("calls onUseFreeze when button is clicked", () => {
    const handleUseFreeze = vi.fn()
    render(
      <StreakFreezeButton 
        freezesAvailable={1} 
        onUseFreeze={handleUseFreeze}
      />
    )
    
    const freezeButton = screen.getByText("Use Freeze")
    fireEvent.click(freezeButton)
    
    expect(handleUseFreeze).toHaveBeenCalledTimes(1)
  })

  it("shows confirmation dialog when confirmBeforeUse is true", () => {
    const handleUseFreeze = vi.fn()
    render(
      <StreakFreezeButton 
        freezesAvailable={1} 
        onUseFreeze={handleUseFreeze}
        confirmBeforeUse={true}
      />
    )
    
    const freezeButton = screen.getByText("Use Freeze")
    fireEvent.click(freezeButton)
    
    // Should show confirmation dialog
    expect(screen.getByText("Use Streak Freeze?")).toBeInTheDocument()
    expect(screen.getByText("This will preserve your streak for today. You cannot undo this action.")).toBeInTheDocument()
  })

  it("cancels freeze when clicking Cancel in confirmation", () => {
    const handleUseFreeze = vi.fn()
    render(
      <StreakFreezeButton 
        freezesAvailable={1} 
        onUseFreeze={handleUseFreeze}
        confirmBeforeUse={true}
      />
    )
    
    // Open confirmation
    fireEvent.click(screen.getByText("Use Freeze"))
    
    // Click cancel
    fireEvent.click(screen.getByText("Cancel"))
    
    expect(handleUseFreeze).not.toHaveBeenCalled()
    expect(screen.queryByText("Use Streak Freeze?")).not.toBeInTheDocument()
  })

  it("confirms freeze when clicking Confirm in confirmation", () => {
    const handleUseFreeze = vi.fn()
    render(
      <StreakFreezeButton 
        freezesAvailable={1} 
        onUseFreeze={handleUseFreeze}
        confirmBeforeUse={true}
      />
    )
    
    // Open confirmation
    fireEvent.click(screen.getByText("Use Freeze"))
    
    // Click confirm
    fireEvent.click(screen.getByText("Confirm"))
    
    expect(handleUseFreeze).toHaveBeenCalledTimes(1)
    expect(screen.queryByText("Use Streak Freeze?")).not.toBeInTheDocument()
  })

  it("displays loading state when isLoading is true", () => {
    render(
      <StreakFreezeButton 
        freezesAvailable={1} 
        isLoading={true}
      />
    )
    
    const freezeButton = screen.getByText("Using...")
    expect(freezeButton).toBeDisabled()
  })

  it("shows freeze earned feedback", () => {
    render(<StreakFreezeButton freezesAvailable={1} showFreezeEarned={true} />)
    
    expect(screen.getByText("🎉 Freeze Earned!")).toBeInTheDocument()
    expect(screen.getByText("Complete 7 days to earn another freeze")).toBeInTheDocument()
  })

  it("displays freeze icon correctly", () => {
    render(<StreakFreezeButton freezesAvailable={1} />)
    
    expect(screen.getByText("❄️")).toBeInTheDocument()
  })

  it("applies custom className when provided", () => {
    render(
      <StreakFreezeButton 
        freezesAvailable={1} 
        className="custom-freeze-button"
      />
    )
    
    const container = screen.getByTestId("streak-freeze-button")
    expect(container).toHaveClass("custom-freeze-button")
  })

  it("shows different text for single freeze", () => {
    render(<StreakFreezeButton freezesAvailable={1} />)
    
    expect(screen.getByText("1 freeze available")).toBeInTheDocument()
  })

  it("shows tooltip with freeze explanation on hover", () => {
    render(<StreakFreezeButton freezesAvailable={1} />)
    
    const freezeButton = screen.getByText("Use Freeze")
    fireEvent.mouseEnter(freezeButton)
    
    expect(screen.getByText("Preserve your streak for today without completing a mission or challenge")).toBeInTheDocument()
  })

  it("hides tooltip on mouse leave", () => {
    render(<StreakFreezeButton freezesAvailable={1} />)
    
    const freezeButton = screen.getByText("Use Freeze")
    fireEvent.mouseEnter(freezeButton)
    fireEvent.mouseLeave(freezeButton)
    
    expect(screen.queryByText("Preserve your streak for today without completing a mission or challenge")).not.toBeInTheDocument()
  })

  it("disables button during loading", () => {
    const handleUseFreeze = vi.fn()
    render(
      <StreakFreezeButton 
        freezesAvailable={1} 
        onUseFreeze={handleUseFreeze}
        isLoading={true}
      />
    )
    
    const freezeButton = screen.getByText("Using...")
    fireEvent.click(freezeButton)
    
    expect(handleUseFreeze).not.toHaveBeenCalled()
  })

  it("shows success animation after successful freeze", () => {
    render(<StreakFreezeButton freezesAvailable={1} showSuccessAnimation={true} />)
    
    const container = screen.getByTestId("streak-freeze-button")
    expect(container).toHaveClass("animate-pulse")
  })
})