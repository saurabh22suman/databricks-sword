import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the auth module
vi.mock("@/lib/auth/api-auth", () => ({
  authenticateApiRequest: vi.fn(),
}));

// Mock the databricks modules
vi.mock("@/lib/databricks", () => ({
  validateConnection: vi.fn(),
  encryptPat: vi.fn(),
}));

// Mock the db module
const mockOnConflictDoUpdate = vi.fn(() => Promise.resolve());
const mockDb = {
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      onConflictDoUpdate: mockOnConflictDoUpdate,
    })),
  })),
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve([])),
    })),
  })),
};

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => mockDb),
  databricksConnections: {},
}));

/**
 * Helper to mock an authenticated session
 */
async function mockAuthenticated(userId = "user-123"): Promise<void> {
  const { authenticateApiRequest } = await import("@/lib/auth/api-auth");
  vi.mocked(authenticateApiRequest).mockResolvedValue({ authenticated: true, userId });
}

/**
 * Helper to mock an unauthenticated session
 */
async function mockUnauthenticated(): Promise<void> {
  const { authenticateApiRequest } = await import("@/lib/auth/api-auth");
  vi.mocked(authenticateApiRequest).mockResolvedValue({
    authenticated: false,
    error: "Unauthorized",
    status: 401,
  });
}

describe("POST /api/databricks/connect", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockOnConflictDoUpdate.mockResolvedValue(undefined);
    await mockAuthenticated();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 for missing workspaceUrl", async () => {
    const { POST } = await import("../connect/route");
    const request = new NextRequest("http://localhost/api/databricks/connect", {
      method: "POST",
      body: JSON.stringify({ pat: "dapi_test" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("workspaceUrl");
  });

  it("returns 400 for missing PAT", async () => {
    const { POST } = await import("../connect/route");
    const request = new NextRequest("http://localhost/api/databricks/connect", {
      method: "POST",
      body: JSON.stringify({ workspaceUrl: "https://dbc-abc.cloud.databricks.com" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("pat");
  });

  it("returns 400 for invalid workspaceUrl format", async () => {
    const { POST } = await import("../connect/route");
    const request = new NextRequest("http://localhost/api/databricks/connect", {
      method: "POST",
      body: JSON.stringify({
        workspaceUrl: "not-a-valid-url",
        pat: "dapi_test",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    await mockUnauthenticated();
    const { POST } = await import("../connect/route");
    const request = new NextRequest("http://localhost/api/databricks/connect", {
      method: "POST",
      body: JSON.stringify({
        workspaceUrl: "https://dbc-abc123.cloud.databricks.com",
        pat: "dapi_test_token",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 for non-https workspaceUrl", async () => {
    const { validateConnection } = await import("@/lib/databricks");
    const mockedValidate = vi.mocked(validateConnection);

    const { POST } = await import("../connect/route");
    const request = new NextRequest("http://localhost/api/databricks/connect", {
      method: "POST",
      body: JSON.stringify({
        workspaceUrl: "http://dbc-abc123.cloud.databricks.com",
        pat: "dapi_test_token",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Databricks workspace URL must use HTTPS");
    expect(mockedValidate).not.toHaveBeenCalled();
  });

  it("returns 400 for disallowed workspace hostname", async () => {
    const { validateConnection } = await import("@/lib/databricks");
    const mockedValidate = vi.mocked(validateConnection);

    const { POST } = await import("../connect/route");
    const request = new NextRequest("http://localhost/api/databricks/connect", {
      method: "POST",
      body: JSON.stringify({
        workspaceUrl: "https://evil.example.com",
        pat: "dapi_test_token",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid Databricks workspace URL hostname");
    expect(mockedValidate).not.toHaveBeenCalled();
  });

  it("validates connection before storing", async () => {
    const { validateConnection, encryptPat } = await import("@/lib/databricks");
    const mockedValidate = vi.mocked(validateConnection);
    const mockedEncrypt = vi.mocked(encryptPat);

    mockedValidate.mockResolvedValue({ valid: true });
    mockedEncrypt.mockReturnValue("encrypted_pat");

    const { POST } = await import("../connect/route");
    const request = new NextRequest("http://localhost/api/databricks/connect", {
      method: "POST",
      body: JSON.stringify({
        workspaceUrl: "https://dbc-abc123.cloud.databricks.com",
        pat: "dapi_test_token",
      }),
    });

    await POST(request);

    expect(mockedValidate).toHaveBeenCalledWith(
      "https://dbc-abc123.cloud.databricks.com",
      "dapi_test_token"
    );
  });

  it("returns 401 for invalid credentials", async () => {
    const { validateConnection } = await import("@/lib/databricks");
    const mockedValidate = vi.mocked(validateConnection);
    mockedValidate.mockResolvedValue({ valid: false, error: "Invalid token" });

    const { POST } = await import("../connect/route");
    const request = new NextRequest("http://localhost/api/databricks/connect", {
      method: "POST",
      body: JSON.stringify({
        workspaceUrl: "https://dbc-abc123.cloud.databricks.com",
        pat: "invalid_token",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid token");
  });

  it("encrypts PAT before storing", async () => {
    const { validateConnection, encryptPat } = await import("@/lib/databricks");
    const mockedValidate = vi.mocked(validateConnection);
    const mockedEncrypt = vi.mocked(encryptPat);

    mockedValidate.mockResolvedValue({ valid: true });
    mockedEncrypt.mockReturnValue("encrypted_pat_value");

    const { POST } = await import("../connect/route");
    const request = new NextRequest("http://localhost/api/databricks/connect", {
      method: "POST",
      body: JSON.stringify({
        workspaceUrl: "https://dbc-abc123.cloud.databricks.com",
        pat: "dapi_secret_token",
      }),
    });

    await POST(request);

    expect(mockedEncrypt).toHaveBeenCalledWith("dapi_secret_token");
  });

  it("returns 500 when persistence fails", async () => {
    const { validateConnection, encryptPat } = await import("@/lib/databricks");
    const mockedValidate = vi.mocked(validateConnection);
    const mockedEncrypt = vi.mocked(encryptPat);

    mockedValidate.mockResolvedValue({ valid: true });
    mockedEncrypt.mockReturnValue("encrypted_pat");
    mockOnConflictDoUpdate.mockRejectedValueOnce(new Error("DB unavailable"));

    const { POST } = await import("../connect/route");
    const request = new NextRequest("http://localhost/api/databricks/connect", {
      method: "POST",
      body: JSON.stringify({
        workspaceUrl: "https://dbc-abc123.cloud.databricks.com",
        pat: "dapi_valid_token",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to persist Databricks connection");
  });

  it("returns 200 on successful connection", async () => {
    const { validateConnection, encryptPat } = await import("@/lib/databricks");
    const mockedValidate = vi.mocked(validateConnection);
    const mockedEncrypt = vi.mocked(encryptPat);

    mockedValidate.mockResolvedValue({ valid: true });
    mockedEncrypt.mockReturnValue("encrypted_pat");

    const { POST } = await import("../connect/route");
    const request = new NextRequest("http://localhost/api/databricks/connect", {
      method: "POST",
      body: JSON.stringify({
        workspaceUrl: "https://dbc-abc123.cloud.databricks.com",
        pat: "dapi_valid_token",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.workspaceUrl).toBe("https://dbc-abc123.cloud.databricks.com");
  });
});
