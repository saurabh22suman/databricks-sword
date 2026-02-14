/**
 * @file MissionBriefing.test.tsx
 * @description Tests for MissionBriefing component - displays mission narrative and learning objectives
 */

import type { BriefingConfig } from "@/lib/missions";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MissionBriefing } from "../MissionBriefing";

const mockBriefingConfig: BriefingConfig = {
  narrative: "In the high-stakes world of financial technology, milliseconds matter. A major investment bank needs to process millions of transactions per second while maintaining data integrity and compliance. Traditional batch processing won't cut it anymore. They need a real-time data pipeline that can handle the volume, velocity, and variety of modern financial data.",
  objective: "Build a fault-tolerant, real-time data pipeline that processes financial transactions, ensures exactly-once semantics, and maintains full audit trails for regulatory compliance.",
  learningGoals: [
    "Understand Delta Lake architecture and ACID transactions",
    "Master Structured Streaming for real-time data processing",
    "Implement exactly-once semantics with checkpointing",
    "Design schemas for efficient querying and compliance",
  ],
  industryContext: {
    domain: "Financial Services",
    realWorldApplication: "Investment banks process over 10 billion transactions daily, requiring sub-millisecond latency and zero data loss.",
    keyStakeholders: ["Risk Management", "Compliance Team", "Trading Desk"],
  },
};

const mockMinimalConfig: BriefingConfig = {
  narrative: "Short narrative",
  objective: "Complete this mission",
  learningGoals: ["Goal 1"],
};

describe("MissionBriefing", () => {
  describe("Basic Rendering", () => {
    it("renders narrative text", () => {
      render(<MissionBriefing config={mockBriefingConfig} />);
      expect(
        screen.getByText(/In the high-stakes world of financial technology/)
      ).toBeInTheDocument();
    });

    it("renders mission objective", () => {
      render(<MissionBriefing config={mockBriefingConfig} />);
      expect(
        screen.getByText(/Build a fault-tolerant, real-time data pipeline/)
      ).toBeInTheDocument();
    });

    it("renders objective heading", () => {
      render(<MissionBriefing config={mockBriefingConfig} />);
      expect(screen.getByText("Mission Objective")).toBeInTheDocument();
    });
  });

  describe("Learning Goals", () => {
    it("renders learning goals heading", () => {
      render(<MissionBriefing config={mockBriefingConfig} />);
      expect(screen.getByText("Learning Goals")).toBeInTheDocument();
    });

    it("renders all learning goals as list items", () => {
      render(<MissionBriefing config={mockBriefingConfig} />);
      expect(
        screen.getByText("Understand Delta Lake architecture and ACID transactions")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Master Structured Streaming for real-time data processing")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Implement exactly-once semantics with checkpointing")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Design schemas for efficient querying and compliance")
      ).toBeInTheDocument();
    });

    it("renders learning goals with bullet points", () => {
      const { container } = render(<MissionBriefing config={mockBriefingConfig} />);
      const listItems = container.querySelectorAll("li");
      expect(listItems.length).toBe(4);
    });

    it("handles single learning goal", () => {
      render(<MissionBriefing config={mockMinimalConfig} />);
      expect(screen.getByText("Goal 1")).toBeInTheDocument();
    });
  });

  describe("Industry Context", () => {
    it("renders industry context when provided", () => {
      render(<MissionBriefing config={mockBriefingConfig} />);
      expect(screen.getByText("Industry Context")).toBeInTheDocument();
    });

    it("renders domain information", () => {
      render(<MissionBriefing config={mockBriefingConfig} />);
      expect(screen.getByText(/Financial Services/)).toBeInTheDocument();
    });

    it("renders real-world application", () => {
      render(<MissionBriefing config={mockBriefingConfig} />);
      expect(
        screen.getByText(/Investment banks process over 10 billion transactions daily/)
      ).toBeInTheDocument();
    });

    it("renders key stakeholders", () => {
      render(<MissionBriefing config={mockBriefingConfig} />);
      expect(screen.getByText("Risk Management")).toBeInTheDocument();
      expect(screen.getByText("Compliance Team")).toBeInTheDocument();
      expect(screen.getByText("Trading Desk")).toBeInTheDocument();
    });

    it("does not render industry context when not provided", () => {
      render(<MissionBriefing config={mockMinimalConfig} />);
      expect(screen.queryByText("Industry Context")).not.toBeInTheDocument();
    });
  });

  describe("Estimated Time", () => {
    it("renders estimated time when provided", () => {
      render(<MissionBriefing config={mockBriefingConfig} estimatedMinutes={45} />);
      expect(screen.getByText(/45 minutes/i)).toBeInTheDocument();
    });

    it("converts hours for times over 60 minutes", () => {
      render(<MissionBriefing config={mockBriefingConfig} estimatedMinutes={120} />);
      expect(screen.getByText(/2 hours/i)).toBeInTheDocument();
    });

    it("handles mixed hours and minutes", () => {
      render(<MissionBriefing config={mockBriefingConfig} estimatedMinutes={90} />);
      expect(screen.getByText(/1 hour 30 minutes/i)).toBeInTheDocument();
    });

    it("does not render estimated time when not provided", () => {
      render(<MissionBriefing config={mockBriefingConfig} />);
      expect(screen.queryByText(/minutes/i)).not.toBeInTheDocument();
    });
  });

  describe("Call to Action", () => {
    it("renders start button", () => {
      render(<MissionBriefing config={mockBriefingConfig} />);
      expect(screen.getByRole("button", { name: /begin mission/i })).toBeInTheDocument();
    });

    it("calls onStart when button is clicked", () => {
      let started = false;
      const handleStart = () => {
        started = true;
      };
      render(<MissionBriefing config={mockBriefingConfig} onStart={handleStart} />);
      screen.getByRole("button", { name: /begin mission/i }).click();
      expect(started).toBe(true);
    });

    it("disables button when loading", () => {
      render(<MissionBriefing config={mockBriefingConfig} isLoading />);
      expect(screen.getByRole("button", { name: /preparing/i })).toBeDisabled();
    });

    it("shows loading text when loading", () => {
      render(<MissionBriefing config={mockBriefingConfig} isLoading />);
      expect(screen.getByText(/preparing/i)).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies cyberpunk theme classes", () => {
      const { container } = render(<MissionBriefing config={mockBriefingConfig} />);
      const element = container.querySelector(".bg-anime-900");
      expect(element).toBeInTheDocument();
    });

    it("applies cut-corner styling to objective section", () => {
      const { container } = render(<MissionBriefing config={mockBriefingConfig} />);
      const cutCorner = container.querySelector(".cut-corner");
      expect(cutCorner).toBeInTheDocument();
    });

    it("applies neon glow to headings", () => {
      const { container } = render(<MissionBriefing config={mockBriefingConfig} />);
      const heading = container.querySelector(".text-anime-cyan");
      expect(heading).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("uses proper heading hierarchy", () => {
      render(<MissionBriefing config={mockBriefingConfig} />);
      const headings = screen.getAllByRole("heading");
      expect(headings.length).toBeGreaterThan(0);
    });

    it("uses semantic list for learning goals", () => {
      render(<MissionBriefing config={mockBriefingConfig} />);
      const list = screen.getByRole("list");
      expect(list).toBeInTheDocument();
    });

    it("provides accessible button labels", () => {
      render(<MissionBriefing config={mockBriefingConfig} />);
      const button = screen.getByRole("button", { name: /begin mission/i });
      expect(button).toHaveAccessibleName();
    });
  });
});
