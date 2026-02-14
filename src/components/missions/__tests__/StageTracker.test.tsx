import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StageTracker } from "../StageTracker";

// Mock useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("StageTracker", () => {
  const mockStages = [
    { id: "01-briefing", title: "Mission Briefing", type: "briefing" },
    { id: "02-diagram", title: "Architecture Overview", type: "diagram" },
    { id: "03-drag-drop", title: "Build Pipeline", type: "drag-drop" },
    { id: "04-quiz", title: "Knowledge Check", type: "quiz" },
    { id: "05-debrief", title: "Mission Debrief", type: "debrief" },
  ];

  const mockOnNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all stages in horizontal progress bar", () => {
    render(
      <StageTracker
        stages={mockStages}
        currentStageId="02-diagram"
        completedStageIds={["01-briefing"]}
        missionId="test-mission"
        onNavigate={mockOnNavigate}
      />
    );

    expect(screen.getByText("Mission Briefing")).toBeInTheDocument();
    expect(screen.getByText("Architecture Overview")).toBeInTheDocument();
    expect(screen.getByText("Build Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Knowledge Check")).toBeInTheDocument();
    expect(screen.getByText("Mission Debrief")).toBeInTheDocument();
  });

  it("highlights current stage with neon accent", () => {
    render(
      <StageTracker
        stages={mockStages}
        currentStageId="02-diagram"
        completedStageIds={["01-briefing"]}
        missionId="test-mission"
        onNavigate={mockOnNavigate}
      />
    );

    // Current stage number circle should have cyan styling
    const currentStage = screen.getByText("2").closest("div");
    expect(currentStage?.className).toMatch(/anime-cyan|shadow-neon-cyan/);
  });

  it("shows completed stages as filled", () => {
    render(
      <StageTracker
        stages={mockStages}
        currentStageId="02-diagram"
        completedStageIds={["01-briefing"]}
        missionId="test-mission"
        onNavigate={mockOnNavigate}
      />
    );

    // Completed stage number circle should have green styling
    const completedStage = screen.getByText("1").closest("div");
    expect(completedStage?.className).toMatch(/anime-green/);
  });

  it("shows upcoming stages as dimmed", () => {
    render(
      <StageTracker
        stages={mockStages}
        currentStageId="02-diagram"
        completedStageIds={["01-briefing"]}
        missionId="test-mission"
        onNavigate={mockOnNavigate}
      />
    );

    const upcomingStage = screen.getByText("Build Pipeline").closest("button");
    expect(upcomingStage?.className).toMatch(/opacity|dimmed|disabled|anime-700/);
  });

  it("allows navigation to completed stages", async () => {
    const user = userEvent.setup();
    render(
      <StageTracker
        stages={mockStages}
        currentStageId="03-drag-drop"
        completedStageIds={["01-briefing", "02-diagram"]}
        missionId="test-mission"
        onNavigate={mockOnNavigate}
      />
    );

    const completedStage = screen.getByText("Mission Briefing").closest("button");
    await user.click(completedStage!);

    expect(mockOnNavigate).toHaveBeenCalledWith("01-briefing");
  });

  it("prevents navigation to upcoming stages", async () => {
    const user = userEvent.setup();
    render(
      <StageTracker
        stages={mockStages}
        currentStageId="02-diagram"
        completedStageIds={["01-briefing"]}
        missionId="test-mission"
        onNavigate={mockOnNavigate}
      />
    );

    const upcomingStage = screen.getByText("Build Pipeline").closest("button");
    await user.click(upcomingStage!);

    expect(mockOnNavigate).not.toHaveBeenCalled();
  });

  it("shows stage numbers", () => {
    render(
      <StageTracker
        stages={mockStages}
        currentStageId="02-diagram"
        completedStageIds={["01-briefing"]}
        missionId="test-mission"
        onNavigate={mockOnNavigate}
      />
    );

    // Stage numbers should be visible
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders connecting lines between stages", () => {
    render(
      <StageTracker
        stages={mockStages}
        currentStageId="02-diagram"
        completedStageIds={["01-briefing"]}
        missionId="test-mission"
        onNavigate={mockOnNavigate}
      />
    );

    // Should render connector elements
    const container = screen.getByTestId("stage-tracker");
    const connectors = container.querySelectorAll('[class*="connector"], [class*="line"]');
    expect(connectors.length).toBeGreaterThan(0);
  });
});
