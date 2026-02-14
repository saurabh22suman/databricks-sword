import { ACHIEVEMENTS } from "@/lib/gamification"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AchievementToast } from "../AchievementToast"

describe("AchievementToast", () => {
  const mockAchievement = ACHIEVEMENTS[0] // first-blood achievement

  it("displays achievement title and description", () => {
    render(<AchievementToast achievement={mockAchievement} />)
    
    expect(screen.getByText(mockAchievement.title)).toBeInTheDocument()
    expect(screen.getByText(mockAchievement.description)).toBeInTheDocument()
  })

  it("shows achievement unlocked label", () => {
    render(<AchievementToast achievement={mockAchievement} />)
    
    expect(screen.getByText("Achievement Unlocked!")).toBeInTheDocument()
  })

  it("displays XP bonus amount", () => {
    render(<AchievementToast achievement={mockAchievement} />)
    
    expect(screen.getByText(`+${mockAchievement.xpBonus} XP`)).toBeInTheDocument()
  })

  it("shows achievement icon as an SVG image", () => {
    render(<AchievementToast achievement={mockAchievement} />)
    
    const icon = screen.getByTestId("achievement-icon")
    expect(icon).toBeInTheDocument()
    const img = icon.querySelector("img")
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute("alt", mockAchievement.title)
  })

  it("applies slide-in animation when showAnimation is true", () => {
    render(<AchievementToast achievement={mockAchievement} showAnimation={true} />)
    
    const container = screen.getByTestId("achievement-toast")
    expect(container).toHaveClass("animate-slide-in")
  })

  it("does not show animation by default", () => {
    render(<AchievementToast achievement={mockAchievement} />)
    
    const container = screen.getByTestId("achievement-toast")
    expect(container).not.toHaveClass("animate-slide-in")
  })

  it("calls onDismiss when close button is clicked", () => {
    const handleDismiss = vi.fn()
    render(<AchievementToast achievement={mockAchievement} onDismiss={handleDismiss} />)
    
    const closeButton = screen.getByRole("button", { name: /close/i })
    fireEvent.click(closeButton)
    
    expect(handleDismiss).toHaveBeenCalledTimes(1)
  })

  it("auto-dismisses after specified duration", async () => {
    const handleDismiss = vi.fn()
    render(<AchievementToast achievement={mockAchievement} onDismiss={handleDismiss} autoDismiss={1000} />)
    
    await waitFor(() => expect(handleDismiss).toHaveBeenCalledTimes(1), {
      timeout: 1200
    })
  })

  it("does not auto-dismiss when autoDismiss is not provided", async () => {
    const handleDismiss = vi.fn()
    render(<AchievementToast achievement={mockAchievement} onDismiss={handleDismiss} />)
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    expect(handleDismiss).not.toHaveBeenCalled()
  })

  it("positions as fixed toast notification", () => {
    render(<AchievementToast achievement={mockAchievement} />)
    
    const container = screen.getByTestId("achievement-toast")
    expect(container).toHaveClass("fixed", "top-4", "right-4", "z-40")
  })

  it("applies custom className when provided", () => {
    render(<AchievementToast achievement={mockAchievement} className="custom-class" />)
    
    const container = screen.getByTestId("achievement-toast")
    expect(container).toHaveClass("custom-class")
  })

  it("shows golden glow effect for achievements", () => {
    render(<AchievementToast achievement={mockAchievement} />)
    
    const container = screen.getByTestId("achievement-toast")
    expect(container).toHaveClass("shadow-neon-yellow")
  })

  it("displays achievement ID for tracking", () => {
    render(<AchievementToast achievement={mockAchievement} />)
    
    const container = screen.getByTestId("achievement-toast")
    expect(container).toHaveAttribute("data-achievement-id", mockAchievement.id)
  })
})