import type { Mission } from "@/lib/missions"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { InteractiveSyllabus } from "../InteractiveSyllabus"

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Sparkles: () => <span data-testid="sparkles-icon" />,
  ArrowRight: () => <span data-testid="arrow-right" />,
  Loader2: () => <span data-testid="loader" />,
  Zap: () => <span data-testid="zap-icon" />,
  ChevronRight: () => <span data-testid="chevron-right" />,
}))

/** Helper to create a minimal mission fixture */
function createMission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: "test-mission",
    title: "Test Mission",
    subtitle: "A test mission",
    description: "A mission for testing",
    industry: "finance",
    rank: "B",
    xpRequired: 0,
    xpReward: 100,
    estimatedMinutes: 30,
    primaryFeatures: ["test"],
    prerequisites: [],
    databricksEnabled: false,
    stages: [
      {
        id: "s1",
        title: "Stage 1",
        type: "briefing",
        configFile: "stages/01-briefing.json",
        xpReward: 10,
        estimatedMinutes: 5,
      },
    ],
    sideQuests: [],
    achievements: [],
    ...overrides,
  }
}

const mockMissions: Mission[] = [
  // DE Track missions
  createMission({
    id: "lakehouse-fundamentals",
    title: "Lakehouse Fundamentals",
    rank: "B",
    estimatedMinutes: 45,
  }),
  createMission({
    id: "sql-analytics-intro",
    title: "SQL Analytics Intro",
    rank: "B",
    estimatedMinutes: 35,
    prerequisites: ["lakehouse-fundamentals"],
  }),
  createMission({
    id: "delta-lake-deep-dive",
    title: "Delta Lake Deep Dive",
    rank: "A",
    estimatedMinutes: 60,
    prerequisites: ["lakehouse-fundamentals"],
  }),
  createMission({
    id: "medallion-architecture",
    title: "Medallion Architecture",
    rank: "S",
    estimatedMinutes: 90,
    prerequisites: ["delta-lake-deep-dive"],
  }),
  // ML Track missions
  createMission({
    id: "ml-foundations",
    title: "ML Foundations",
    rank: "B",
    estimatedMinutes: 40,
  }),
  createMission({
    id: "mlflow-experiment-tracking",
    title: "MLflow Experiment Tracking",
    rank: "A",
    estimatedMinutes: 60,
    prerequisites: ["ml-foundations"],
  }),
  // BI Track missions
  createMission({
    id: "bi-dashboards",
    title: "BI Dashboards",
    rank: "A",
    estimatedMinutes: 50,
    prerequisites: ["sql-analytics-intro"],
  }),
  createMission({
    id: "semantic-layer-governance",
    title: "Semantic Layer Governance",
    rank: "S",
    estimatedMinutes: 70,
    prerequisites: ["bi-dashboards"],
  }),
]

describe("InteractiveSyllabus", () => {
  it("renders the section heading", () => {
    render(<InteractiveSyllabus missions={mockMissions} />)
    expect(
      screen.getByRole("heading", { name: /mission path/i }),
    ).toBeInTheDocument()
  })

  it("renders all three track tabs", () => {
    render(<InteractiveSyllabus missions={mockMissions} />)
    expect(screen.getByRole("button", { name: /data engineering/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /machine learning/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /bi & analytics/i })).toBeInTheDocument()
  })

  it("shows one mission per rank tier for DE track by default", () => {
    render(<InteractiveSyllabus missions={mockMissions} />)
    // DE track has B, A, S rank missions — picks one of each
    expect(screen.getByText("Lakehouse Fundamentals")).toBeInTheDocument()
    expect(screen.getByText("Delta Lake Deep Dive")).toBeInTheDocument()
    expect(screen.getByText("Medallion Architecture")).toBeInTheDocument()
    // sql-analytics-intro is B-rank but not shown (only first B is picked)
    expect(screen.queryByText("SQL Analytics Intro")).not.toBeInTheDocument()
  })

  it("switches to ML track when ML tab is clicked", async () => {
    const user = userEvent.setup()
    render(<InteractiveSyllabus missions={mockMissions} />)

    await user.click(screen.getByRole("button", { name: /machine learning/i }))

    expect(screen.getByText("ML Foundations")).toBeInTheDocument()
    expect(screen.getByText("MLflow Experiment Tracking")).toBeInTheDocument()
    // DE missions should not be showing
    expect(screen.queryByText("Lakehouse Fundamentals")).not.toBeInTheDocument()
  })

  it("switches to BI track when BI tab is clicked", async () => {
    const user = userEvent.setup()
    render(<InteractiveSyllabus missions={mockMissions} />)

    await user.click(screen.getByRole("button", { name: /bi & analytics/i }))

    expect(screen.getByText("BI Dashboards")).toBeInTheDocument()
    expect(screen.getByText("Semantic Layer Governance")).toBeInTheDocument()
    expect(screen.queryByText("Lakehouse Fundamentals")).not.toBeInTheDocument()
  })

  it("shows 'See all' link when track has more missions than shown", () => {
    render(<InteractiveSyllabus missions={mockMissions} />)
    // DE has 4 missions but only 3 shown (1 per rank tier)
    expect(screen.getByText(/see all 4 missions/i)).toBeInTheDocument()
  })

  it("shows one rank badge per tier for the active track", () => {
    render(<InteractiveSyllabus missions={mockMissions} />)
    // DE track shows exactly 1 B-RANK, 1 A-RANK, 1 S-RANK
    expect(screen.getByText("B-RANK")).toBeInTheDocument()
    expect(screen.getByText("A-RANK")).toBeInTheDocument()
    expect(screen.getByText("S-RANK")).toBeInTheDocument()
  })

  it("shows prerequisite arrows between missions", () => {
    render(<InteractiveSyllabus missions={mockMissions} />)
    // Prerequisite connector arrows should be present
    const connectors = screen.getAllByTestId("chevron-right")
    expect(connectors.length).toBeGreaterThan(0)
  })

  it("renders deploy to missions link", () => {
    render(<InteractiveSyllabus missions={mockMissions} />)
    expect(screen.getByRole("link", { name: /deploy to missions/i })).toHaveAttribute(
      "href",
      "/missions",
    )
  })

  it("handles empty missions array gracefully", () => {
    render(<InteractiveSyllabus missions={[]} />)
    expect(
      screen.getByRole("heading", { name: /mission path/i }),
    ).toBeInTheDocument()
  })
})
