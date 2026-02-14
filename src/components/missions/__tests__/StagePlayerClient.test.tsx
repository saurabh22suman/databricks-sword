import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StagePlayerClient } from "../StagePlayerClient";

// Mock useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock the challenge components
vi.mock("@/components/missions", async () => {
  const actual = await vi.importActual("@/components/missions");
  return {
    ...actual,
    DragDropChallenge: ({ config, onComplete }: { config: unknown; onComplete: () => void }) => (
      <div data-testid="drag-drop-simulated">
        Simulated DragDrop
        <button onClick={onComplete}>Complete</button>
      </div>
    ),
    FillBlankChallenge: ({ config, onComplete }: { config: unknown; onComplete: () => void }) => (
      <div data-testid="fill-blank-simulated">
        Simulated FillBlank
        <button onClick={onComplete}>Complete</button>
      </div>
    ),
    MissionQuiz: ({ config, onComplete }: { config: unknown; onComplete: () => void }) => (
      <div data-testid="quiz-simulated">
        Quiz Component
        <button onClick={onComplete}>Complete</button>
      </div>
    ),
    MissionDebrief: ({ config, onComplete }: { config: unknown; onComplete: () => void }) => (
      <div data-testid="debrief-simulated">
        Debrief Component
        <button onClick={onComplete}>Complete</button>
      </div>
    ),
    DatabricksStagePlayer: ({
      missionSlug,
      stageId,
      bundleStatus,
    }: {
      missionSlug: string;
      stageId: string;
      bundleStatus: string;
    }) => (
      <div data-testid="databricks-stage-player">
        Databricks Mode: {missionSlug} / {stageId} / {bundleStatus}
      </div>
    ),
  };
});

describe("StagePlayerClient Mode Switching", () => {
  const dragDropConfig = {
    description: "Arrange the code blocks",
    blocks: [
      { id: "1", code: "code1", label: "Block 1" },
      { id: "2", code: "code2", label: "Block 2" },
    ],
    correctOrder: ["1", "2"],
    hints: ["Hint 1"],
  };

  const fillBlankConfig = {
    description: "Fill in the blanks",
    codeTemplate: "SELECT * FROM __BLANK_0__",
    blanks: [
      { id: 0, correctAnswer: "users", options: ["users", "customers"] },
    ],
    hints: ["Hint 1"],
  };

  const quizConfig = {
    questions: [
      {
        id: "q1",
        question: "Test question?",
        options: ["A", "B", "C", "D"],
        correctAnswer: 0,
        explanation: "Explanation",
      },
    ],
    passingScore: 80,
  };

  const debriefConfig = {
    summary: "Mission complete!",
    keyLearnings: ["Learning 1"],
    conceptsForReview: [{ concept: "Test", importance: "high" as const }],
    industryContext: "Context",
    alternativeApproach: "Alternative",
    furtherReading: [{ title: "Read more", url: "https://example.com" }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Simulated mode", () => {
    it("renders simulated DragDropChallenge for drag-drop stage", () => {
      render(
        <StagePlayerClient
          stageType="drag-drop"
          config={dragDropConfig}
          nextUrl="/missions/test/stage/02"
          missionId="test-mission"
          stageId="01-drag-drop"
          executionMode="simulated"
        />
      );

      expect(screen.getByTestId("drag-drop-simulated")).toBeInTheDocument();
    });

    it("renders simulated FillBlankChallenge for fill-blank stage", () => {
      render(
        <StagePlayerClient
          stageType="fill-blank"
          config={fillBlankConfig}
          nextUrl="/missions/test/stage/03"
          missionId="test-mission"
          stageId="02-fill-blank"
          executionMode="simulated"
        />
      );

      expect(screen.getByTestId("fill-blank-simulated")).toBeInTheDocument();
    });

    it("renders quiz component in simulated mode", () => {
      render(
        <StagePlayerClient
          stageType="quiz"
          config={quizConfig}
          nextUrl="/missions/test/stage/04"
          missionId="test-mission"
          stageId="03-quiz"
          executionMode="simulated"
        />
      );

      expect(screen.getByTestId("quiz-simulated")).toBeInTheDocument();
    });
  });

  describe("Databricks mode", () => {
    it("renders DatabricksStagePlayer for drag-drop stage in databricks mode", () => {
      render(
        <StagePlayerClient
          stageType="drag-drop"
          config={dragDropConfig}
          nextUrl="/missions/test/stage/02"
          missionId="test-mission"
          stageId="01-drag-drop"
          executionMode="databricks"
          bundleStatus="deployed"
        />
      );

      expect(screen.getByTestId("databricks-stage-player")).toBeInTheDocument();
      expect(screen.getByText(/test-mission/)).toBeInTheDocument();
      expect(screen.getByText(/deployed/)).toBeInTheDocument();
    });

    it("renders DatabricksStagePlayer for fill-blank stage in databricks mode", () => {
      render(
        <StagePlayerClient
          stageType="fill-blank"
          config={fillBlankConfig}
          nextUrl="/missions/test/stage/03"
          missionId="test-mission"
          stageId="02-fill-blank"
          executionMode="databricks"
          bundleStatus="deployed"
        />
      );

      expect(screen.getByTestId("databricks-stage-player")).toBeInTheDocument();
    });

    it("renders simulated quiz component even in databricks mode", () => {
      render(
        <StagePlayerClient
          stageType="quiz"
          config={quizConfig}
          nextUrl="/missions/test/stage/04"
          missionId="test-mission"
          stageId="03-quiz"
          executionMode="databricks"
          bundleStatus="deployed"
        />
      );

      // Quiz always uses simulated mode
      expect(screen.getByTestId("quiz-simulated")).toBeInTheDocument();
    });

    it("renders simulated debrief component even in databricks mode", () => {
      render(
        <StagePlayerClient
          stageType="debrief"
          config={debriefConfig}
          nextUrl="/missions"
          missionId="test-mission"
          stageId="04-debrief"
          executionMode="databricks"
          bundleStatus="deployed"
        />
      );

      // Debrief always uses simulated mode
      expect(screen.getByTestId("debrief-simulated")).toBeInTheDocument();
    });
  });

  describe("Default mode", () => {
    it("defaults to simulated mode when executionMode is not provided", () => {
      render(
        <StagePlayerClient
          stageType="drag-drop"
          config={dragDropConfig}
          nextUrl="/missions/test/stage/02"
          missionId="test-mission"
          stageId="01-drag-drop"
        />
      );

      // Should render simulated component
      expect(screen.getByTestId("drag-drop-simulated")).toBeInTheDocument();
    });
  });
});
