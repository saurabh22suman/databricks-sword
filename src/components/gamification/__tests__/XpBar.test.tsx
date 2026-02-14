import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { XpBar } from "../XpBar"

describe("XpBar", () => {
  it("displays current XP and displays next rank target", () => {
    // Cadet with 50 XP (halfway to Recruit at 100 XP)
    render(<XpBar currentXp={50} />)
    
    expect(screen.getByText("50")).toBeInTheDocument()
    expect(screen.getByText("100")).toBeInTheDocument()
    expect(screen.getByText("Recruit")).toBeInTheDocument()
  })

  it("shows correct progress percentage for current rank", () => {
    // 50 XP = 50% progress towards Recruit (100 XP)
    render(<XpBar currentXp={50} />)
    
    const progressBar = screen.getByRole("progressbar")
    expect(progressBar).toHaveAttribute("aria-valuenow", "50")
    expect(progressBar).toHaveAttribute("aria-valuemin", "0") 
    expect(progressBar).toHaveAttribute("aria-valuemax", "100")
  })

  it("displays current rank information", () => {
    // 300 XP = Operative rank (500 XP threshold)
    render(<XpBar currentXp={300} />)
    
    expect(screen.getByText("Operative")).toBeInTheDocument()
    expect(screen.getByText("300")).toBeInTheDocument() 
  })

  it("shows XP needed for next rank", () => {
    // 1200 XP = Operative (500), next rank is Specialist (1500)
    render(<XpBar currentXp={1200} />)
    
    expect(screen.getByText("1200")).toBeInTheDocument()
    expect(screen.getByText("1500")).toBeInTheDocument()
    expect(screen.getByText("Specialist")).toBeInTheDocument()
  })

  it("handles max rank correctly", () => {
    // 50000 XP = Grandmaster (max rank)
    render(<XpBar currentXp={50000} />)
    
    expect(screen.getByText("Grandmaster")).toBeInTheDocument()
    expect(screen.getByText("MAX")).toBeInTheDocument()
    
    const progressBar = screen.getByRole("progressbar")
    expect(progressBar).toHaveAttribute("aria-valuenow", "100")
  })

  it("applies custom className when provided", () => {
    render(<XpBar currentXp={100} className="custom-class" />)
    
    const container = screen.getByTestId("xp-bar")
    expect(container).toHaveClass("custom-class")
  })

  it("shows animated progress when showAnimation is true", () => {
    render(<XpBar currentXp={250} showAnimation={true} />)
    
    const progressFill = screen.getByTestId("progress-fill")
    expect(progressFill).toHaveClass("animate-progress")
  })

  it("does not show animation by default", () => {
    render(<XpBar currentXp={250} />)
    
    const progressFill = screen.getByTestId("progress-fill") 
    expect(progressFill).not.toHaveClass("animate-progress")
  })

  it("calculates correct progress for rank boundaries", () => {
    // Exactly at Recruit threshold (100 XP)
    render(<XpBar currentXp={100} />)
    
    const progressBar = screen.getByRole("progressbar")
    expect(progressBar).toHaveAttribute("aria-valuenow", "0") // 0% into Recruit rank
    expect(screen.getByText("Operative")).toBeInTheDocument() // Next rank
  })

  it("handles zero XP correctly", () => {
    render(<XpBar currentXp={0} />)
    
    expect(screen.getByText("Cadet")).toBeInTheDocument()
    expect(screen.getByText("0")).toBeInTheDocument()
    expect(screen.getByText("100")).toBeInTheDocument()
    expect(screen.getByText("Recruit")).toBeInTheDocument()
    
    const progressBar = screen.getByRole("progressbar")
    expect(progressBar).toHaveAttribute("aria-valuenow", "0")
  })

  it("displays XP remaining text", () => {
    // 750 XP = Operative, need 750 more for Specialist (1500)
    render(<XpBar currentXp={750} />)
    
    expect(screen.getByText("750 XP to next rank")).toBeInTheDocument()
  })

  it("displays max rank text when at highest level", () => {
    render(<XpBar currentXp={30000} />)
    
    expect(screen.getByText("Maximum rank achieved")).toBeInTheDocument()
  })
})