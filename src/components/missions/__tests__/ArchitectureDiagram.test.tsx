import type { DiagramConfig } from "@/lib/missions/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ArchitectureDiagram } from "../ArchitectureDiagram";

describe("ArchitectureDiagram", () => {
  const mockConfig: DiagramConfig = {
    components: [
      { id: "bronze", icon: "database", label: "Bronze Layer" },
      { id: "silver", icon: "database", label: "Silver Layer" },
      { id: "gold", icon: "database", label: "Gold Layer" },
    ],
    dropZones: [
      { id: "zone1", label: "Raw Data", position: { x: 100, y: 200 } },
      { id: "zone2", label: "Cleansed Data", position: { x: 250, y: 200 } },
      { id: "zone3", label: "Business Data", position: { x: 400, y: 200 } },
    ],
    correctPlacements: [
      { componentId: "bronze", zoneId: "zone1" },
      { componentId: "silver", zoneId: "zone2" },
      { componentId: "gold", zoneId: "zone3" },
    ],
  };

  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders diagram components with icons and labels", () => {
    render(<ArchitectureDiagram config={mockConfig} onComplete={mockOnComplete} />);

    expect(screen.getByText("Bronze Layer")).toBeInTheDocument();
    expect(screen.getByText("Silver Layer")).toBeInTheDocument();
    expect(screen.getByText("Gold Layer")).toBeInTheDocument();
  });

  it("renders drop zones with labels", () => {
    render(<ArchitectureDiagram config={mockConfig} onComplete={mockOnComplete} />);

    expect(screen.getByText("Raw Data")).toBeInTheDocument();
    expect(screen.getByText("Cleansed Data")).toBeInTheDocument();
    expect(screen.getByText("Business Data")).toBeInTheDocument();
  });

  it("renders draggable components", () => {
    render(<ArchitectureDiagram config={mockConfig} onComplete={mockOnComplete} />);

    // Components should be draggable (have draggable attribute)
    const bronzeComponent = screen.getByText("Bronze Layer").closest("[draggable]");
    expect(bronzeComponent).toBeInTheDocument();
  });

  it("shows error feedback for incorrect placement", async () => {
    const user = userEvent.setup();
    render(<ArchitectureDiagram config={mockConfig} onComplete={mockOnComplete} />);

    // Click check with no placements
    const checkButton = screen.getByRole("button", { name: /check/i });
    await user.click(checkButton);

    // Should show error state
    expect(screen.getByText(/incorrect|try again|place all/i)).toBeInTheDocument();
  });

  it("shows success feedback with neon glow for correct placement", async () => {
    const user = userEvent.setup();
    render(
      <ArchitectureDiagram 
        config={mockConfig} 
        onComplete={mockOnComplete}
        initialPlacements={{
          zone1: "bronze",
          zone2: "silver",
          zone3: "gold",
        }}
      />
    );

    const checkButton = screen.getByRole("button", { name: /check/i });
    await user.click(checkButton);

    // Should show success
    expect(screen.getByText(/correct|success|complete/i)).toBeInTheDocument();
  });

  it("calls onComplete when all placements are correct", async () => {
    const user = userEvent.setup();
    render(
      <ArchitectureDiagram 
        config={mockConfig} 
        onComplete={mockOnComplete}
        initialPlacements={{
          zone1: "bronze",
          zone2: "silver",
          zone3: "gold",
        }}
      />
    );

    const checkButton = screen.getByRole("button", { name: /check/i });
    await user.click(checkButton);

    // Should show success message first
    expect(screen.getByText(/correct|success|complete/i)).toBeInTheDocument();

    // Need to click Continue to trigger onComplete
    const continueButton = screen.getByRole("button", { name: /continue/i });
    await user.click(continueButton);

    expect(mockOnComplete).toHaveBeenCalled();
  });

  it("applies cyberpunk styling", () => {
    render(<ArchitectureDiagram config={mockConfig} onComplete={mockOnComplete} />);

    const container = screen.getByTestId("architecture-diagram");
    expect(container.className).toMatch(/bg-anime|border-anime/);
  });

  it("does not call onComplete when placements are wrong", async () => {
    const user = userEvent.setup();
    render(
      <ArchitectureDiagram 
        config={mockConfig} 
        onComplete={mockOnComplete}
        initialPlacements={{
          zone1: "silver", // wrong
          zone2: "bronze", // wrong
          zone3: "gold",
        }}
      />
    );

    const checkButton = screen.getByRole("button", { name: /check/i });
    await user.click(checkButton);

    expect(mockOnComplete).not.toHaveBeenCalled();
  });
});
