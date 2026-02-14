import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock loadSandbox before importing the component
const mockLoadSandbox = vi.fn()
vi.mock("@/lib/sandbox", () => ({
  loadSandbox: () => mockLoadSandbox(),
}))

// Mock next/navigation
const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

// Mock gamification
vi.mock("@/lib/gamification", () => ({
  getRankForXp: (xp: number) => ({
    name: xp >= 500 ? "Operative" : "Recruit",
    title: xp >= 500 ? "Operative" : "Recruit",
    threshold: xp >= 500 ? 500 : 100,
    icon: "⚔️",
  }),
  ACHIEVEMENTS: [
    { id: "first-blood", title: "First Blood", condition: { type: "first-mission" } },
    { id: "streak-7", title: "Week Warrior", condition: { type: "streak", threshold: 7 } },
  ],
}))

// Mock gamification components
vi.mock("@/components/gamification", () => ({
  RankBadge: ({ rank }: { rank: { name: string } }) => (
    <div data-testid="rank-badge">{rank.name}</div>
  ),
  XpBar: ({ currentXp }: { currentXp: number }) => (
    <div data-testid="xp-bar">{currentXp} XP</div>
  ),
  StreakFlame: ({ streakDays }: { streakDays: number }) => (
    <div data-testid="streak-flame">{streakDays} days</div>
  ),
  StreakCalendar: () => <div data-testid="streak-calendar" />,
  AchievementGrid: ({ unlockedAchievements }: { unlockedAchievements: string[] }) => (
    <div data-testid="achievement-grid">{unlockedAchievements.length} unlocked</div>
  ),
}))

// Mock SRS components
vi.mock("@/components/srs", () => ({
  SkillDecayIndicator: () => <div data-testid="skill-decay-indicator" />,
}))

// Import after mocks
import ProfilePageClient from "../ProfilePageClient"

describe("ProfilePageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows Mission Control heading when loaded", () => {
    mockLoadSandbox.mockReturnValue(null)
    render(<ProfilePageClient />)
    expect(screen.getByText("Mission Control")).toBeInTheDocument()
  })

  it("displays XP from sandbox data", async () => {
    mockLoadSandbox.mockReturnValue({
      version: 1,
      userStats: {
        totalXp: 750,
        totalMissionsCompleted: 2,
        totalChallengesCompleted: 5,
        totalAchievements: 1,
        currentStreak: 3,
        longestStreak: 10,
        totalTimeSpentMinutes: 120,
      },
      streakData: {
        currentStreak: 3,
        longestStreak: 10,
        lastActiveDate: "2026-02-13",
        freezesAvailable: 2,
        freezesUsed: 0,
      },
      achievements: ["first-blood"],
      missionProgress: {},
      challengeResults: {},
      flashcardProgress: {},
      lastSynced: null,
    })

    render(<ProfilePageClient />)

    await waitFor(() => {
      expect(screen.getByTestId("xp-bar")).toHaveTextContent("750 XP")
    })
  })

  it("displays streak data from sandbox", async () => {
    mockLoadSandbox.mockReturnValue({
      version: 1,
      userStats: {
        totalXp: 200,
        totalMissionsCompleted: 1,
        totalChallengesCompleted: 0,
        totalAchievements: 0,
        currentStreak: 5,
        longestStreak: 14,
        totalTimeSpentMinutes: 60,
      },
      streakData: {
        currentStreak: 5,
        longestStreak: 14,
        lastActiveDate: "2026-02-13",
        freezesAvailable: 1,
        freezesUsed: 1,
      },
      achievements: [],
      missionProgress: {},
      challengeResults: {},
      flashcardProgress: {},
      lastSynced: null,
    })

    render(<ProfilePageClient />)

    await waitFor(() => {
      expect(screen.getByTestId("streak-flame")).toHaveTextContent("5 days")
    })
    expect(screen.getByText("14")).toBeInTheDocument() // longest streak
  })

  it("displays completed missions count from sandbox", async () => {
    mockLoadSandbox.mockReturnValue({
      version: 1,
      userStats: {
        totalXp: 500,
        totalMissionsCompleted: 3,
        totalChallengesCompleted: 10,
        totalAchievements: 2,
        currentStreak: 1,
        longestStreak: 5,
        totalTimeSpentMinutes: 90,
      },
      streakData: {
        currentStreak: 1,
        longestStreak: 5,
        lastActiveDate: "2026-02-13",
        freezesAvailable: 2,
        freezesUsed: 0,
      },
      achievements: ["first-blood", "streak-7"],
      missionProgress: {
        "lakehouse-fundamentals": {
          started: true,
          completed: true,
          stageProgress: {},
          sideQuestsCompleted: [],
          totalXpEarned: 150,
          completedAt: "2026-02-10T10:00:00.000Z",
        },
        "delta-lake-deep-dive": {
          started: true,
          completed: true,
          stageProgress: {},
          sideQuestsCompleted: [],
          totalXpEarned: 200,
          completedAt: "2026-02-12T10:00:00.000Z",
        },
        "pyspark-essentials": {
          started: true,
          completed: true,
          stageProgress: {},
          sideQuestsCompleted: [],
          totalXpEarned: 150,
          completedAt: "2026-02-13T10:00:00.000Z",
        },
      },
      challengeResults: {},
      flashcardProgress: {},
      lastSynced: null,
    })

    render(<ProfilePageClient />)

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument() // completed missions count
    })
  })

  it("shows empty state when sandbox has no data", async () => {
    mockLoadSandbox.mockReturnValue(null)

    render(<ProfilePageClient />)

    await waitFor(() => {
      expect(screen.getByTestId("xp-bar")).toHaveTextContent("0 XP")
    })
  })
})
