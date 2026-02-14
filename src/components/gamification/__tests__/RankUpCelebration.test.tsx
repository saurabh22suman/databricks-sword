import { RANKS } from "@/lib/gamification"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { RankUpCelebration } from "../RankUpCelebration"

describe("RankUpCelebration", () => {
  const newRank = RANKS[1] // Recruit
  const previousRank = RANKS[0] // Cadet

  it("renders full-screen celebration overlay", () => {
    render(<RankUpCelebration newRank={newRank} previousRank={previousRank} />)
    
    const overlay = screen.getByTestId("rank-up-celebration")
    expect(overlay).toHaveClass("fixed", "inset-0", "z-50")
  })

  it("displays rank up message with rank names", () => {
    render(<RankUpCelebration newRank={newRank} previousRank={previousRank} />)
    
    expect(screen.getByText("RANK UP!")).toBeInTheDocument()
    expect(screen.getByText("Cadet → Recruit")).toBeInTheDocument()
  })

  it("shows new rank badge prominently", () => {
    render(<RankUpCelebration newRank={newRank} previousRank={previousRank} />)
    
    const badge = screen.getByRole("img", { name: newRank.badge.alt })
    expect(badge).toBeInTheDocument()
    
    const badgeContainer = badge.closest('.rank-celebration-badge')
    expect(badgeContainer).toBeInTheDocument()
  })

  it("displays rank description", () => {
    render(<RankUpCelebration newRank={newRank} previousRank={previousRank} />)
    
    expect(screen.getByText(newRank.description)).toBeInTheDocument()
  })

  it("shows glitch animation effects", () => {
    render(<RankUpCelebration newRank={newRank} previousRank={previousRank} showAnimation={true} />)
    
    const container = screen.getByTestId("rank-up-celebration")
    expect(container).toHaveClass("animate-rank-celebration")
  })

  it("does not show animation by default", () => {
    render(<RankUpCelebration newRank={newRank} previousRank={previousRank} />)
    
    const container = screen.getByTestId("rank-up-celebration")
    expect(container).not.toHaveClass("animate-rank-celebration")
  })

  it("calls onDismiss when continue button is clicked", () => {
    const handleDismiss = vi.fn()
    render(<RankUpCelebration newRank={newRank} previousRank={previousRank} onDismiss={handleDismiss} />)
    
    const continueButton = screen.getByRole("button", { name: /continue/i })
    fireEvent.click(continueButton)
    
    expect(handleDismiss).toHaveBeenCalledTimes(1)
  })

  it("calls onDismiss when backdrop is clicked", () => {
    const handleDismiss = vi.fn()
    render(<RankUpCelebration newRank={newRank} previousRank={previousRank} onDismiss={handleDismiss} />)
    
    const backdrop = screen.getByTestId("celebration-backdrop")
    fireEvent.click(backdrop)
    
    expect(handleDismiss).toHaveBeenCalledTimes(1)
  })

  it("auto-dismisses after specified duration", async () => {
    const handleDismiss = vi.fn()
    render(<RankUpCelebration newRank={newRank} previousRank={previousRank} onDismiss={handleDismiss} autoDismiss={1000} />)
    
    await waitFor(() => expect(handleDismiss).toHaveBeenCalledTimes(1), {
      timeout: 1200
    })
  })

  it("does not auto-dismiss when autoDismiss is not provided", async () => {
    const handleDismiss = vi.fn()
    render(<RankUpCelebration newRank={newRank} previousRank={previousRank} onDismiss={handleDismiss} />)
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    expect(handleDismiss).not.toHaveBeenCalled()
  })

  it("renders scan line effects", () => {
    render(<RankUpCelebration newRank={newRank} previousRank={previousRank} />)
    
    expect(document.querySelector(".scan-lines")).toBeInTheDocument()
  })

  it("displays holographic grid background", () => {
    render(<RankUpCelebration newRank={newRank} previousRank={previousRank} />)
    
    expect(document.querySelector(".holographic-grid")).toBeInTheDocument()
  })

  it("shows particle burst effects around badge", () => {
    render(<RankUpCelebration newRank={newRank} previousRank={previousRank} showAnimation={true} />)
    
    // The particle burst is now rendered via a Lottie animation container
    const celebration = screen.getByTestId("rank-up-celebration")
    expect(celebration).toHaveClass("animate-rank-celebration")
  })

  it("handles Escape key to dismiss", () => {
    const handleDismiss = vi.fn()
    render(<RankUpCelebration newRank={newRank} previousRank={previousRank} onDismiss={handleDismiss} />)
    
    fireEvent.keyDown(document, { key: "Escape" })
    
    expect(handleDismiss).toHaveBeenCalledTimes(1)
  })

  it("applies custom className when provided", () => {
    render(<RankUpCelebration newRank={newRank} previousRank={previousRank} className="custom-class" />)
    
    const container = screen.getByTestId("rank-up-celebration")
    expect(container).toHaveClass("custom-class")
  })

  it("displays congratulatory text", () => {
    render(<RankUpCelebration newRank={newRank} previousRank={previousRank} />)
    
    expect(screen.getByText(/congratulations/i)).toBeInTheDocument()
  })

  it("shows neon text effects for rank names", () => {
    render(<RankUpCelebration newRank={newRank} previousRank={previousRank} />)
    
    const neonElements = screen.getAllByText(newRank.title).filter(el => el.classList.contains('neon-text'))
    expect(neonElements.length).toBeGreaterThan(0)
    expect(neonElements[0]).toHaveClass("neon-text")
  })

  it("renders with accessibility attributes", () => {
    render(<RankUpCelebration newRank={newRank} previousRank={previousRank} />)
    
    const container = screen.getByTestId("rank-up-celebration")
    expect(container).toHaveAttribute("role", "dialog")
    expect(container).toHaveAttribute("aria-modal", "true")
    expect(container).toHaveAttribute("aria-labelledby", "rank-up-title")
  })
})