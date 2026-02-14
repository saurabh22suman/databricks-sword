import { ACHIEVEMENTS } from "@/lib/gamification"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AchievementGrid } from "../AchievementGrid"

describe("AchievementGrid", () => {
  const mockAchievements = ACHIEVEMENTS.slice(0, 5)
  const unlockedAchievements = ["first-blood", "mission-clear"]
  const achievementProgress = {
    "streak-7": 50,
    "s-rank-clear": 75
  }

  it("renders all provided achievements", () => {
    render(
      <AchievementGrid 
        achievements={mockAchievements}
        unlockedAchievements={unlockedAchievements}
      />
    )
    
    mockAchievements.forEach(achievement => {
      expect(screen.getByText(achievement.title)).toBeInTheDocument()
    })
  })

  it("shows correct unlocked state for achievements", () => {
    render(
      <AchievementGrid 
        achievements={mockAchievements}
        unlockedAchievements={unlockedAchievements}
      />
    )
    
    // First Blood should be unlocked (border-anime-yellow)
    const firstBloodCard = screen.getByText("First Blood").closest('[data-testid="achievement-card"]')
    // Getting Started should be locked (border-anime-700)
    const gettingStartedCard = screen.getByText("Getting Started").closest('[data-testid="achievement-card"]')
    
    expect(firstBloodCard).toHaveClass("border-anime-yellow")
    expect(gettingStartedCard).toHaveClass("border-anime-700")
  })

  it("displays progress for achievements with progress data", () => {
    render(
      <AchievementGrid 
        achievements={mockAchievements}
        unlockedAchievements={unlockedAchievements}
        achievementProgress={achievementProgress}
      />
    )
    
    const progressBars = screen.getAllByRole("progressbar")
    expect(progressBars.length).toBeGreaterThan(0)
  })

  it("applies responsive grid layout", () => {
    render(
      <AchievementGrid 
        achievements={mockAchievements}
        unlockedAchievements={unlockedAchievements}
      />
    )
    
    const grid = screen.getByTestId("achievement-grid")
    expect(grid).toHaveClass("grid", "grid-cols-1", "md:grid-cols-2", "lg:grid-cols-3")
  })

  it("shows empty state when no achievements provided", () => {
    render(
      <AchievementGrid 
        achievements={[]}
        unlockedAchievements={[]}
      />
    )
    
    expect(screen.getByText("No achievements found")).toBeInTheDocument()
    expect(screen.getByText("Complete missions and challenges to unlock achievements")).toBeInTheDocument()
  })

  it("filters achievements by unlocked status", () => {
    render(
      <AchievementGrid 
        achievements={mockAchievements}
        unlockedAchievements={unlockedAchievements}
        filter="unlocked"
      />
    )
    
    expect(screen.getByText("First Blood")).toBeInTheDocument()
    expect(screen.queryByText("Hotstreak")).not.toBeInTheDocument()
  })

  it("filters achievements by locked status", () => {
    render(
      <AchievementGrid 
        achievements={mockAchievements}
        unlockedAchievements={unlockedAchievements}
        filter="locked"
      />
    )
    
    // Should show locked achievements
    expect(screen.getByText("Getting Started")).toBeInTheDocument()
    expect(screen.getByText("S-Rank Clear")).toBeInTheDocument()
    // Should not show unlocked achievements
    expect(screen.queryByText("First Blood")).not.toBeInTheDocument()
    expect(screen.queryByText("Mission Clear")).not.toBeInTheDocument()
  })

  it("shows all achievements when filter is 'all'", () => {
    render(
      <AchievementGrid 
        achievements={mockAchievements}
        unlockedAchievements={unlockedAchievements}
        filter="all"
      />
    )
    
    mockAchievements.forEach(achievement => {
      expect(screen.getByText(achievement.title)).toBeInTheDocument()
    })
  })

  it("calls onAchievementClick when achievement is clicked", () => {
    const handleClick = vi.fn()
    render(
      <AchievementGrid 
        achievements={mockAchievements}
        unlockedAchievements={unlockedAchievements}
        onAchievementClick={handleClick}
      />
    )
    
    const firstCard = screen.getByText("First Blood").closest('[data-testid="achievement-card"]')!
    fireEvent.click(firstCard)
    
    expect(handleClick).toHaveBeenCalledWith(mockAchievements[0])
  })

  it("applies custom className when provided", () => {
    render(
      <AchievementGrid 
        achievements={mockAchievements}
        unlockedAchievements={unlockedAchievements}
        className="custom-class"
      />
    )
    
    const grid = screen.getByTestId("achievement-grid")
    expect(grid).toHaveClass("custom-class")
  })

  it("shows achievement count summary", () => {
    render(
      <AchievementGrid 
        achievements={mockAchievements}
        unlockedAchievements={unlockedAchievements}
        showSummary={true}
      />
    )
    
    expect(screen.getByText(`${unlockedAchievements.length}/${mockAchievements.length} unlocked`)).toBeInTheDocument()
  })
})