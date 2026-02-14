import type { Flashcard, FlashcardProgress } from "@/lib/srs"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ReviewQueue } from "../ReviewQueue"

describe("ReviewQueue", () => {
  const mockFlashcards: Flashcard[] = [
    {
      id: "card_1",
      missionId: "mission_delta_lake",
      question: "What is Delta Lake?",
      answer: "Delta Lake is an open-source storage layer",
      difficulty: "B",
      type: "concept",
      tags: ["delta-lake", "storage"],
      createdAt: "2026-02-10T10:00:00.000Z",
      updatedAt: "2026-02-10T10:00:00.000Z"
    },
    {
      id: "card_2",
      missionId: "mission_spark",
      question: "How do you create a Spark DataFrame?",
      answer: "Use spark.createDataFrame() or spark.read methods",
      codeExample: `df = spark.createDataFrame(data, schema)`,
      difficulty: "A",
      type: "code",
      tags: ["spark", "dataframe"],
      createdAt: "2026-02-10T10:00:00.000Z",
      updatedAt: "2026-02-10T10:00:00.000Z"
    },
    {
      id: "card_3",
      missionId: "mission_mlflow",
      question: "What is MLflow used for?",
      answer: "MLflow is used for machine learning lifecycle management",
      hint: "Think about model tracking and deployment",
      difficulty: "A",
      type: "concept",
      tags: ["mlflow", "ml", "lifecycle"],
      createdAt: "2026-02-10T10:00:00.000Z",
      updatedAt: "2026-02-10T10:00:00.000Z"
    }
  ]

  const mockProgress: FlashcardProgress[] = mockFlashcards.map((card, index) => ({
    cardId: card.id,
    userId: "user_123",
    easinessFactor: 2.5,
    interval: index + 1,
    repetitions: index,
    nextReview: "2026-02-12T10:00:00.000Z", // All due now
    totalReviews: index + 1,
    lapseCount: 0,
    isGraduated: false,
    lastQuality: 3,
    averageQuality: 3.5,
    createdAt: "2026-02-10T10:00:00.000Z",
    updatedAt: "2026-02-11T10:00:00.000Z"
  }))

  const mockHandlers = {
    onReview: vi.fn(),
    onComplete: vi.fn(),
    onSkip: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders queue with due cards", () => {
    render(
      <ReviewQueue
        flashcards={mockFlashcards}
        progress={mockProgress}
        onReview={mockHandlers.onReview}
        onComplete={mockHandlers.onComplete}
        onSkip={mockHandlers.onSkip}
      />
    )

    expect(screen.getByText("Review Queue")).toBeInTheDocument()
    expect(screen.getByText(/3 cards due/i)).toBeInTheDocument()
  })

  it("shows current card progress", () => {
    render(
      <ReviewQueue
        flashcards={mockFlashcards}
        progress={mockProgress}
        currentIndex={1}
        onReview={mockHandlers.onReview}
        onComplete={mockHandlers.onComplete}
        onSkip={mockHandlers.onSkip}
      />
    )

    expect(screen.getByText("2 of 3")).toBeInTheDocument()
  })

  it("displays current flashcard", () => {
    render(
      <ReviewQueue
        flashcards={mockFlashcards}
        progress={mockProgress}
        currentIndex={0}
        onReview={mockHandlers.onReview}
        onComplete={mockHandlers.onComplete}
        onSkip={mockHandlers.onSkip}
      />
    )

    expect(screen.getByText("What is Delta Lake?")).toBeInTheDocument()
  })

  it("shows completion message when queue is empty", () => {
    render(
      <ReviewQueue
        flashcards={[]}
        progress={[]}
        onReview={mockHandlers.onReview}
        onComplete={mockHandlers.onComplete}
        onSkip={mockHandlers.onSkip}
      />
    )

    expect(screen.getByText(/no cards due/i)).toBeInTheDocument()
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument()
  })

  it("shows completion message when all cards reviewed", () => {
    render(
      <ReviewQueue
        flashcards={mockFlashcards}
        progress={mockProgress}
        currentIndex={mockFlashcards.length} // Beyond last card
        onReview={mockHandlers.onReview}
        onComplete={mockHandlers.onComplete}
        onSkip={mockHandlers.onSkip}
      />
    )

    expect(screen.getByText(/session complete/i)).toBeInTheDocument()
  })

  it("calls onReview when card is rated", () => {
    render(
      <ReviewQueue
        flashcards={mockFlashcards}
        progress={mockProgress}
        currentIndex={0}
        isFlipped={true}
        onReview={mockHandlers.onReview}
        onComplete={mockHandlers.onComplete}
        onSkip={mockHandlers.onSkip}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /good/i }))
    expect(mockHandlers.onReview).toHaveBeenCalledWith("card_1", 3)
  })

  it("calls onSkip when skip button is clicked", () => {
    render(
      <ReviewQueue
        flashcards={mockFlashcards}
        progress={mockProgress}
        currentIndex={0}
        onReview={mockHandlers.onReview}
        onComplete={mockHandlers.onComplete}
        onSkip={mockHandlers.onSkip}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /skip/i }))
    expect(mockHandlers.onSkip).toHaveBeenCalledWith("card_1")
  })

  it("displays queue statistics", () => {
    render(
      <ReviewQueue
        flashcards={mockFlashcards}
        progress={mockProgress}
        reviewedCount={5}
        streakCount={2}
        onReview={mockHandlers.onReview}
        onComplete={mockHandlers.onComplete}
        onSkip={mockHandlers.onSkip}
      />
    )

    expect(screen.getByText("5")).toBeInTheDocument() // reviewed count
    expect(screen.getByText("2")).toBeInTheDocument() // streak count
  })

  it("shows difficulty filter options", () => {
    render(
      <ReviewQueue
        flashcards={mockFlashcards}
        progress={mockProgress}
        showFilters={true}
        onReview={mockHandlers.onReview}
        onComplete={mockHandlers.onComplete}
        onSkip={mockHandlers.onSkip}
      />
    )

    expect(screen.getByText("All Difficulties")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "B" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "A" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "S" })).toBeInTheDocument()
  })

  it("filters cards by difficulty", () => {
    const onFilterChange = vi.fn()
    
    render(
      <ReviewQueue
        flashcards={mockFlashcards}
        progress={mockProgress}
        showFilters={true}
        difficulty="A"
        onFilterChange={onFilterChange}
        onReview={mockHandlers.onReview}
        onComplete={mockHandlers.onComplete}
        onSkip={mockHandlers.onSkip}
      />
    )

    // Should only show A-rank cards (2 cards)
    expect(screen.getByText(/2 cards due/i)).toBeInTheDocument()
  })

  it("shows session timer", () => {
    render(
      <ReviewQueue
        flashcards={mockFlashcards}
        progress={mockProgress}
        sessionStartTime={new Date("2026-02-12T10:00:00.000Z")}
        onReview={mockHandlers.onReview}
        onComplete={mockHandlers.onComplete}
        onSkip={mockHandlers.onSkip}
      />
    )

    expect(screen.getByText(/00:00/)).toBeInTheDocument() // Timer display
  })

  it("handles keyboard shortcuts", () => {
    render(
      <ReviewQueue
        flashcards={mockFlashcards}
        progress={mockProgress}
        currentIndex={0}
        isFlipped={true}
        onReview={mockHandlers.onReview}
        onComplete={mockHandlers.onComplete}
        onSkip={mockHandlers.onSkip}
      />
    )

    // Simulate pressing '3' key for Good rating
    fireEvent.keyDown(document, { key: "3" })
    expect(mockHandlers.onReview).toHaveBeenCalledWith("card_1", 3)
  })

  it("shows progress bar", () => {
    render(
      <ReviewQueue
        flashcards={mockFlashcards}
        progress={mockProgress}
        currentIndex={1}
        onReview={mockHandlers.onReview}
        onComplete={mockHandlers.onComplete}
        onSkip={mockHandlers.onSkip}
      />
    )

    const progressBar = screen.getByRole("progressbar")
    expect(progressBar).toHaveAttribute("aria-valuenow", "1")
    expect(progressBar).toHaveAttribute("aria-valuemax", "3")
  })

  it("handles empty flashcard gracefully", () => {
    const emptyFlashcard = { ...mockFlashcards[0], question: "", answer: "" }
    
    render(
      <ReviewQueue
        flashcards={[emptyFlashcard]}
        progress={mockProgress.slice(0, 1)}
        currentIndex={0}
        onReview={mockHandlers.onReview}
        onComplete={mockHandlers.onComplete}
        onSkip={mockHandlers.onSkip}
      />
    )

    expect(screen.getByText(/skip/i)).toBeInTheDocument()
  })
})