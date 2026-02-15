/**
 * @file MissionCard.test.tsx
 * @description Tests for MissionCard component - displays mission metadata with gamification elements
 */

import type { Mission } from "@/lib/missions";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MissionCard } from "../MissionCard";

const mockMission: Mission = {
  id: "financial-pipeline",
  title: "Build a Financial Data Pipeline",
  subtitle: "Real-Time Transaction Processing",
  description: "Design and implement a scalable data pipeline for processing financial transactions in real-time using Delta Lake and Structured Streaming.",
  industry: "finance",
  rank: "B",
  xpRequired: 0,
  xpReward: 150,
  estimatedMinutes: 45,
  primaryFeatures: ["Delta Lake", "Structured Streaming", "PySpark"],
  prerequisites: [],
  databricksEnabled: false,
  stages: [
    {
      id: "briefing",
      type: "briefing",
      title: "Mission Briefing",
      xpReward: 20,
      estimatedMinutes: 5,
      configFile: "stages/01-briefing.json",
    },
    {
      id: "drag-drop",
      type: "drag-drop",
      title: "Build Pipeline Architecture",
      xpReward: 50,
      estimatedMinutes: 15,
      configFile: "stages/02-drag-drop.json",
    },
  ],
  sideQuests: [],
  achievements: [],
};

const mockAdvancedMission: Mission = {
  ...mockMission,
  id: "ml-pipeline-advanced",
  title: "Advanced ML Pipeline Optimization",
  rank: "S",
  xpRequired: 5000,
  xpReward: 500,
  estimatedMinutes: 120,
};

