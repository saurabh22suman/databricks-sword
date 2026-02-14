import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the auth module
vi.mock("@/lib/auth/api-auth", () => ({
  authenticateApiRequest: vi.fn(),
}));

// Mock the databricks modules
vi.mock("@/lib/databricks", () => ({
  destroyBundle: vi.fn(),
  decryptPat: vi.fn(),
}));

// Mock the db module
const mockDb = {
  select: vi.fn(),
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

/**
 * Helper to setup db mock with a connection
 */
function setupDbMockWithConnection(): void {
  mockDb.select.mockReturnValue({
    from: vi.fn(() => ({
      where: vi.fn(() =>
        Promise.resolve([
          {
            userId: "user-123",
            workspaceUrl: "https://dbc-abc.cloud.databricks.com",
            encryptedPat: "encrypted_pat",
          },
        ])
      ),
    })),
  } as never);
}

/**
 * Helper to setup db mock with no connection
 */
function setupDbMockWithNoConnection(): void {
  mockDb.select.mockReturnValue({
    from: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve([])),
    })),
  } as never);
}

describe("POST /api/databricks/destroy", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await mockAuthenticated();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 for missing missionSlug", async () => {
    await setupDbMockWithNoConnection();
    const { POST } = await import("../destroy/route");
    const request = new NextRequest("http://localhost/api/databricks/destroy", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("missionSlug");
  });

  it("returns 404 when user has no workspace connection", async () => {
    await setupDbMockWithNoConnection();

    const { POST } = await import("../destroy/route");
    const request = new NextRequest("http://localhost/api/databricks/destroy", {
      method: "POST",
      body: JSON.stringify({ missionSlug: "lakehouse-fundamentals" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain("connection");
  });

  it("calls destroyBundle with correct arguments", async () => {
    await setupDbMockWithConnection();
    const { destroyBundle, decryptPat } = await import("@/lib/databricks");
    const mockedDestroy = vi.mocked(destroyBundle);
    const mockedDecrypt = vi.mocked(decryptPat);

    mockedDecrypt.mockReturnValue("decrypted_token");
    mockedDestroy.mockResolvedValue({ status: "not-deployed" });

    const { POST } = await import("../destroy/route");
    const request = new NextRequest("http://localhost/api/databricks/destroy", {
      method: "POST",
      body: JSON.stringify({ missionSlug: "lakehouse-fundamentals" }),
    });

    await POST(request);

    expect(mockedDestroy).toHaveBeenCalledWith(
      "user-123",
      "lakehouse-fundamentals",
      "https://dbc-abc.cloud.databricks.com",
      "decrypted_token"
    );
  });

  it("returns 200 with status on success", async () => {
    await setupDbMockWithConnection();
    const { destroyBundle, decryptPat } = await import("@/lib/databricks");
    const mockedDestroy = vi.mocked(destroyBundle);
    const mockedDecrypt = vi.mocked(decryptPat);

    mockedDecrypt.mockReturnValue("decrypted_pat");
    mockedDestroy.mockResolvedValue({ status: "not-deployed" });

    const { POST } = await import("../destroy/route");
    const request = new NextRequest("http://localhost/api/databricks/destroy", {
      method: "POST",
      body: JSON.stringify({ missionSlug: "lakehouse-fundamentals" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("not-deployed");
    expect(data.success).toBe(true);
  });

  it("returns 500 when destroy fails", async () => {
    await setupDbMockWithConnection();
    const { destroyBundle, decryptPat } = await import("@/lib/databricks");
    const mockedDestroy = vi.mocked(destroyBundle);
    const mockedDecrypt = vi.mocked(decryptPat);

    mockedDecrypt.mockReturnValue("decrypted_pat");
    mockedDestroy.mockResolvedValue({
      status: "error",
      error: "Failed to destroy bundle",
    });

    const { POST } = await import("../destroy/route");
    const request = new NextRequest("http://localhost/api/databricks/destroy", {
      method: "POST",
      body: JSON.stringify({ missionSlug: "lakehouse-fundamentals" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("destroy");
  });
});
