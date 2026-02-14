import type { Flashcard } from "@/lib/srs"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { FlashcardViewer } from "../FlashcardViewer"

// Mock framer-motion for animations
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe("FlashcardViewer", () => {
  const mockFlashcard: Flashcard = {
    id: "card_123",
    missionId: "mission_delta_lake",
    question: "What is ACID compliance in Delta Lake?",
    answer: "ACID stands for Atomicity, Consistency, Isolation, and Durability. Delta Lake ensures ACID transactions by using transaction logs.",
    codeExample: `df.write.format("delta").save("/path/to/table")`,
    hint: "Think about database transaction properties",
    difficulty: "A",
    type: "concept",
    tags: ["delta-lake", "acid", "transactions"],
    createdAt: "2026-02-10T10:00:00.000Z",
    updatedAt: "2026-02-10T10:00:00.000Z"
  }

  const mockHandlers = {
    onRating: vi.fn(),
    onNext: vi.fn(),
    onShowHint: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the flashcard question initially", () => {
    render(
      <FlashcardViewer
        flashcard={mockFlashcard}
        isFlipped={false}
        onRating={mockHandlers.onRating}
        onNext={mockHandlers.onNext}
        onShowHint={mockHandlers.onShowHint}
      />
    )
    
    expect(screen.getByText("What is ACID compliance in Delta Lake?")).toBeInTheDocument()
    expect(screen.queryByText(/ACID stands for Atomicity/)).not.toBeInTheDocument()
  })

  it("shows the answer when flipped", () => {
    render(
      <FlashcardViewer
        flashcard={mockFlashcard}
        isFlipped={true}
        onRating={mockHandlers.onRating}
        onNext={mockHandlers.onNext}
        onShowHint={mockHandlers.onShowHint}
      />
    )
    
    expect(screen.getByText(/ACID stands for Atomicity/)).toBeInTheDocument()
    expect(screen.queryByText("What is ACID compliance in Delta Lake?")).not.toBeInTheDocument()
  })

  it("displays code example when present", () => {
    render(
      <FlashcardViewer
        flashcard={mockFlashcard}
        isFlipped={true}
        onRating={mockHandlers.onRating}
        onNext={mockHandlers.onNext}
        onShowHint={mockHandlers.onShowHint}
      />
    )
    
    expect(screen.getByText(/df\.write\.format\("delta"\)/)).toBeInTheDocument()
  })

  it("shows hint button when hint is available", () => {
    render(
      <FlashcardViewer
        flashcard={mockFlashcard}
        isFlipped={false}
        onRating={mockHandlers.onRating}
        onNext={mockHandlers.onNext}
        onShowHint={mockHandlers.onShowHint}
      />
    )
    
    expect(screen.getByRole("button", { name: /hint/i })).toBeInTheDocument()
  })

  it("calls onShowHint when hint button is clicked", () => {
    render(
      <FlashcardViewer
        flashcard={mockFlashcard}
        isFlipped={false}
        onRating={mockHandlers.onRating}
        onNext={mockHandlers.onNext}
        onShowHint={mockHandlers.onShowHint}
      />
    )
    
    fireEvent.click(screen.getByRole("button", { name: /hint/i }))
    expect(mockHandlers.onShowHint).toHaveBeenCalledWith(mockFlashcard.id)
  })

  it("displays hint when showHint is true", () => {
    render(
      <FlashcardViewer
        flashcard={mockFlashcard}
        isFlipped={false}
        showHint={true}
        onRating={mockHandlers.onRating}
        onNext={mockHandlers.onNext}
        onShowHint={mockHandlers.onShowHint}
      />
    )
    
    expect(screen.getByText("Think about database transaction properties")).toBeInTheDocument()
  })

  it("renders quality rating buttons when flipped", () => {
    render(
      <FlashcardViewer
        flashcard={mockFlashcard}
        isFlipped={true}
        onRating={mockHandlers.onRating}
        onNext={mockHandlers.onNext}
        onShowHint={mockHandlers.onShowHint}
      />
    )
    
    const ratingButtons = screen.getAllByRole("button", { name: /again|hard|good|easy/i })
    expect(ratingButtons).toHaveLength(4) // Again (0), Hard (2), Good (3), Easy (5)
  })

  it("calls onRating with correct quality when rating button is clicked", () => {
    render(
      <FlashcardViewer
        flashcard={mockFlashcard}
        isFlipped={true}
        onRating={mockHandlers.onRating}
        onNext={mockHandlers.onNext}
        onShowHint={mockHandlers.onShowHint}
      />
    )
    
    fireEvent.click(screen.getByRole("button", { name: /good/i }))
    expect(mockHandlers.onRating).toHaveBeenCalledWith(mockFlashcard.id, 3)
  })

  it("shows flip button when not flipped", () => {
    render(
      <FlashcardViewer
        flashcard={mockFlashcard}
        isFlipped={false}
        onRating={mockHandlers.onRating}
        onNext={mockHandlers.onNext}
        onShowHint={mockHandlers.onShowHint}
      />
    )
    
    expect(screen.getByRole("button", { name: /show answer|flip/i })).toBeInTheDocument()
  })

  it("displays card difficulty and type", () => {
    render(
      <FlashcardViewer
        flashcard={mockFlashcard}
        isFlipped={false}
        onRating={mockHandlers.onRating}
        onNext={mockHandlers.onNext}
        onShowHint={mockHandlers.onShowHint}
      />
    )
    
    expect(screen.getByText("A")).toBeInTheDocument() // difficulty
    expect(screen.getByText("concept")).toBeInTheDocument() // type
  })

  it("displays card tags", () => {
    render(
      <FlashcardViewer
        flashcard={mockFlashcard}
        isFlipped={false}
        onRating={mockHandlers.onRating}
        onNext={mockHandlers.onNext}
        onShowHint={mockHandlers.onShowHint}
      />
    )
    
    expect(screen.getByText("delta-lake")).toBeInTheDocument()
    expect(screen.getByText("acid")).toBeInTheDocument()
    expect(screen.getByText("transactions")).toBeInTheDocument()
  })

  it("handles cards without code examples", () => {
    const cardWithoutCode = { ...mockFlashcard, codeExample: undefined }
    
    render(
      <FlashcardViewer
        flashcard={cardWithoutCode}
        isFlipped={true}
        onRating={mockHandlers.onRating}
        onNext={mockHandlers.onNext}
        onShowHint={mockHandlers.onShowHint}
      />
    )
    
    expect(screen.queryByText(/df\.write\.format/)).not.toBeInTheDocument()
  })

  it("handles cards without hints", () => {
    const cardWithoutHint = { ...mockFlashcard, hint: undefined }
    
    render(
      <FlashcardViewer
        flashcard={cardWithoutHint}
        isFlipped={false}
        onRating={mockHandlers.onRating}
        onNext={mockHandlers.onNext}
        onShowHint={mockHandlers.onShowHint}
      />
    )
    
    expect(screen.queryByRole("button", { name: /hint/i })).not.toBeInTheDocument()
  })
})