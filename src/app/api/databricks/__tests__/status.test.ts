import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the auth module
vi.mock("@/lib/auth/api-auth", () => ({
  authenticateApiRequest: vi.fn(),
}));

// Mock the databricks modules
vi.mock("@/lib/databricks", () => ({
  validateConnection: vi.fn(),
  getBundleStatus: vi.fn(),
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
            lastValidatedAt: new Date(),
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

describe("GET /api/databricks/status", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await mockAuthenticated();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    await mockUnauthenticated();
    const { GET } = await import("../status/route");
    const request = new NextRequest("http://localhost/api/databricks/status");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns disconnected status when no connection exists", async () => {
    await setupDbMockWithNoConnection();

    const { GET } = await import("../status/route");
    const request = new NextRequest("http://localhost/api/databricks/status");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.connected).toBe(false);
  });

  it("returns connected status with workspace info", async () => {
    await setupDbMockWithConnection();
    const { GET } = await import("../status/route");
    const request = new NextRequest("http://localhost/api/databricks/status");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.connected).toBe(true);
    expect(data.workspaceUrl).toBe("https://dbc-abc.cloud.databricks.com");
  });

  it("returns bundle status for specified mission", async () => {
    await setupDbMockWithConnection();
    const { getBundleStatus } = await import("@/lib/databricks");
    const mockedGetStatus = vi.mocked(getBundleStatus);
    mockedGetStatus.mockReturnValue({ status: "deployed", deployedAt: "2024-01-15T10:30:00Z" });

    const { GET } = await import("../status/route");
    const request = new NextRequest(
      "http://localhost/api/databricks/status?missionSlug=lakehouse-fundamentals"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.bundleStatus).toEqual({ status: "deployed", deployedAt: "2024-01-15T10:30:00Z" });
  });

  it("validates connection health when requested", async () => {
    await setupDbMockWithConnection();
    const { validateConnection, decryptPat } = await import("@/lib/databricks");
    const mockedValidate = vi.mocked(validateConnection);
    const mockedDecrypt = vi.mocked(decryptPat);

    mockedDecrypt.mockReturnValue("decrypted_pat");
    mockedValidate.mockResolvedValue({ valid: true });

    const { GET } = await import("../status/route");
    const request = new NextRequest(
      "http://localhost/api/databricks/status?validate=true"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.connectionHealthy).toBe(true);
    expect(mockedValidate).toHaveBeenCalled();
  });

  it("returns connection unhealthy when validation fails", async () => {
    await setupDbMockWithConnection();
    const { validateConnection, decryptPat } = await import("@/lib/databricks");
    const mockedValidate = vi.mocked(validateConnection);
    const mockedDecrypt = vi.mocked(decryptPat);

    mockedDecrypt.mockReturnValue("decrypted_pat");
    mockedValidate.mockResolvedValue({ valid: false, error: "Token expired" });

    const { GET } = await import("../status/route");
    const request = new NextRequest(
      "http://localhost/api/databricks/status?validate=true"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.connectionHealthy).toBe(false);
    expect(data.healthError).toBe("Token expired");
  });
});
