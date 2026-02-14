import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionStatus } from "../ConnectionStatus";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ConnectionStatus", () => {
  const defaultProps = {
    userId: "user-123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockFetch.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100))
    );

    render(<ConnectionStatus {...defaultProps} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows disconnected state when no connection exists", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ connected: false }),
    });

    render(<ConnectionStatus {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/not connected/i)).toBeInTheDocument();
    });
  });

  it("shows connected state with workspace URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        connected: true,
        workspaceUrl: "https://dbc-abc123.cloud.databricks.com",
      }),
    });

    render(<ConnectionStatus {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/connected/i)).toBeInTheDocument();
      expect(screen.getByText(/dbc-abc123/i)).toBeInTheDocument();
    });
  });

  it("displays bundle status when missionSlug is provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        connected: true,
        workspaceUrl: "https://dbc-abc123.cloud.databricks.com",
        bundleStatus: { status: "deployed", deployedAt: "2024-01-15T10:30:00Z" },
      }),
    });

    render(<ConnectionStatus {...defaultProps} missionSlug="lakehouse-fundamentals" />);

    await waitFor(() => {
      expect(screen.getByText(/deployed/i)).toBeInTheDocument();
    });
  });

  it("shows not-deployed bundle status", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        connected: true,
        workspaceUrl: "https://dbc-abc123.cloud.databricks.com",
        bundleStatus: { status: "not-deployed" },
      }),
    });

    render(<ConnectionStatus {...defaultProps} missionSlug="lakehouse-fundamentals" />);

    await waitFor(() => {
      expect(screen.getByText(/not deployed/i)).toBeInTheDocument();
    });
  });

  it("shows connection health indicator when validate is true", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        connected: true,
        workspaceUrl: "https://dbc-abc123.cloud.databricks.com",
        connectionHealthy: true,
      }),
    });

    render(<ConnectionStatus {...defaultProps} validate />);

    await waitFor(() => {
      expect(screen.getByText(/healthy/i)).toBeInTheDocument();
    });
  });

  it("shows unhealthy connection state", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        connected: true,
        workspaceUrl: "https://dbc-abc123.cloud.databricks.com",
        connectionHealthy: false,
        healthError: "Token expired",
      }),
    });

    render(<ConnectionStatus {...defaultProps} validate />);

    await waitFor(() => {
      expect(screen.getByText(/unhealthy/i)).toBeInTheDocument();
      expect(screen.getByText(/token expired/i)).toBeInTheDocument();
    });
  });

  it("provides disconnect button when connected", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        connected: true,
        workspaceUrl: "https://dbc-abc123.cloud.databricks.com",
      }),
    });

    render(<ConnectionStatus {...defaultProps} onDisconnect={() => {}} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
    });
  });

  it("calls onDisconnect callback when disconnect button is clicked", async () => {
    const mockOnDisconnect = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        connected: true,
        workspaceUrl: "https://dbc-abc123.cloud.databricks.com",
      }),
    });

    const user = userEvent.setup();
    render(<ConnectionStatus {...defaultProps} onDisconnect={mockOnDisconnect} />);

    await waitFor(async () => {
      const disconnectButton = screen.getByRole("button", { name: /disconnect/i });
      await user.click(disconnectButton);
    });

    expect(mockOnDisconnect).toHaveBeenCalled();
  });

  it("fetches status on mount with correct URL params", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ connected: false }),
    });

    render(<ConnectionStatus {...defaultProps} missionSlug="test-mission" validate />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/databricks/status?userId=user-123&missionSlug=test-mission&validate=true")
      );
    });
  });

  it("handles API error gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<ConnectionStatus {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
