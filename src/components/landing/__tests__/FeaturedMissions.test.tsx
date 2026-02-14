import type { Mission } from "@/lib/missions"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { FeaturedMissions } from "../FeaturedMissions"

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Target: () => <span data-testid="target-icon" />,
  ArrowRight: () => <span data-testid="arrow-right" />,
}))

/** Helper to create a minimal mission fixture */
function createMission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: "test-mission",
    title: "Test Mission",
    subtitle: "A test subtitle",
    description: "A mission for testing",
    industry: "finance",
    rank: "A",
    xpRequired: 0,
    xpReward: 450,
    estimatedMinutes: 50,
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
  createMission({
    id: "structured-streaming",
    title: "Structured Streaming",
    subtitle: "Real-Time Data Processing at Scale",
    industry: "fintech",
    rank: "A",
    xpReward: 450,
    estimatedMinutes: 50,
  }),
  createMission({
    id: "unity-catalog-governance",
    title: "Unity Catalog Governance",
    subtitle: "Data Access Control & Compliance",
    industry: "government",
    rank: "A",
    xpReward: 450,
    estimatedMinutes: 50,
  }),
  createMission({
    id: "ml-pipelines-production",
    title: "ML Pipelines in Production",
    subtitle: "Deploy and monitor production ML pipelines",
    industry: "finance",
    rank: "S",
    xpReward: 750,
    estimatedMinutes: 65,
  }),
  createMission({
    id: "medallion-architecture",
    title: "Medallion Architecture",
    subtitle: "Bronze → Silver → Gold Pipeline Design",
    industry: "media",
    rank: "S",
    xpReward: 750,
    estimatedMinutes: 60,
  }),
]

describe("FeaturedMissions", () => {
  it("renders the section heading", () => {
    render(<FeaturedMissions missions={mockMissions} />)
    expect(
      screen.getByRole("heading", { name: /active campaigns/i }),
    ).toBeInTheDocument()
  })

  it("renders the Featured Operations label", () => {
    render(<FeaturedMissions missions={mockMissions} />)
    expect(screen.getByText("Featured Operations")).toBeInTheDocument()
  })

  it("renders all 4 mission titles", () => {
    render(<FeaturedMissions missions={mockMissions} />)
    expect(screen.getByText("Structured Streaming")).toBeInTheDocument()
    expect(screen.getByText("Unity Catalog Governance")).toBeInTheDocument()
    expect(screen.getByText("ML Pipelines in Production")).toBeInTheDocument()
    expect(screen.getByText("Medallion Architecture")).toBeInTheDocument()
  })

  it("renders subtitles for each mission", () => {
    render(<FeaturedMissions missions={mockMissions} />)
    expect(screen.getByText(/Real-Time Data Processing/i)).toBeInTheDocument()
    expect(screen.getByText(/Data Access Control/i)).toBeInTheDocument()
    expect(screen.getByText(/production ML pipelines/i)).toBeInTheDocument()
    expect(screen.getByText(/Bronze → Silver → Gold/i)).toBeInTheDocument()
  })

  it("renders rank badges for missions", () => {
    render(<FeaturedMissions missions={mockMissions} />)
    const aRanks = screen.getAllByText("A-RANK")
    expect(aRanks).toHaveLength(2)
    const sRanks = screen.getAllByText("S-RANK")
    expect(sRanks).toHaveLength(2)
  })

  it("renders View All Missions link", () => {
    render(<FeaturedMissions missions={mockMissions} />)
    const link = screen.getByRole("link", { name: /view all missions/i })
    expect(link).toHaveAttribute("href", "/missions")
  })

  it("links each mission card to its detail page", () => {
    render(<FeaturedMissions missions={mockMissions} />)
    const streamingLink = screen.getByRole("link", { name: /structured streaming/i })
    expect(streamingLink).toHaveAttribute("href", "/missions/structured-streaming")
  })

  it("returns null for empty missions array", () => {
    const { container } = render(<FeaturedMissions missions={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it("shows XP rewards for each mission", () => {
    render(<FeaturedMissions missions={mockMissions} />)
    const xpLabels = screen.getAllByText(/\+\d+ XP/)
    expect(xpLabels.length).toBe(4)
  })
})
