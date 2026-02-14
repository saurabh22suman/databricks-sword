import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ModeToggle } from "../ModeToggle";

describe("ModeToggle", () => {
  const mockOnModeChange = vi.fn();

  const defaultProps = {
    databricksEnabled: true,
    mode: "simulated" as const,
    onModeChange: mockOnModeChange,
    databricksConnected: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Simulated and Real Databricks toggle buttons", () => {
    render(<ModeToggle {...defaultProps} />);

    expect(screen.getByRole("button", { name: /simulated/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /real databricks/i })).toBeInTheDocument();
  });

  it("highlights the current mode", () => {
    render(<ModeToggle {...defaultProps} mode="simulated" />);

    const simulatedButton = screen.getByRole("button", { name: /simulated/i });
    // Active state should have neon cyan styling
    expect(simulatedButton.className).toMatch(/bg-anime-cyan|border-anime-cyan/i);
  });

  it("disables Real Databricks when databricksEnabled is false", () => {
    render(<ModeToggle {...defaultProps} databricksEnabled={false} />);

    const realButton = screen.getByRole("button", { name: /real databricks/i });
    expect(realButton).toBeDisabled();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it("disables Real Databricks when no workspace is connected", () => {
    render(<ModeToggle {...defaultProps} databricksConnected={false} />);

    const realButton = screen.getByRole("button", { name: /real databricks/i });
    expect(realButton).toBeDisabled();
    expect(screen.getByText(/connect workspace/i)).toBeInTheDocument();
  });

  it("enables Real Databricks when workspace is connected and databricksEnabled is true", () => {
    render(<ModeToggle {...defaultProps} databricksConnected={true} />);

    const realButton = screen.getByRole("button", { name: /real databricks/i });
    expect(realButton).not.toBeDisabled();
  });

  it("calls onModeChange when Simulated is clicked", async () => {
    const user = userEvent.setup();
    render(<ModeToggle {...defaultProps} mode="databricks" databricksConnected={true} />);

    await user.click(screen.getByRole("button", { name: /simulated/i }));

    expect(mockOnModeChange).toHaveBeenCalledWith("simulated");
  });

  it("calls onModeChange when Real Databricks is clicked", async () => {
    const user = userEvent.setup();
    render(<ModeToggle {...defaultProps} databricksConnected={true} />);

    await user.click(screen.getByRole("button", { name: /real databricks/i }));

    expect(mockOnModeChange).toHaveBeenCalledWith("databricks");
  });

  it("shows connect workspace link when workspace is not connected", () => {
    render(<ModeToggle {...defaultProps} databricksConnected={false} />);

    const connectLink = screen.getByRole("link", { name: /connect/i });
    expect(connectLink).toHaveAttribute("href", "/profile#databricks");
  });

  it("applies cyberpunk styling with neon effects", () => {
    render(<ModeToggle {...defaultProps} />);

    const container = screen.getByRole("group", { name: /execution mode/i });
    // Should have dark background and border styling
    expect(container.className).toMatch(/bg-anime|border-anime/i);
  });
});
