import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { StreakCalendar } from "../StreakCalendar"

describe("StreakCalendar", () => {
  const mockStreakData = [
    { date: "2026-02-01", hasActivity: true, isFrozen: false },
    { date: "2026-02-02", hasActivity: true, isFrozen: false },
    { date: "2026-02-03", hasActivity: false, isFrozen: true },
    { date: "2026-02-04", hasActivity: true, isFrozen: false },
    { date: "2026-02-05", hasActivity: false, isFrozen: false },
  ]

  it("renders calendar grid with correct month and year", () => {
    render(<StreakCalendar month={2} year={2026} streakData={mockStreakData} />)
    
    expect(screen.getByText("February 2026")).toBeInTheDocument()
  })

  it("displays correct day headers", () => {
    render(<StreakCalendar month={2} year={2026} streakData={mockStreakData} />)
    
    const dayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    dayHeaders.forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument()
    })
  })

  it("renders all days of the month", () => {
    render(<StreakCalendar month={2} year={2026} streakData={mockStreakData} />)
    
    // February 2026 has 28 days - check using data-testid to avoid conflicts
    for (let day = 1; day <= 28; day++) {
      const dateStr = `2026-02-${day.toString().padStart(2, '0')}`
      const dayElement = screen.getByTestId(`day-${dateStr}`)
      expect(dayElement).toBeInTheDocument()
      expect(dayElement).toHaveTextContent(day.toString())
    }
  })

  it("highlights days with activity", () => {
    render(<StreakCalendar month={2} year={2026} streakData={mockStreakData} />)
    
    const activeDay = screen.getByTestId("day-2026-02-01")
    expect(activeDay).toHaveClass("bg-anime-cyan")
  })

  it("shows frozen days with distinct styling", () => {
    render(<StreakCalendar month={2} year={2026} streakData={mockStreakData} />)
    
    const frozenDay = screen.getByTestId("day-2026-02-03")
    expect(frozenDay).toHaveClass("bg-anime-purple")
    expect(screen.getByText("❄️")).toBeInTheDocument()
  })

  it("shows inactive days with muted styling", () => {
    render(<StreakCalendar month={2} year={2026} streakData={mockStreakData} />)
    
    const inactiveDay = screen.getByTestId("day-2026-02-05")
    expect(inactiveDay).toHaveClass("bg-anime-800")
  })

  it("displays current day marker", () => {
    const today = new Date()
    const mockData = [
      { 
        date: today.toISOString().split('T')[0], 
        hasActivity: true, 
        isFrozen: false 
      }
    ]
    
    render(
      <StreakCalendar 
        month={today.getMonth() + 1} 
        year={today.getFullYear()} 
        streakData={mockData} 
      />
    )
    
    const todayElement = screen.getByTestId(`day-${today.toISOString().split('T')[0]}`)
    expect(todayElement).toHaveClass("ring-2", "ring-anime-yellow")
  })

  it("calls onDateClick when a date is clicked", () => {
    const handleDateClick = vi.fn()
    render(
      <StreakCalendar 
        month={2} 
        year={2026} 
        streakData={mockStreakData}
        onDateClick={handleDateClick}
      />
    )
    
    const dayButton = screen.getByTestId("day-2026-02-01")
    fireEvent.click(dayButton)
    
    expect(handleDateClick).toHaveBeenCalledWith("2026-02-01")
  })

  it("displays navigation buttons", () => {
    render(<StreakCalendar month={2} year={2026} streakData={mockStreakData} />)
    
    expect(screen.getByText("❮")).toBeInTheDocument() // Previous month
    expect(screen.getByText("❯")).toBeInTheDocument() // Next month
  })

  it("calls onMonthChange when navigation buttons are clicked", () => {
    const handleMonthChange = vi.fn()
    render(
      <StreakCalendar 
        month={2} 
        year={2026} 
        streakData={mockStreakData}
        onMonthChange={handleMonthChange}
      />
    )
    
    const prevButton = screen.getByText("❮")
    const nextButton = screen.getByText("❯")
    
    fireEvent.click(prevButton)
    expect(handleMonthChange).toHaveBeenCalledWith(1, 2026)
    
    fireEvent.click(nextButton)
    expect(handleMonthChange).toHaveBeenCalledWith(3, 2026)
  })

  it("handles year transitions when navigating months", () => {
    const handleMonthChange = vi.fn()
    
    // Test January -> December (previous year)
    render(
      <StreakCalendar 
        month={1} 
        year={2026} 
        streakData={[]}
        onMonthChange={handleMonthChange}
      />
    )
    
    const prevButton = screen.getByText("❮")
    fireEvent.click(prevButton)
    expect(handleMonthChange).toHaveBeenCalledWith(12, 2025)
  })

  it("shows streak statistics", () => {
    render(<StreakCalendar month={2} year={2026} streakData={mockStreakData} />)
    
    expect(screen.getByText("Current Streak")).toBeInTheDocument()
    expect(screen.getByText("Freezes Used")).toBeInTheDocument()
    expect(screen.getByText("Total Active")).toBeInTheDocument()
  })

  it("calculates correct streak statistics", () => {
    render(<StreakCalendar month={2} year={2026} streakData={mockStreakData} />)
    
    // Should show 3 active days, 1 freeze used
    expect(screen.getByText("3 days")).toBeInTheDocument() // Total active
    
    // Find the freezes used statistic - look for the number after "Freezes Used"
    const freezesUsedLabel = screen.getByText("Freezes Used")
    const freezesUsedContainer = freezesUsedLabel.parentElement!
    const freezesUsedValue = freezesUsedContainer.querySelector('.text-sm.font-bold')
    expect(freezesUsedValue).toHaveTextContent("1")
  })

  it("applies custom className when provided", () => {
    render(
      <StreakCalendar 
        month={2} 
        year={2026} 
        streakData={mockStreakData}
        className="custom-calendar"
      />
    )
    
    const calendar = screen.getByTestId("streak-calendar")
    expect(calendar).toHaveClass("custom-calendar")
  })

  it("handles empty streak data gracefully", () => {
    render(<StreakCalendar month={2} year={2026} streakData={[]} />)
    
    expect(screen.getByText("February 2026")).toBeInTheDocument()
    
    // Find specifically the "Total Active" statistic
    const totalActiveLabel = screen.getByText("Total Active")
    const totalActiveContainer = totalActiveLabel.parentElement!
    const totalActiveValue = totalActiveContainer.querySelector('.text-sm.font-bold')
    expect(totalActiveValue).toHaveTextContent("0 days")
  })
})