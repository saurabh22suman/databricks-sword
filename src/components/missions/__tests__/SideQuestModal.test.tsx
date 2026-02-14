import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SideQuestModal } from "../SideQuestModal";

describe("SideQuestModal", () => {
  const mockSideQuest = {
    id: "delta-lake-oss",
    title: "Delta Lake Deep Dive",
    description: "Explore the internals of the Delta Lake transaction log",
    xpReward: 25,
    type: "quiz" as const,
    content: {
      questions: [
        {
          id: "q1",
          question: "What file format does Delta Lake use?",
          options: ["Parquet", "JSON", "Avro", "ORC"],
          correctAnswer: 0,
          explanation: "Delta Lake stores data in Parquet format with JSON-based transaction logs.",
        },
      ],
      passingScore: 100,
    },
  };

  const mockOnSkip = vi.fn();
  const mockOnComplete = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders overlay modal with side quest content", () => {
    render(
      <SideQuestModal
        sideQuest={mockSideQuest}
        isOpen={true}
        onSkip={mockOnSkip}
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("Delta Lake Deep Dive")).toBeInTheDocument();
    expect(screen.getByText(/Explore the internals/)).toBeInTheDocument();
  });

  it("shows Skip and Start Side Quest buttons", () => {
    render(
      <SideQuestModal
        sideQuest={mockSideQuest}
        isOpen={true}
        onSkip={mockOnSkip}
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByRole("button", { name: /skip/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();
  });

  it("calls onSkip when Skip is clicked", async () => {
    const user = userEvent.setup();
    render(
      <SideQuestModal
        sideQuest={mockSideQuest}
        isOpen={true}
        onSkip={mockOnSkip}
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />
    );

    await user.click(screen.getByRole("button", { name: /skip/i }));

    expect(mockOnSkip).toHaveBeenCalled();
  });

  it("shows mini-stage content when Start is clicked", async () => {
    const user = userEvent.setup();
    render(
      <SideQuestModal
        sideQuest={mockSideQuest}
        isOpen={true}
        onSkip={mockOnSkip}
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />
    );

    await user.click(screen.getByRole("button", { name: /start/i }));

    // Should show the quiz question
    await waitFor(() => {
      expect(screen.getByText(/What file format/)).toBeInTheDocument();
    });
  });

  it("calls onComplete when side quest is finished", async () => {
    const user = userEvent.setup();
    render(
      <SideQuestModal
        sideQuest={mockSideQuest}
        isOpen={true}
        onSkip={mockOnSkip}
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />
    );

    // Start the quest
    await user.click(screen.getByRole("button", { name: /start/i }));

    // Wait for quiz content to appear
    await waitFor(() => {
      expect(screen.getByText(/What file format/)).toBeInTheDocument();
    });

    // Select the correct answer (Parquet)
    await user.click(screen.getByText("Parquet"));

    // Submit
    const submitButton = screen.getByRole("button", { name: /submit|check|complete/i });
    await user.click(submitButton);

    // Should call onComplete with XP reward
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith(25);
    });
  });

  it("shows XP reward in the modal", () => {
    render(
      <SideQuestModal
        sideQuest={mockSideQuest}
        isOpen={true}
        onSkip={mockOnSkip}
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(/25.*XP|XP.*25/i)).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(
      <SideQuestModal
        sideQuest={mockSideQuest}
        isOpen={false}
        onSkip={mockOnSkip}
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText("Delta Lake Deep Dive")).not.toBeInTheDocument();
  });

  it("applies cyberpunk overlay styling", () => {
    render(
      <SideQuestModal
        sideQuest={mockSideQuest}
        isOpen={true}
        onSkip={mockOnSkip}
        onComplete={mockOnComplete}
        onClose={mockOnClose}
      />
    );

    const modal = screen.getByTestId("side-quest-modal");
    expect(modal.className).toMatch(/bg-anime|border-anime|shadow-neon/);
  });
});
