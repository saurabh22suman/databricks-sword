import { RANKS } from "@/lib/gamification"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { RankBadge } from "../RankBadge"

describe("RankBadge", () => {
  it("renders the badge image with correct src and alt text", () => {
    const cadetRank = RANKS[0] // Cadet rank
    render(<RankBadge rank={cadetRank} />)
    
    const badge = screen.getByRole("img", { name: cadetRank.badge.alt })
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute("src", cadetRank.badge.src)
    expect(badge).toHaveAttribute("alt", cadetRank.badge.alt)
  })

  it("renders the rank title", () => {
    const commanderRank = RANKS[4] // Commander rank 
    render(<RankBadge rank={commanderRank} />)
    
    expect(screen.getByText("Commander")).toBeInTheDocument()
  })

  it("applies custom size when provided", () => {
    const operativeRank = RANKS[2] // Operative rank
    render(<RankBadge rank={operativeRank} size={64} />)
    
    const badge = screen.getByRole("img")
    expect(badge).toHaveStyle({ width: "64px", height: "64px" })
  })

  it("uses default size when no size provided", () => {
    const specialistRank = RANKS[3] // Specialist rank
    render(<RankBadge rank={specialistRank} />)
    
    const badge = screen.getByRole("img")
    expect(badge).toHaveStyle({ width: "48px", height: "48px" })
  })

  it("renders badge with correct src for each rank", () => {
    const sentinelRank = RANKS[5] // Sentinel rank
    render(<RankBadge rank={sentinelRank} />)
    
    const badge = screen.getByRole("img")
    expect(badge).toHaveAttribute("src", "/badges/rank-sentinel.png")
  })

  it("shows rank description when showDescription is true", () => {
    const architectRank = RANKS[6] // Architect rank
    render(<RankBadge rank={architectRank} showDescription={true} />)
    
    expect(screen.getByText(architectRank.description)).toBeInTheDocument()
  })

  it("does not show rank description by default", () => {
    const grandmasterRank = RANKS[7] // Grandmaster rank
    render(<RankBadge rank={grandmasterRank} />)
    
    expect(screen.queryByText(grandmasterRank.description)).not.toBeInTheDocument()
  })

  it("applies custom className when provided", () => {
    const recruitRank = RANKS[1] // Recruit rank
    render(<RankBadge rank={recruitRank} className="custom-class" />)
    
    const mainContainer = screen.getByText("Recruit").parentElement?.parentElement
    expect(mainContainer).toHaveClass("custom-class")
  })
})