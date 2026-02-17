import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionForm } from "../ConnectionForm";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ConnectionForm", () => {
  const mockOnConnect = vi.fn();
  const defaultProps = {
    userId: "user-123",
    onConnect: mockOnConnect,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders workspace URL and PAT input fields", () => {
    render(<ConnectionForm {...defaultProps} />);

    expect(screen.getByLabelText(/workspace url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/personal access token/i)).toBeInTheDocument();
  });

  it("renders a connect button", () => {
    render(<ConnectionForm {...defaultProps} />);

    expect(screen.getByRole("button", { name: /connect/i })).toBeInTheDocument();
  });

  it("shows validation error for invalid workspace URL", async () => {
    const user = userEvent.setup();
    render(<ConnectionForm {...defaultProps} />);

    const urlInput = screen.getByLabelText(/workspace url/i);
    const patInput = screen.getByLabelText(/personal access token/i);
    const submitButton = screen.getByRole("button", { name: /connect/i });

    await user.type(urlInput, "not-a-valid-url");
    await user.type(patInput, "dapi_test_token");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid.*url/i)).toBeInTheDocument();
    });
  });

  it("shows validation error for empty PAT", async () => {
    const user = userEvent.setup();
    render(<ConnectionForm {...defaultProps} />);

    const urlInput = screen.getByLabelText(/workspace url/i);
    const submitButton = screen.getByRole("button", { name: /connect/i });

    await user.type(urlInput, "https://dbc-abc123.cloud.databricks.com");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/token.*required/i)).toBeInTheDocument();
    });
  });

  it("calls API with workspace URL and PAT on submit", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, workspaceUrl: "https://dbc-abc123.cloud.databricks.com" }),
    });

    const user = userEvent.setup();
    render(<ConnectionForm {...defaultProps} />);

    const urlInput = screen.getByLabelText(/workspace url/i);
    const patInput = screen.getByLabelText(/personal access token/i);
    const submitButton = screen.getByRole("button", { name: /connect/i });

    await user.type(urlInput, "https://dbc-abc123.cloud.databricks.com");
    await user.type(patInput, "dapi_test_token_123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/databricks/connect",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("dbc-abc123.cloud.databricks.com"),
        })
      );
    });
  });

  it("shows loading state while connecting", async () => {
    // Mock a slow response
    mockFetch.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100))
    );

    const user = userEvent.setup();
    render(<ConnectionForm {...defaultProps} />);

    const urlInput = screen.getByLabelText(/workspace url/i);
    const patInput = screen.getByLabelText(/personal access token/i);
    const submitButton = screen.getByRole("button", { name: /connect/i });

    await user.type(urlInput, "https://dbc-abc123.cloud.databricks.com");
    await user.type(patInput, "dapi_test_token_123");
    await user.click(submitButton);

    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });

  it("calls onConnect callback on successful connection", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, workspaceUrl: "https://dbc-abc123.cloud.databricks.com" }),
    });

    const user = userEvent.setup();
    render(<ConnectionForm {...defaultProps} />);

    const urlInput = screen.getByLabelText(/workspace url/i);
    const patInput = screen.getByLabelText(/personal access token/i);
    const submitButton = screen.getByRole("button", { name: /connect/i });

    await user.type(urlInput, "https://dbc-abc123.cloud.databricks.com");
    await user.type(patInput, "dapi_test_token_123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnConnect).toHaveBeenCalledWith("https://dbc-abc123.cloud.databricks.com");
    });
  });

  it("shows error message on API failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid credentials" }),
    });

    const user = userEvent.setup();
    render(<ConnectionForm {...defaultProps} />);

    const urlInput = screen.getByLabelText(/workspace url/i);
    const patInput = screen.getByLabelText(/personal access token/i);
    const submitButton = screen.getByRole("button", { name: /connect/i });

    await user.type(urlInput, "https://dbc-abc123.cloud.databricks.com");
    await user.type(patInput, "dapi_invalid_token");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it("masks the PAT input field", () => {
    render(<ConnectionForm {...defaultProps} />);

    const patInput = screen.getByLabelText(/personal access token/i);
    expect(patInput).toHaveAttribute("type", "password");
  });

  it("has placeholder text for workspace URL input", () => {
    render(<ConnectionForm {...defaultProps} />);

    const urlInput = screen.getByLabelText(/workspace url/i);
    expect(urlInput).toHaveAttribute("placeholder", expect.stringContaining("databricks.com"));
  });

  it("renders warehouse ID and catalog name fields", () => {
    render(<ConnectionForm {...defaultProps} />);

    expect(screen.getByLabelText(/warehouse id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/catalog name/i)).toBeInTheDocument();
  });

  it("has default value for catalog name", () => {
    render(<ConnectionForm {...defaultProps} />);

    const catalogInput = screen.getByLabelText(/catalog name/i);
    expect(catalogInput).toHaveValue("dev");
  });

  it("shows validation error for invalid warehouse ID format", async () => {
    const user = userEvent.setup();
    render(<ConnectionForm {...defaultProps} />);

    const urlInput = screen.getByLabelText(/workspace url/i);
    const patInput = screen.getByLabelText(/personal access token/i);
    const warehouseInput = screen.getByLabelText(/warehouse id/i);
    const submitButton = screen.getByRole("button", { name: /connect/i });

    await user.type(urlInput, "https://dbc-abc123.cloud.databricks.com");
    await user.type(patInput, "dapi_test_token");
    await user.type(warehouseInput, "invalid-format");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid warehouse id/i)).toBeInTheDocument();
    });
  });

  it("includes warehouse ID and catalog name in API request", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        success: true, 
        workspaceUrl: "https://dbc-abc123.cloud.databricks.com",
        warehouseId: "b4d816135a346c2e",
        catalogName: "dev"
      }),
    });

    const user = userEvent.setup();
    render(<ConnectionForm {...defaultProps} />);

    const urlInput = screen.getByLabelText(/workspace url/i);
    const patInput = screen.getByLabelText(/personal access token/i);
    const warehouseInput = screen.getByLabelText(/warehouse id/i);
    const submitButton = screen.getByRole("button", { name: /connect/i });

    await user.type(urlInput, "https://dbc-abc123.cloud.databricks.com");
    await user.type(patInput, "dapi_test_token_123");
    await user.type(warehouseInput, "b4d816135a346c2e");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/databricks/connect",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("b4d816135a346c2e"),
        })
      );
    });
  });
});
