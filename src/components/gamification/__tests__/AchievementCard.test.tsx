import { ACHIEVEMENTS } from "@/lib/gamification"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AchievementCard } from "../AchievementCard"

describe("AchievementCard", () => {
  const unlockedAchievement = ACHIEVEMENTS[0] // first-blood
  const lockedAchievement = ACHIEVEMENTS[1] // mission-clear

  it("displays achievement title and description", () => {
    render(<AchievementCard achievement={unlockedAchievement} isUnlocked={true} />)
    
    expect(screen.getByText(unlockedAchievement.title)).toBeInTheDocument()
    expect(screen.getByText(unlockedAchievement.description)).toBeInTheDocument()
  })

  it("shows achievement icon as an SVG image", () => {
    render(<AchievementCard achievement={unlockedAchievement} isUnlocked={true} />)
    
    const icon = screen.getByTestId("achievement-icon")
    expect(icon).toBeInTheDocument()
    const img = icon.querySelector("img")
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute("alt", unlockedAchievement.title)
  })

  it("displays XP bonus amount", () => {
    render(<AchievementCard achievement={unlockedAchievement} isUnlocked={true} />)
    
    expect(screen.getByText(`${unlockedAchievement.xpBonus} XP`)).toBeInTheDocument()
  })

  it("shows unlocked state styling", () => {
    render(<AchievementCard achievement={unlockedAchievement} isUnlocked={true} />)
    
    const card = screen.getByTestId("achievement-card")
    expect(card).toHaveClass("border-anime-yellow")
    expect(card).not.toHaveClass("grayscale")
  })

  it("shows locked state styling", () => {
    render(<AchievementCard achievement={lockedAchievement} isUnlocked={false} />)
    
    const card = screen.getByTestId("achievement-card")
    expect(card).toHaveClass("border-anime-700", "grayscale", "opacity-60")
  })

  it("displays locked overlay for locked achievements", () => {
    render(<AchievementCard achievement={lockedAchievement} isUnlocked={false} />)
    
    expect(screen.getByText("LOCKED")).toBeInTheDocument()
    expect(screen.getByTestId("lock-icon")).toBeInTheDocument()
  })

  it("does not show locked overlay for unlocked achievements", () => {
    render(<AchievementCard achievement={unlockedAchievement} isUnlocked={true} />)
    
    expect(screen.queryByText("LOCKED")).not.toBeInTheDocument()
    expect(screen.queryByTestId("lock-icon")).not.toBeInTheDocument()
  })

  it("shows unlock date when provided", () => {
    const unlockDate = "2026-02-12T10:00:00Z"
    render(<AchievementCard achievement={unlockedAchievement} isUnlocked={true} unlockedAt={unlockDate} />)
    
    expect(screen.getByText(/Unlocked/)).toBeInTheDocument()
  })

  it("does not show unlock date for locked achievements", () => {
    render(<AchievementCard achievement={lockedAchievement} isUnlocked={false} />)
    
    expect(screen.queryByText(/Unlocked/)).not.toBeInTheDocument()
  })

  it("calls onClick when card is clicked", () => {
    const handleClick = vi.fn()
    render(<AchievementCard achievement={unlockedAchievement} isUnlocked={true} onClick={handleClick} />)
    
    const card = screen.getByTestId("achievement-card")
    fireEvent.click(card)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("applies custom className when provided", () => {
    render(<AchievementCard achievement={unlockedAchievement} isUnlocked={true} className="custom-class" />)
    
    const card = screen.getByTestId("achievement-card")
    expect(card).toHaveClass("custom-class")
  })

  it("shows progress indicator when provided", () => {
    render(<AchievementCard achievement={unlockedAchievement} isUnlocked={false} progress={75} />)
    
    const progressBar = screen.getByRole("progressbar")
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveAttribute("aria-valuenow", "75")
  })

  it("does not show progress for unlocked achievements", () => {
    render(<AchievementCard achievement={unlockedAchievement} isUnlocked={true} progress={75} />)
    
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
  })

  it("displays achievement condition hint for locked achievements", () => {
    render(<AchievementCard achievement={lockedAchievement} isUnlocked={false} />)
    
    expect(screen.getByTestId("condition-hint")).toBeInTheDocument()
  })

  it("shows hover effect when clickable", () => {
    const handleClick = vi.fn()
    render(<AchievementCard achievement={unlockedAchievement} isUnlocked={true} onClick={handleClick} />)
    
    const card = screen.getByTestId("achievement-card")
    expect(card).toHaveClass("cursor-pointer", "hover:scale-105")
  })
})