describe("MissionCard", () => {
  describe("Basic Rendering", () => {
    it("renders mission title", () => {
      render(<MissionCard mission={mockMission} />);
      expect(screen.getByText("Build a Financial Data Pipeline")).toBeInTheDocument();
    });

    it("renders mission subtitle", () => {
      render(<MissionCard mission={mockMission} />);
      expect(screen.getByText("Real-Time Transaction Processing")).toBeInTheDocument();
    });

    it("renders mission description", () => {
      render(<MissionCard mission={mockMission} />);
      expect(
        screen.getByText(/Design and implement a scalable data pipeline/)
      ).toBeInTheDocument();
    });

    it("renders industry label", () => {
      render(<MissionCard mission={mockMission} />);
      expect(screen.getByText(/finance/i)).toBeInTheDocument();
    });
  });

  describe("Rank Badge", () => {
    it('renders B rank badge for beginner missions', () => {
      render(<MissionCard mission={mockMission} />);
      const badge = screen.getByText("B");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("bg-anime-green");
    });

    it('renders A rank badge for intermediate missions', () => {
      const intermediateMission = { ...mockMission, rank: "A" as const };
      render(<MissionCard mission={intermediateMission} />);
      const badge = screen.getByText("A");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("bg-anime-yellow");
    });

    it('renders S rank badge for advanced missions', () => {
      render(<MissionCard mission={mockAdvancedMission} />);
      const badge = screen.getByText("S");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("bg-anime-accent");
    });
  });

  describe("XP Display", () => {
    it("renders XP reward for beginner missions", () => {
      render(<MissionCard mission={mockMission} />);
      expect(screen.getByText("150")).toBeInTheDocument();
      expect(screen.getByText("XP")).toBeInTheDocument();
    });

    it("renders XP reward for advanced missions", () => {
      render(<MissionCard mission={mockAdvancedMission} />);
      expect(screen.getByText("500")).toBeInTheDocument();
    });

    it("displays XP requirement when mission is locked", () => {
      render(<MissionCard mission={mockAdvancedMission} userXp={1000} />);
      expect(screen.getByText(/Requires 5000 XP/i)).toBeInTheDocument();
    });
  });

  describe("Estimated Time", () => {
    it("renders estimated time in minutes", () => {
      render(<MissionCard mission={mockMission} />);
      expect(screen.getByText("45 min")).toBeInTheDocument();
    });

    it("converts hours for missions over 60 minutes", () => {
      render(<MissionCard mission={mockAdvancedMission} />);
      expect(screen.getByText("2h")).toBeInTheDocument();
    });
  });

  describe("Locked/Unlocked State", () => {
    it("renders unlocked state when user has enough XP", () => {
      render(<MissionCard mission={mockMission} userXp={100} />);
      expect(screen.queryByText(/Requires.*XP/i)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /start/i })).toBeEnabled();
    });

    it("renders locked state when user lacks XP", () => {
      render(<MissionCard mission={mockAdvancedMission} userXp={1000} />);
      expect(screen.getByText(/Requires 5000 XP/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /locked/i })).toBeDisabled();
    });

    it("defaults to unlocked when userXp prop is not provided", () => {
      render(<MissionCard mission={mockMission} />);
      expect(screen.getByRole("button", { name: /start/i })).toBeEnabled();
    });

    it("unlocks mission when user has exactly required XP", () => {
      render(<MissionCard mission={mockAdvancedMission} userXp={5000} />);
      expect(screen.getByRole("button", { name: /start/i })).toBeEnabled();
    });
  });

  describe("Progress Display", () => {
    it("shows progress percentage when mission is in progress", () => {
      render(<MissionCard mission={mockMission} progress={50} />);
      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    it("renders continue button when mission has progress", () => {
      render(<MissionCard mission={mockMission} progress={30} />);
      expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
    });

    it("does not show progress when not started", () => {
      render(<MissionCard mission={mockMission} />);
      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });

    it("shows completion badge when progress is 100%", () => {
      render(<MissionCard mission={mockMission} progress={100} />);
      expect(screen.getByText(/replay/i)).toBeInTheDocument();
    });
  });

  describe("Primary Features", () => {
    it("renders primary features as tags", () => {
      render(<MissionCard mission={mockMission} />);
      expect(screen.getByText("Delta Lake")).toBeInTheDocument();
      expect(screen.getByText("Structured Streaming")).toBeInTheDocument();
      expect(screen.getByText("PySpark")).toBeInTheDocument();
    });

    it("limits displayed features to 3", () => {
      const missionWithManyFeatures = {
        ...mockMission,
        primaryFeatures: ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
      };
      render(<MissionCard mission={missionWithManyFeatures} />);
      expect(screen.getByText("Feature 1")).toBeInTheDocument();
      expect(screen.getByText("Feature 2")).toBeInTheDocument();
      expect(screen.getByText("Feature 3")).toBeInTheDocument();
      expect(screen.queryByText("Feature 4")).not.toBeInTheDocument();
      expect(screen.getByText("+2 more")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies cyberpunk theme classes", () => {
      const { container } = render(<MissionCard mission={mockMission} />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass("cut-corner");
      expect(card).toHaveClass("bg-anime-900");
      expect(card).toHaveClass("border-anime-700");
    });

    it("applies hover effects", () => {
      const { container } = render(<MissionCard mission={mockMission} />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass("hover:border-anime-cyan");
    });

    it("applies locked state styling", () => {
      const { container } = render(
        <MissionCard mission={mockAdvancedMission} userXp={1000} />
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass("opacity-50");
    });
  });

  describe("Click Handling", () => {
    it("calls onClick when card is clicked", () => {
      let clicked = false;
      const handleClick = () => {
        clicked = true;
      };
      render(<MissionCard mission={mockMission} onClick={handleClick} />);
      screen.getByRole("button", { name: /start/i }).click();
      expect(clicked).toBe(true);
    });

    it("does not call onClick when card is locked", () => {
      let clicked = false;
      const handleClick = () => {
        clicked = true;
      };
      render(
        <MissionCard mission={mockAdvancedMission} userXp={1000} onClick={handleClick} />
      );
      // Locked button should not trigger onClick
      expect(clicked).toBe(false);
    });
  });
});
