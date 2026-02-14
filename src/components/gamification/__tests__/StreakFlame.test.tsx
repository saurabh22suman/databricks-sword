import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { StreakFlame } from "../StreakFlame"

describe("StreakFlame", () => {
  it("shows flame container for active streak", () => {
    render(<StreakFlame streakDays={5} />)
    
    expect(screen.getByTestId("flame-container")).toBeInTheDocument()
  })

  it("shows no flame for zero streak", () => {
    render(<StreakFlame streakDays={0} />)
    
    expect(screen.queryByTestId("flame-container")).not.toBeInTheDocument()
  })

  it("shows streak count text", () => {
    render(<StreakFlame streakDays={7} />)
    
    expect(screen.getByText("7 days streak")).toBeInTheDocument()
  })

  it("displays singular form for 1 day", () => {
    render(<StreakFlame streakDays={1} />)
    
    expect(screen.getByText("1 day streak")).toBeInTheDocument()
  })

  it("shows milestone message for week streak", () => {
    render(<StreakFlame streakDays={7} />)
    
    expect(screen.getByText("Week Warrior!")).toBeInTheDocument()
  })

  it("shows milestone message for month streak", () => {
    render(<StreakFlame streakDays={30} />)
    
    expect(screen.getByText("Month Master!")).toBeInTheDocument()
  })

  it("shows milestone message for 100-day streak", () => {
    render(<StreakFlame streakDays={100} />)
    
    expect(screen.getByText("Century Club!")).toBeInTheDocument()
  })

  it("displays XP multiplier for active streak", () => {
    render(<StreakFlame streakDays={5} />)
    
    expect(screen.getByText("1.25x XP")).toBeInTheDocument()
  })

  it("displays higher XP multiplier for longer streak", () => {
    render(<StreakFlame streakDays={15} />)
    
    expect(screen.getByText("2x XP")).toBeInTheDocument()
  })

  it("displays maximum XP multiplier for very long streak", () => {
    render(<StreakFlame streakDays={30} />)
    
    expect(screen.getByText("2x XP")).toBeInTheDocument()
  })

  it("applies custom className when provided", () => {
    render(<StreakFlame streakDays={5} className="custom-flame" />)
    
    const component = screen.getByTestId("streak-flame")
    expect(component).toHaveClass("custom-flame")
  })
})