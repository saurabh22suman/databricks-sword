import { beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "../route"

vi.mock("@/lib/auth/api-auth", () => ({
  authenticateApiRequest: vi.fn(),
}))

vi.mock("@/lib/databricks", () => ({
  decryptPat: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  databricksConnections: { userId: "userId" },
  fieldOpsDeployments: { userId: "userId" },
  getDb: vi.fn(),
}))

vi.mock("@/lib/field-ops/deployment", () => ({
  cleanupDeployment: vi.fn(),
  DeploymentConflictError: class DeploymentConflictError extends Error {},
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => "where-clause"),
}))

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/field-ops/cleanup", {
    method: "POST",
    headers: {
      "Idempotency-Key": "bulk-cleanup-key",
      "X-Request-Id": "bulk-req-1",
      "X-Correlation-Id": "bulk-corr-1",
      ...headers,
    },
  })
}

describe("Field Ops bulk cleanup route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns auth passthrough status when user is not authenticated", async () => {
    const { authenticateApiRequest } = await import("@/lib/auth/api-auth")

    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: false,
      error: "Unauthorized",
      status: 401,
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      success: false,
      error: "Unauthorized",
      errorCode: "UNAUTHORIZED",
    })
  })

  it("returns 400 when Databricks connection is missing", async () => {
    const { authenticateApiRequest } = await import("@/lib/auth/api-auth")
    const { getDb } = await import("@/lib/db")

    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: true,
      userId: "user-1",
    })

    const limit = vi.fn().mockResolvedValue([])
    const where = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ where })
    const select = vi.fn().mockReturnValue({ from })

    vi.mocked(getDb).mockReturnValue({ select } as never)

    const response = await POST(makeRequest())

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      success: false,
      error: "Databricks connection not configured",
      errorCode: "BAD_REQUEST",
    })
  })

  it("returns 200 when no deployments are eligible", async () => {
    const { authenticateApiRequest } = await import("@/lib/auth/api-auth")
    const { getDb } = await import("@/lib/db")

    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: true,
      userId: "user-1",
    })

    const connectionLimit = vi.fn().mockResolvedValue([
      {
        workspaceUrl: "https://example.databricks.com/",
        encryptedPat: "encrypted-pat",
        warehouseId: "wh-123",
      },
    ])

    const deploymentWhere = vi.fn().mockResolvedValue([
      {
        id: "dep-cleaned",
        industry: "retail",
        status: "cleaned_up",
        bundlePath: "/tmp/dep-cleaned",
      },
      {
        id: "dep-cleaning",
        industry: "gaming",
        status: "cleaning_up",
        bundlePath: "/tmp/dep-cleaning",
      },
      {
        id: "dep-no-bundle",
        industry: "healthcare",
        status: "deployed",
        bundlePath: null,
      },
    ])

    const from = vi
      .fn()
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          limit: connectionLimit,
        }),
      })
      .mockReturnValueOnce({
        where: deploymentWhere,
      })

    const select = vi.fn().mockReturnValue({ from })
    vi.mocked(getDb).mockReturnValue({ select } as never)

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      success: true,
      message: "No eligible deployments found for cleanup.",
      attempted: 0,
      cleaned: 0,
      failed: 0,
      failures: [],
      metadata: {
        requestId: "bulk-req-1",
        correlationId: "bulk-corr-1",
      },
    })
  })

  it("returns 200 when all eligible deployments clean successfully", async () => {
    const { authenticateApiRequest } = await import("@/lib/auth/api-auth")
    const { getDb } = await import("@/lib/db")
    const { decryptPat } = await import("@/lib/databricks")
    const { cleanupDeployment } = await import("@/lib/field-ops/deployment")

    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: true,
      userId: "user-1",
    })

    const connectionLimit = vi.fn().mockResolvedValue([
      {
        workspaceUrl: "https://example.databricks.com/",
        encryptedPat: "encrypted-pat",
        warehouseId: "wh-123",
      },
    ])

    const deploymentWhere = vi.fn().mockResolvedValue([
      {
        id: "dep-1",
        industry: "retail",
        status: "deployed",
        catalogName: "dev",
        bundlePath: "/tmp/dep-1",
      },
      {
        id: "dep-2",
        industry: "gaming",
        status: "completed",
        catalogName: "prod",
        bundlePath: "/tmp/dep-2",
      },
    ])

    const from = vi
      .fn()
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          limit: connectionLimit,
        }),
      })
      .mockReturnValueOnce({
        where: deploymentWhere,
      })

    const select = vi.fn().mockReturnValue({ from })
    vi.mocked(getDb).mockReturnValue({ select } as never)

    vi.mocked(decryptPat).mockReturnValue("token")
    vi.mocked(cleanupDeployment).mockResolvedValue({
      result: { success: true, failures: [] },
      operationId: "op-1",
      requestId: "bulk-req-1",
      correlationId: "bulk-corr-1",
      replayed: false,
    } as never)

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    expect(vi.mocked(cleanupDeployment)).toHaveBeenCalledTimes(2)
    expect(await response.json()).toEqual({
      success: true,
      message: "Cleaned up 2 deployments.",
      attempted: 2,
      cleaned: 2,
      failed: 0,
      failures: [],
      metadata: {
        requestId: "bulk-req-1",
        correlationId: "bulk-corr-1",
      },
    })
  })

  it("returns 409 with aggregated failures when cleanup is partial", async () => {
    const { authenticateApiRequest } = await import("@/lib/auth/api-auth")
    const { getDb } = await import("@/lib/db")
    const { decryptPat } = await import("@/lib/databricks")
    const { cleanupDeployment } = await import("@/lib/field-ops/deployment")

    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: true,
      userId: "user-1",
    })

    const connectionLimit = vi.fn().mockResolvedValue([
      {
        workspaceUrl: "https://example.databricks.com/",
        encryptedPat: "encrypted-pat",
        warehouseId: "wh-123",
      },
    ])

    const deploymentWhere = vi.fn().mockResolvedValue([
      {
        id: "dep-1",
        industry: "retail",
        status: "deployed",
        catalogName: "dev",
        bundlePath: "/tmp/dep-1",
      },
      {
        id: "dep-2",
        industry: "gaming",
        status: "deployed",
        catalogName: "dev",
        bundlePath: "/tmp/dep-2",
      },
    ])

    const from = vi
      .fn()
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          limit: connectionLimit,
        }),
      })
      .mockReturnValueOnce({
        where: deploymentWhere,
      })

    const select = vi.fn().mockReturnValue({ from })
    vi.mocked(getDb).mockReturnValue({ select } as never)

    vi.mocked(decryptPat).mockReturnValue("token")
    vi.mocked(cleanupDeployment)
      .mockResolvedValueOnce({
        result: { success: true, failures: [] },
        operationId: "op-1",
        requestId: "bulk-req-1",
        correlationId: "bulk-corr-1",
        replayed: false,
      } as never)
      .mockResolvedValueOnce({
        result: {
          success: false,
          failures: [
            {
              resourceType: "schema",
              resourceName: "dev.fo_gaming_user_bronze",
              errorMessage: "permission denied",
            },
          ],
        },
        operationId: "op-2",
        requestId: "bulk-req-1",
        correlationId: "bulk-corr-1",
        replayed: false,
      } as never)

    const response = await POST(makeRequest())

    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.error).toBe("Cleanup partially failed")
    expect(body.attempted).toBe(2)
    expect(body.cleaned).toBe(1)
    expect(body.failed).toBe(1)
    expect(body.failures).toHaveLength(1)
    expect(body.failures[0]).toMatchObject({
      deploymentId: "dep-2",
      industry: "gaming",
      error: "Cleanup partially failed",
    })
    expect(body.metadata).toEqual({
      requestId: "bulk-req-1",
      correlationId: "bulk-corr-1",
    })
  })

  it("returns 500 on unexpected internal errors", async () => {
    const { authenticateApiRequest } = await import("@/lib/auth/api-auth")

    vi.mocked(authenticateApiRequest).mockRejectedValue(new Error("boom"))

    const response = await POST(makeRequest())

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      success: false,
      error: "boom",
      errorCode: "INTERNAL_ERROR",
    })
  })
})
