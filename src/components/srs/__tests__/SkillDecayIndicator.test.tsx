import type { SkillDecay } from "@/lib/srs"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SkillDecayIndicator } from "../SkillDecayIndicator"

describe("SkillDecayIndicator", () => {
  const mockSkillDecayData: SkillDecay[] = [
    {
      skillId: "delta_lake",
      userId: "user_123",
      skillName: "Delta Lake",
      missionIds: ["mission_delta_lake"],
      lastPracticed: "2026-02-05T10:00:00.000Z", // 7 days ago
      daysSinceLastPractice: 7,
      retentionEstimate: 85,
      decayLevel: "mild",
      recommendedAction: "review",
      relatedCards: 12,
      cardsDue: 3
    },
    {
      skillId: "spark_sql",
      userId: "user_123", 
      skillName: "Spark SQL",
      missionIds: ["mission_spark_sql"],
      lastPracticed: "2026-01-20T10:00:00.000Z", // 23 days ago
      daysSinceLastPractice: 23,
      retentionEstimate: 45,
      decayLevel: "severe",
      recommendedAction: "relearn",
      relatedCards: 18,
      cardsDue: 8
    },
    {
      skillId: "mlflow",
      userId: "user_123",
      skillName: "MLflow",
      missionIds: ["mission_mlflow"],
      lastPracticed: "2026-02-10T10:00:00.000Z", // 2 days ago
      daysSinceLastPractice: 2,
      retentionEstimate: 95,
      decayLevel: "none",
      recommendedAction: "none",
      relatedCards: 8,
      cardsDue: 0
    },
    {
      skillId: "streaming",
      userId: "user_123",
      skillName: "Structured Streaming", 
      missionIds: ["mission_streaming"],
      lastPracticed: "2026-02-08T10:00:00.000Z", // 4 days ago
      daysSinceLastPractice: 4,
      retentionEstimate: 70,
      decayLevel: "moderate",
      recommendedAction: "practice",
      relatedCards: 15,
      cardsDue: 5
    }
  ]

  const mockHandlers = {
    onReviewSkill: vi.fn(),
    onViewDetails: vi.fn(),
    onRefresh: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders skill decay indicators", () => {
    render(
      <SkillDecayIndicator
        skillDecayData={mockSkillDecayData}
        onReviewSkill={mockHandlers.onReviewSkill}
        onViewDetails={mockHandlers.onViewDetails}
        onRefresh={mockHandlers.onRefresh}
      />
    )

    expect(screen.getByText("Skill Decay Monitor")).toBeInTheDocument()
    expect(screen.getByText("Delta Lake")).toBeInTheDocument()
    expect(screen.getByText("Spark SQL")).toBeInTheDocument()
    expect(screen.getByText("MLflow")).toBeInTheDocument()
    expect(screen.getByText("Structured Streaming")).toBeInTheDocument()
  })

  it("displays decay levels with appropriate styling", () => {
    render(
      <SkillDecayIndicator
        skillDecayData={mockSkillDecayData}
        onReviewSkill={mockHandlers.onReviewSkill}
        onViewDetails={mockHandlers.onViewDetails}
        onRefresh={mockHandlers.onRefresh}
      />
    )

    // Check that severe decay is highlighted
    const severeSkill = screen.getByText("Spark SQL").closest(".skill-decay-item")
    expect(severeSkill).toHaveClass("border-anime-accent") // Red for severe

    // Check that no decay is styled appropriately
    const goodSkill = screen.getByText("MLflow").closest(".skill-decay-item")
    expect(goodSkill).toHaveClass("border-anime-green") // Green for good
  })

  it("shows retention estimates", () => {
    render(
      <SkillDecayIndicator
        skillDecayData={mockSkillDecayData}
        onReviewSkill={mockHandlers.onReviewSkill}
        onViewDetails={mockHandlers.onViewDetails}
        onRefresh={mockHandlers.onRefresh}
      />
    )

    expect(screen.getByText("85%")).toBeInTheDocument() // Delta Lake retention
    expect(screen.getByText("45%")).toBeInTheDocument() // Spark SQL retention
    expect(screen.getByText("95%")).toBeInTheDocument() // MLflow retention
    expect(screen.getByText("70%")).toBeInTheDocument() // Streaming retention
  })

  it("displays days since last practice", () => {
    render(
      <SkillDecayIndicator
        skillDecayData={mockSkillDecayData}
        onReviewSkill={mockHandlers.onReviewSkill}
        onViewDetails={mockHandlers.onViewDetails}
        onRefresh={mockHandlers.onRefresh}
      />
    )

    expect(screen.getByText((content, element) => {
      return content.includes("Last practiced: 7 days ago")
    })).toBeInTheDocument()
    expect(screen.getByText((content, element) => {
      return content.includes("Last practiced: 23 days ago")
    })).toBeInTheDocument()
    expect(screen.getByText((content, element) => {
      return content.includes("Last practiced: 2 days ago") 
    })).toBeInTheDocument()
    expect(screen.getByText((content, element) => {
      return content.includes("Last practiced: 4 days ago")
    })).toBeInTheDocument()
  })

  it("shows recommended actions", () => {
    render(
      <SkillDecayIndicator
        skillDecayData={mockSkillDecayData}
        onReviewSkill={mockHandlers.onReviewSkill}
        onViewDetails={mockHandlers.onViewDetails}
        onRefresh={mockHandlers.onRefresh}
      />
    )

    expect(screen.getByText("Review")).toBeInTheDocument()
    expect(screen.getByText("Relearn")).toBeInTheDocument()
    expect(screen.getByText("Practice")).toBeInTheDocument()
  })

  it("displays card counts", () => {
    render(
      <SkillDecayIndicator
        skillDecayData={mockSkillDecayData}
        onReviewSkill={mockHandlers.onReviewSkill}
        onViewDetails={mockHandlers.onViewDetails}
        onRefresh={mockHandlers.onRefresh}
      />
    )

    expect(screen.getByText("3/12")).toBeInTheDocument() // Delta Lake: 3 due / 12 total
    expect(screen.getByText("8/18")).toBeInTheDocument() // Spark SQL: 8 due / 18 total
    expect(screen.getByText("0/8")).toBeInTheDocument()  // MLflow: 0 due / 8 total
    expect(screen.getByText("5/15")).toBeInTheDocument() // Streaming: 5 due / 15 total
  })

  it("calls onReviewSkill when review button is clicked", () => {
    render(
      <SkillDecayIndicator
        skillDecayData={mockSkillDecayData}
        onReviewSkill={mockHandlers.onReviewSkill}
        onViewDetails={mockHandlers.onViewDetails}
        onRefresh={mockHandlers.onRefresh}
      />
    )

    const reviewButtons = screen.getAllByRole("button", { name: /🎯 Review/i })
    fireEvent.click(reviewButtons[0])
    expect(mockHandlers.onReviewSkill).toHaveBeenCalledWith("spark_sql") // First skill is sorted by severity
  })

  it("calls onViewDetails when details button is clicked", () => {
    render(
      <SkillDecayIndicator
        skillDecayData={mockSkillDecayData}
        onReviewSkill={mockHandlers.onReviewSkill}
        onViewDetails={mockHandlers.onViewDetails}
        onRefresh={mockHandlers.onRefresh}
      />
    )

    const detailsButtons = screen.getAllByRole("button", { name: /📊 Details/i })
    fireEvent.click(detailsButtons[0])
    expect(mockHandlers.onViewDetails).toHaveBeenCalledWith("spark_sql") // First skill is sorted by severity
  })

  it("sorts skills by decay severity", () => {
    render(
      <SkillDecayIndicator
        skillDecayData={mockSkillDecayData}
        onReviewSkill={mockHandlers.onReviewSkill}
        onViewDetails={mockHandlers.onViewDetails}
        onRefresh={mockHandlers.onRefresh}
      />
    )

    const skillNames = screen.getAllByText(/Delta Lake|Spark SQL|MLflow|Structured Streaming/)
      .map(el => el.textContent)

    // Should be sorted by severity: severe > moderate > mild > none
    expect(skillNames[0]).toBe("Spark SQL") // severe
    expect(skillNames[1]).toBe("Structured Streaming") // moderate
    expect(skillNames[2]).toBe("Delta Lake") // mild
    expect(skillNames[3]).toBe("MLflow") // none
  })

  it("shows empty state when no decay data", () => {
    render(
      <SkillDecayIndicator
        skillDecayData={[]}
        onReviewSkill={mockHandlers.onReviewSkill}
        onViewDetails={mockHandlers.onViewDetails}
        onRefresh={mockHandlers.onRefresh}
      />
    )

    expect(screen.getByText(/no skill decay data/i)).toBeInTheDocument()
    expect(screen.getByText(/complete some missions/i)).toBeInTheDocument()
  })

  it("filters by decay level", () => {
    render(
      <SkillDecayIndicator
        skillDecayData={mockSkillDecayData}
        showFilters={true}
        filterLevel="severe"
        onReviewSkill={mockHandlers.onReviewSkill}
        onViewDetails={mockHandlers.onViewDetails}
        onRefresh={mockHandlers.onRefresh}
      />
    )

    // Should only show severe decay skills
    expect(screen.getByText("Spark SQL")).toBeInTheDocument()
    expect(screen.queryByText("Delta Lake")).not.toBeInTheDocument()
    expect(screen.queryByText("MLflow")).not.toBeInTheDocument()
  })

  it("shows decay level badges with correct colors", () => {
    render(
      <SkillDecayIndicator
        skillDecayData={mockSkillDecayData}
        onReviewSkill={mockHandlers.onReviewSkill}
        onViewDetails={mockHandlers.onViewDetails}
        onRefresh={mockHandlers.onRefresh}
      />
    )

    expect(screen.getByText("SEVERE")).toBeInTheDocument()
    expect(screen.getByText("MODERATE")).toBeInTheDocument()
    expect(screen.getByText("MILD")).toBeInTheDocument()
    expect(screen.getByText("GOOD")).toBeInTheDocument()
  })

  it("displays progress bars for retention estimates", () => {
    render(
      <SkillDecayIndicator
        skillDecayData={mockSkillDecayData}
        onReviewSkill={mockHandlers.onReviewSkill}
        onViewDetails={mockHandlers.onViewDetails}
        onRefresh={mockHandlers.onRefresh}
      />
    )

    const progressBars = screen.getAllByRole("progressbar")
    expect(progressBars).toHaveLength(4) // One for each skill

    // Check specific progress values
    expect(progressBars[0]).toHaveAttribute("aria-valuenow", "45") // Spark SQL (severe)
    expect(progressBars[1]).toHaveAttribute("aria-valuenow", "70") // Streaming (moderate) 
    expect(progressBars[2]).toHaveAttribute("aria-valuenow", "85") // Delta Lake (mild)
    expect(progressBars[3]).toHaveAttribute("aria-valuenow", "95") // MLflow (good)
  })

  it("handles refresh action", () => {
    render(
      <SkillDecayIndicator
        skillDecayData={mockSkillDecayData}
        onReviewSkill={mockHandlers.onReviewSkill}
        onViewDetails={mockHandlers.onViewDetails}
        onRefresh={mockHandlers.onRefresh}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /refresh/i }))
    expect(mockHandlers.onRefresh).toHaveBeenCalled()
  })
})