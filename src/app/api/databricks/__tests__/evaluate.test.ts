import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the auth module
vi.mock("@/lib/auth/api-auth", () => ({
  authenticateApiRequest: vi.fn(),
}));

// Mock the databricks modules
vi.mock("@/lib/databricks", () => ({
  evaluateMission: vi.fn(),
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

// Mock mission/stage config loading
vi.mock("@/lib/missions", () => ({
  getMission: vi.fn(() => ({
    id: "lakehouse-fundamentals",
    stages: [{ id: "04-fill-blank" }],
  })),
  getStageConfig: vi.fn(() => ({
    evaluationQueries: [
      { query: "SELECT COUNT(*) FROM events", expectedResult: "5", tolerance: 0 },
    ],
  })),
}));

/**
 * Helper to mock an authenticated session
 */
async function mockAuthenticated(userId = "user-123"): Promise<void> {
  const { authenticateApiRequest } = await import("@/lib/auth/api-auth");
  vi.mocked(authenticateApiRequest).mockResolvedValue({ authenticated: true, userId });
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

describe("POST /api/databricks/evaluate", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await mockAuthenticated();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 for missing missionSlug", async () => {
    await setupDbMockWithNoConnection();
    const { POST } = await import("../evaluate/route");
    const request = new NextRequest("http://localhost/api/databricks/evaluate", {
      method: "POST",
      body: JSON.stringify({ stageId: "04-fill-blank" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("missionSlug");
  });

  it("returns 400 for missing stageId", async () => {
    await setupDbMockWithNoConnection();
    const { POST } = await import("../evaluate/route");
    const request = new NextRequest("http://localhost/api/databricks/evaluate", {
      method: "POST",
      body: JSON.stringify({ missionSlug: "lakehouse-fundamentals" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("stageId");
  });

  it("returns 404 when user has no workspace connection", async () => {
    await setupDbMockWithNoConnection();

    const { POST } = await import("../evaluate/route");
    const request = new NextRequest("http://localhost/api/databricks/evaluate", {
      method: "POST",
      body: JSON.stringify({
        missionSlug: "lakehouse-fundamentals",
        stageId: "04-fill-blank",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain("connection");
  });

  it("calls evaluateMission with queries from stage config", async () => {
    await setupDbMockWithConnection();
    const { evaluateMission, decryptPat } = await import("@/lib/databricks");
    const mockedEvaluate = vi.mocked(evaluateMission);
    const mockedDecrypt = vi.mocked(decryptPat);

    mockedDecrypt.mockReturnValue("decrypted_pat");
    mockedEvaluate.mockResolvedValue([
      { queryIndex: 0, description: "Count events", passed: true, expected: "5", actual: "5" },
    ]);

    const { POST } = await import("../evaluate/route");
    const request = new NextRequest("http://localhost/api/databricks/evaluate", {
      method: "POST",
      body: JSON.stringify({
        missionSlug: "lakehouse-fundamentals",
        stageId: "04-fill-blank",
      }),
    });

    await POST(request);

    expect(mockedEvaluate).toHaveBeenCalledWith(
      "https://dbc-abc.cloud.databricks.com",
      "decrypted_pat",
      [{ query: "SELECT COUNT(*) FROM events", expectedResult: "5", tolerance: 0 }],
      undefined
    );
  });

  it("returns 200 with evaluation results", async () => {
    await setupDbMockWithConnection();
    const { evaluateMission, decryptPat } = await import("@/lib/databricks");
    const mockedEvaluate = vi.mocked(evaluateMission);
    const mockedDecrypt = vi.mocked(decryptPat);

    mockedDecrypt.mockReturnValue("decrypted_pat");
    mockedEvaluate.mockResolvedValue([
      { queryIndex: 0, description: "Count events", passed: true, expected: "5", actual: "5" },
    ]);

    const { POST } = await import("../evaluate/route");
    const request = new NextRequest("http://localhost/api/databricks/evaluate", {
      method: "POST",
      body: JSON.stringify({
        missionSlug: "lakehouse-fundamentals",
        stageId: "04-fill-blank",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].passed).toBe(true);
    expect(data.allPassed).toBe(true);
  });

  it("returns allPassed false when any query fails", async () => {
    await setupDbMockWithConnection();
    const { evaluateMission, decryptPat } = await import("@/lib/databricks");
    const mockedEvaluate = vi.mocked(evaluateMission);
    const mockedDecrypt = vi.mocked(decryptPat);

    mockedDecrypt.mockReturnValue("decrypted_pat");
    mockedEvaluate.mockResolvedValue([
      { queryIndex: 0, description: "Count events", passed: false, expected: "5", actual: "3" },
    ]);

    const { POST } = await import("../evaluate/route");
    const request = new NextRequest("http://localhost/api/databricks/evaluate", {
      method: "POST",
      body: JSON.stringify({
        missionSlug: "lakehouse-fundamentals",
        stageId: "04-fill-blank",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.allPassed).toBe(false);
  });
});
