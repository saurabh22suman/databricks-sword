import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock sandbox
const mockLoadSandbox = vi.fn()
vi.mock("@/lib/sandbox", () => ({
  loadSandbox: () => mockLoadSandbox(),
  updateSandbox: vi.fn(),
}))

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, transition, whileHover, ...domProps } = props
      return <div {...domProps}>{children}</div>
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

// Mock SRS functions
vi.mock("@/lib/srs", () => ({
  getDueCards: (progress: unknown[], flashcards: unknown[]) => {
    // Return all flashcards as due for testing
    return (flashcards as Array<{ id: string }>).map((card) => ({
      flashcard: card,
      progress: (progress as Array<{ cardId: string }>).find(
        (p) => p.cardId === card.id,
      ),
    }))
  },
  processReview: vi.fn().mockReturnValue({
    updatedProgress: {},
    reviewResult: {},
  }),
  calculateSkillDecay: vi.fn().mockReturnValue([]),
  sandboxToSrsProgress: vi.fn().mockReturnValue({
    cardId: "card_1",
    userId: "local",
    easinessFactor: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: new Date().toISOString(),
    totalReviews: 0,
    lapseCount: 0,
    isGraduated: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  srsToSandboxProgress: vi.fn().mockReturnValue({
    lastReviewed: new Date().toISOString(),
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    nextReview: new Date().toISOString(),
  }),
}))

// Mock SRS components
vi.mock("@/components/srs/ReviewQueue", () => ({
  ReviewQueue: () => <div data-testid="review-queue" />,
}))

vi.mock("@/components/srs/SkillDecayIndicator", () => ({
  SkillDecayIndicator: () => <div data-testid="skill-decay" />,
}))

// Mock UI components
vi.mock("@/components/ui/Button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.PropsWithChildren<{ onClick?: () => void }>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))

vi.mock("@/components/ui/GenericCard", () => ({
  GenericCard: ({
    children,
    className,
  }: React.PropsWithChildren<{ className?: string }>) => (
    <div className={className}>{children}</div>
  ),
}))

import type { Flashcard } from "@/lib/srs"
import ReviewPageClient from "../../review/ReviewPageClient"

const MOCK_FLASHCARDS: Flashcard[] = [
  {
    id: "card_1",
    missionId: "mission_1",
    question: "What is Delta Lake?",
    answer: "An open-source storage layer for data lakes.",
    difficulty: "B",
    type: "concept",
    tags: ["delta-lake"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
]

describe("ReviewPage — sandbox integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders overview with sandbox streak data instead of hardcoded values", async () => {
    mockLoadSandbox.mockReturnValue({
      version: 1,
      userStats: {
        totalXp: 500,
        totalMissionsCompleted: 2,
        totalChallengesCompleted: 5,
        totalAchievements: 1,
        currentStreak: 14,
        longestStreak: 21,
        totalTimeSpentMinutes: 120,
      },
      streakData: {
        currentStreak: 14,
        longestStreak: 21,
        lastActiveDate: "2026-02-13",
        freezesAvailable: 2,
        freezesUsed: 0,
      },
      achievements: [],
      missionProgress: {},
      challengeResults: {},
      flashcardProgress: {},
      lastSynced: null,
    })

    render(<ReviewPageClient initialFlashcards={MOCK_FLASHCARDS} />)

    await waitFor(() => {
      // Should show sandbox streak, not hardcoded 7
      expect(screen.getByText("14")).toBeInTheDocument()
    })
  })

  it("shows 0 streak when sandbox is empty", async () => {
    mockLoadSandbox.mockReturnValue(null)

    render(<ReviewPageClient initialFlashcards={MOCK_FLASHCARDS} />)

    await waitFor(() => {
      expect(screen.getByText("0")).toBeInTheDocument()
    })
  })
})
