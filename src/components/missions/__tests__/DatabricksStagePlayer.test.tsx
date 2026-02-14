import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabricksStagePlayer } from "../DatabricksStagePlayer";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("DatabricksStagePlayer", () => {
  const defaultProps = {
    missionSlug: "lakehouse-fundamentals",
    stageId: "03-code-challenge",
    stageConfig: {
      id: "03-code-challenge",
      title: "Write Your First Query",
      type: "code",
      instructions: "Create a Delta table from the events data",
      objectives: [
        "Read the sample events CSV",
        "Create a Delta table",
        "Query the table",
      ],
      evaluationQueries: [
        {
          description: "Delta table exists",
          sql: "DESCRIBE delta.`/tables/events`",
          expectedResult: { rowCount: 3 },
        },
      ],
    },
    bundleStatus: "not-deployed" as const,
    onComplete: vi.fn(),
    onXpAward: vi.fn(),
    onBundleStatusChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Step 1: Deploy", () => {
    it("renders Deploy Mission Assets button when not deployed", () => {
      render(<DatabricksStagePlayer {...defaultProps} />);

      expect(screen.getByRole("button", { name: /deploy mission assets/i })).toBeInTheDocument();
    });

    it("shows deployment instructions", () => {
      render(<DatabricksStagePlayer {...defaultProps} />);

      expect(screen.getByText(/deploy.*assets.*databricks/i)).toBeInTheDocument();
    });

    it("calls deploy API when Deploy button is clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "deployed", deployedAt: "2024-01-15T10:30:00Z" }),
      });

      const user = userEvent.setup();
      render(<DatabricksStagePlayer {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /deploy mission assets/i }));

      expect(mockFetch).toHaveBeenCalledWith("/api/databricks/deploy", expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("lakehouse-fundamentals"),
      }));
    });

    it("shows loading animation during deployment", async () => {
      mockFetch.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ status: "deployed" }),
        }), 100))
      );

      const user = userEvent.setup();
      render(<DatabricksStagePlayer {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /deploy mission assets/i }));

      // Check for overlay with multiple deploying texts
      expect(screen.getAllByText(/Deploying/).length).toBeGreaterThan(0);
    });

    it("shows deployment error message on failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Workspace authentication failed" }),
      });

      const user = userEvent.setup();
      render(<DatabricksStagePlayer {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /deploy/i }));

      await waitFor(() => {
        expect(screen.getByText(/workspace authentication failed/i)).toBeInTheDocument();
      });
    });
  });

  describe("Step 2: Work in Databricks", () => {
    const deployedProps = {
      ...defaultProps,
      bundleStatus: "deployed" as const,
      workspaceUrl: "https://dbc-abc123.cloud.databricks.com",
    };

    it("renders instructions panel when deployed", () => {
      render(<DatabricksStagePlayer {...deployedProps} />);

      expect(screen.getByText(/work in databricks/i)).toBeInTheDocument();
    });

    it("shows notebook path", () => {
      render(<DatabricksStagePlayer {...deployedProps} />);

      expect(screen.getByText(/\/dbsword\/lakehouse-fundamentals\/exercise/i)).toBeInTheDocument();
    });

    it("provides link to open workspace", () => {
      render(<DatabricksStagePlayer {...deployedProps} />);

      const workspaceLink = screen.getByRole("link", { name: /open.*databricks/i });
      expect(workspaceLink).toHaveAttribute("target", "_blank");
    });

    it("shows mission objectives checklist", () => {
      render(<DatabricksStagePlayer {...deployedProps} />);

      // Look for objectives section
      expect(screen.getByText(/Objectives:/i)).toBeInTheDocument();
      // Check that all objectives are present (may appear in multiple places)
      const objectives = screen.getAllByRole("listitem");
      expect(objectives.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Step 3: Evaluate", () => {
    const deployedProps = {
      ...defaultProps,
      bundleStatus: "deployed" as const,
    };

    it("renders Evaluate My Results button when deployed", () => {
      render(<DatabricksStagePlayer {...deployedProps} />);

      expect(screen.getByRole("button", { name: /evaluate.*results/i })).toBeInTheDocument();
    });

    it("calls evaluate API when Evaluate button is clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ queryIndex: 0, passed: true, description: "Delta table exists" }],
          allPassed: true,
        }),
      });

      const user = userEvent.setup();
      render(<DatabricksStagePlayer {...deployedProps} />);

      await user.click(screen.getByRole("button", { name: /evaluate.*results/i }));

      expect(mockFetch).toHaveBeenCalledWith("/api/databricks/evaluate", expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("lakehouse-fundamentals"),
      }));
    });

    it("shows pass/fail results for each query", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { queryIndex: 0, passed: true, description: "Delta table exists" },
            { queryIndex: 1, passed: false, description: "Row count matches", error: "Expected 100, got 50" },
          ],
          allPassed: false,
        }),
      });

      const user = userEvent.setup();
      render(<DatabricksStagePlayer {...deployedProps} />);

      await user.click(screen.getByRole("button", { name: /evaluate/i }));

      await waitFor(() => {
        expect(screen.getByText(/delta table exists/i)).toBeInTheDocument();
        expect(screen.getByText(/row count matches/i)).toBeInTheDocument();
      });
    });

    it("calls onComplete and onXpAward when all queries pass", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ queryIndex: 0, passed: true, description: "Delta table exists" }],
          allPassed: true,
          xpAwarded: 150,
        }),
      });

      const user = userEvent.setup();
      render(<DatabricksStagePlayer {...deployedProps} />);

      await user.click(screen.getByRole("button", { name: /evaluate/i }));

      await waitFor(() => {
        expect(defaultProps.onComplete).toHaveBeenCalled();
        expect(defaultProps.onXpAward).toHaveBeenCalledWith(150);
      });
    });
  });

  describe("Step 4: Cleanup", () => {
    const deployedProps = {
      ...defaultProps,
      bundleStatus: "deployed" as const,
    };

    it("renders Reset Workspace button when deployed", () => {
      render(<DatabricksStagePlayer {...deployedProps} />);

      expect(screen.getByRole("button", { name: /reset workspace/i })).toBeInTheDocument();
    });

    it("shows confirmation modal before destroying", async () => {
      const user = userEvent.setup();
      render(<DatabricksStagePlayer {...deployedProps} />);

      await user.click(screen.getByRole("button", { name: /reset workspace/i }));

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("calls destroy API after confirmation", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "not-deployed" }),
      });

      const user = userEvent.setup();
      render(<DatabricksStagePlayer {...deployedProps} />);

      await user.click(screen.getByRole("button", { name: /reset workspace/i }));
      await user.click(screen.getByRole("button", { name: /confirm/i }));

      expect(mockFetch).toHaveBeenCalledWith("/api/databricks/destroy", expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("lakehouse-fundamentals"),
      }));
    });

    it("does not call destroy API when cancelled", async () => {
      const user = userEvent.setup();
      render(<DatabricksStagePlayer {...deployedProps} />);

      await user.click(screen.getByRole("button", { name: /reset workspace/i }));
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("Cyberpunk styling", () => {
    it("applies glitch animation during loading states", async () => {
      mockFetch.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ status: "deployed" }),
        }), 100))
      );

      const user = userEvent.setup();
      render(<DatabricksStagePlayer {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /deploy/i }));

      const loadingOverlay = screen.getByTestId("deployment-overlay");
      expect(loadingOverlay.className).toMatch(/animate-glitch|glitch/i);
    });

    it("shows neon green for passed evaluations", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ queryIndex: 0, passed: true, description: "Test passed" }],
          allPassed: true,
        }),
      });

      const user = userEvent.setup();
      render(<DatabricksStagePlayer {...{ ...defaultProps, bundleStatus: "deployed" }} />);

      await user.click(screen.getByRole("button", { name: /evaluate/i }));

      await waitFor(() => {
        // Find the container div with the result styling - go up two levels from span
        const passedSpan = screen.getByText(/test passed/i);
        const passedContainer = passedSpan.closest("div")?.parentElement;
        expect(passedContainer?.className).toMatch(/text-anime-green|border-anime-green/i);
      });
    });
  });
});
