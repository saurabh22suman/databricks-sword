import type { XpEvent } from "@/lib/gamification/types"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { XpAward } from "../XpAward"

describe("XpAward", () => {
  const mockXpEvent: XpEvent = {
    type: "mission",
    amount: 100,
    multiplier: 1.0,
    source: "e-commerce-recommender",
    timestamp: "2026-02-12T10:00:00Z"
  }

  it("displays XP amount with + prefix", () => {
    render(<XpAward xpEvent={mockXpEvent} />)
    
    expect(screen.getByText("+100 XP")).toBeInTheDocument()
  })

  it("shows XP source information", () => {
    render(<XpAward xpEvent={mockXpEvent} />)
    
    expect(screen.getByText("Mission Complete")).toBeInTheDocument()
    expect(screen.getByText("e-commerce-recommender")).toBeInTheDocument()
  })

  it("displays streak multiplier when greater than 1", () => {
    const eventWithMultiplier: XpEvent = {
      ...mockXpEvent,
      amount: 150,
      multiplier: 1.5
    }
    
    render(<XpAward xpEvent={eventWithMultiplier} />)
    
    expect(screen.getByText("1.5x")).toBeInTheDocument()
    expect(screen.getByText("+150 XP")).toBeInTheDocument()
  })

  it("does not show multiplier when equal to 1", () => {
    render(<XpAward xpEvent={mockXpEvent} />)
    
    expect(screen.queryByText("1.0x")).not.toBeInTheDocument()
    expect(screen.queryByText("1x")).not.toBeInTheDocument()
  })

  it("applies neon particle animation", () => {
    render(<XpAward xpEvent={mockXpEvent} showAnimation={true} />)
    
    const container = screen.getByTestId("xp-award")
    expect(container).toHaveClass("animate-particle-burst")
  })

  it("does not show animation by default", () => {
    render(<XpAward xpEvent={mockXpEvent} />)
    
    const container = screen.getByTestId("xp-award")
    expect(container).not.toHaveClass("animate-particle-burst")
  })

  it("calls onDismiss when close button is clicked", () => {
    const handleDismiss = vi.fn()
    render(<XpAward xpEvent={mockXpEvent} onDismiss={handleDismiss} />)
    
    const closeButton = screen.getByRole("button", { name: /close/i })
    fireEvent.click(closeButton)
    
    expect(handleDismiss).toHaveBeenCalledTimes(1)
  })

  it("auto-dismisses after specified duration", async () => {
    const handleDismiss = vi.fn()
    render(<XpAward xpEvent={mockXpEvent} onDismiss={handleDismiss} autoDismiss={1000} />)
    
    await waitFor(() => expect(handleDismiss).toHaveBeenCalledTimes(1), {
      timeout: 1200
    })
  })

  it("does not auto-dismiss when autoDismiss is not provided", async () => {
    const handleDismiss = vi.fn()
    render(<XpAward xpEvent={mockXpEvent} onDismiss={handleDismiss} />)
    
    // Wait longer than typical auto-dismiss time
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    expect(handleDismiss).not.toHaveBeenCalled()
  })

  it("applies custom className when provided", () => {
    render(<XpAward xpEvent={mockXpEvent} className="custom-class" />)
    
    const container = screen.getByTestId("xp-award")
    expect(container).toHaveClass("custom-class")
  })

  it("displays different labels for different XP event types", () => {
    const challengeEvent: XpEvent = {
      type: "challenge",
      amount: 50,
      multiplier: 1.0,
      source: "window-functions",
      timestamp: "2026-02-12T10:00:00Z"
    }
    
    render(<XpAward xpEvent={challengeEvent} />)
    
    expect(screen.getByText("Challenge Complete")).toBeInTheDocument()
  })

  it("displays achievement label for achievement events", () => {
    const achievementEvent: XpEvent = {
      type: "achievement",
      amount: 200,
      multiplier: 1.0,
      source: "first-blood",
      timestamp: "2026-02-12T10:00:00Z"
    }
    
    render(<XpAward xpEvent={achievementEvent} />)
    
    expect(screen.getByText("Achievement Unlocked")).toBeInTheDocument()
  })

  it("displays streak bonus label for streak events", () => {
    const streakEvent: XpEvent = {
      type: "streak",
      amount: 25,
      multiplier: 2.0,
      source: "7-day-streak",
      timestamp: "2026-02-12T10:00:00Z"
    }
    
    render(<XpAward xpEvent={streakEvent} />)
    
    expect(screen.getByText("Streak Bonus")).toBeInTheDocument()
    expect(screen.getByText("2x")).toBeInTheDocument()
  })

  it("displays quiz bonus label for quiz-bonus events", () => {
    const quizEvent: XpEvent = {
      type: "quiz-bonus",
      amount: 30,
      multiplier: 1.0,
      source: "perfect-score",
      timestamp: "2026-02-12T10:00:00Z"
    }
    
    render(<XpAward xpEvent={quizEvent} />)
    
    expect(screen.getByText("Perfect Score")).toBeInTheDocument()
  })

  it("uses large text for high XP amounts", () => {
    const largeXpEvent: XpEvent = {
      ...mockXpEvent,
      amount: 500
    }
    
    render(<XpAward xpEvent={largeXpEvent} />)
    
    const xpAmount = screen.getByText("+500 XP")
    expect(xpAmount).toHaveClass("text-2xl")
  })

  it("uses normal text for low XP amounts", () => {
    const smallXpEvent: XpEvent = {
      ...mockXpEvent,
      amount: 25
    }
    
    render(<XpAward xpEvent={smallXpEvent} />)
    
    const xpAmount = screen.getByText("+25 XP")
    expect(xpAmount).toHaveClass("text-lg")
  })
})