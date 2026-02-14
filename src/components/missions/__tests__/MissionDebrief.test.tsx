/**
 * @file MissionDebrief.test.tsx
 * @description Tests for MissionDebrief component - mission completion summary
 */

import type { DebriefConfig } from "@/lib/missions";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MissionDebrief } from "../MissionDebrief";

const mockDebriefConfig: DebriefConfig = {
  summary:
    "In this mission, you learned how to build a real-time streaming pipeline using Structured Streaming and Delta Lake. You processed high-velocity transaction data, applied windowed aggregations, and wrote results to a Delta table with exactly-once semantics.",
  industryContext:
    "Real-time fraud detection systems in fintech companies process millions of transactions per second. Databricks Structured Streaming powers these critical systems at companies like Robinhood, Stripe, and PayPal, enabling sub-second detection of fraudulent patterns.",
  alternativeApproach:
    "While we used Delta Lake for storage, you could also use Apache Kafka for the output sink in a pure streaming architecture. However, Delta Lake provides ACID transactions and time travel, making it easier to debug and audit fraud detection rules.",
  furtherReading: [
    {
      title: "Structured Streaming Programming Guide",
      url: "https://spark.apache.org/docs/latest/structured-streaming-programming-guide.html",
    },
    {
      title: "Delta Lake on Databricks Documentation",
      url: "https://docs.databricks.com/delta/index.html",
    },
    {
      title: "Building Fraud Detection with Databricks",
      url: "https://www.databricks.com/blog/2021/06/09/building-fraud-detection.html",
    },
  ],
};

describe("MissionDebrief", () => {
  describe("Basic Rendering", () => {
    it("renders summary section", () => {
      render(<MissionDebrief config={mockDebriefConfig} />);
      expect(
        screen.getByText(/In this mission, you learned/i)
      ).toBeInTheDocument();
    });

    it("renders industry context section", () => {
      render(<MissionDebrief config={mockDebriefConfig} />);
      expect(screen.getByText(/Industry Context/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Real-time fraud detection systems/i)
      ).toBeInTheDocument();
    });

    it("renders alternative approach section", () => {
      render(<MissionDebrief config={mockDebriefConfig} />);
      expect(screen.getByText(/Alternative Approach/i)).toBeInTheDocument();
      expect(
        screen.getByText(/While we used Delta Lake for storage/i)
      ).toBeInTheDocument();
    });

    it("renders further reading section", () => {
      render(<MissionDebrief config={mockDebriefConfig} />);
      expect(screen.getByText(/Further Reading/i)).toBeInTheDocument();
    });

    it("renders all further reading links", () => {
      render(<MissionDebrief config={mockDebriefConfig} />);
      expect(
        screen.getByText("Structured Streaming Programming Guide")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Delta Lake on Databricks Documentation")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Building Fraud Detection with Databricks")
      ).toBeInTheDocument();
    });
  });

  describe("Links", () => {
    it("renders further reading links with correct href", () => {
      render(<MissionDebrief config={mockDebriefConfig} />);
      const link = screen.getByText(
        "Structured Streaming Programming Guide"
      );
      expect(link.closest("a")).toHaveAttribute(
        "href",
        "https://spark.apache.org/docs/latest/structured-streaming-programming-guide.html"
      );
    });

    it("opens links in new tab", () => {
      render(<MissionDebrief config={mockDebriefConfig} />);
      const link = screen.getByText(
        "Structured Streaming Programming Guide"
      ).closest("a");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("Call to Action", () => {
    it("renders next mission button when nextMissionId is provided", () => {
      render(
        <MissionDebrief
          config={mockDebriefConfig}
          nextMissionId="mission-002"
        />
      );
      expect(
        screen.getByRole("button", { name: /next mission/i })
      ).toBeInTheDocument();
    });

    it("renders return to missions button when nextMissionId is not provided", () => {
      render(<MissionDebrief config={mockDebriefConfig} />);
      expect(
        screen.getByRole("button", { name: /return to missions/i })
      ).toBeInTheDocument();
    });

    it("calls onComplete when next mission button is clicked", async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      render(
        <MissionDebrief
          config={mockDebriefConfig}
          nextMissionId="mission-002"
          onComplete={onComplete}
        />
      );

      await user.click(screen.getByRole("button", { name: /next mission/i }));

      expect(onComplete).toHaveBeenCalledWith({
        nextMissionId: "mission-002",
      });
    });

    it("calls onComplete when return to missions button is clicked", async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      render(
        <MissionDebrief config={mockDebriefConfig} onComplete={onComplete} />
      );

      await user.click(
        screen.getByRole("button", { name: /return to missions/i })
      );

      expect(onComplete).toHaveBeenCalledWith({
        nextMissionId: null,
      });
    });
  });

  describe("Completion Stats", () => {
    it("renders completion stats when provided", () => {
      render(
        <MissionDebrief
          config={mockDebriefConfig}
          completionStats={{
            totalStages: 6,
            timeSpent: 1850, // seconds
            xpEarned: 250,
          }}
        />
      );

      expect(screen.getByText("6")).toBeInTheDocument();
      expect(screen.getByText(/stages completed/i)).toBeInTheDocument();
      expect(screen.getByText("250 XP")).toBeInTheDocument();
      expect(screen.getByText(/xp earned/i)).toBeInTheDocument();
    });

    it("formats time correctly (minutes)", () => {
      render(
        <MissionDebrief
          config={mockDebriefConfig}
          completionStats={{
            totalStages: 6,
            timeSpent: 1850, // 30 min 50 sec
            xpEarned: 250,
          }}
        />
      );

      expect(screen.getByText(/31 min/i)).toBeInTheDocument();
    });

    it("does not render completion stats when not provided", () => {
      render(<MissionDebrief config={mockDebriefConfig} />);
      expect(screen.queryByText(/XP/i)).not.toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies cyberpunk theme classes", () => {
      const { container } = render(
        <MissionDebrief config={mockDebriefConfig} />
      );
      const debriefWrapper = container.querySelector(".cut-corner");
      expect(debriefWrapper).toBeInTheDocument();
    });

    it("applies section styling to each section", () => {
      const { container } = render(
        <MissionDebrief config={mockDebriefConfig} />
      );
      const sections = container.querySelectorAll(".border-anime-700");
      expect(sections.length).toBeGreaterThan(2);
    });
  });

  describe("Accessibility", () => {
    it("labels sections with headings", () => {
      render(<MissionDebrief config={mockDebriefConfig} />);
      expect(screen.getByText(/Industry Context/i)).toBeInTheDocument();
      expect(screen.getByText(/Alternative Approach/i)).toBeInTheDocument();
      expect(screen.getByText(/Further Reading/i)).toBeInTheDocument();
    });

    it("provides accessible button labels", () => {
      render(<MissionDebrief config={mockDebriefConfig} />);
      expect(
        screen.getByRole("button", { name: /return to missions/i })
      ).toBeInTheDocument();
    });

    it("provides accessible link labels", () => {
      render(<MissionDebrief config={mockDebriefConfig} />);
      const link = screen.getByText(
        "Structured Streaming Programming Guide"
      );
      expect(link).toBeInTheDocument();
    });
  });
});
