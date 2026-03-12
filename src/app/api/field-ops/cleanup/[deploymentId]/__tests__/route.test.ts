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
  getDb: vi.fn(),
}))

vi.mock("@/lib/field-ops/deployment", () => ({
  cleanupDeployment: vi.fn(),
  getDeploymentStatus: vi.fn(),
  DeploymentConflictError: class DeploymentConflictError extends Error {},
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => "where-clause"),
}))

describe("Field Ops cleanup route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 409 for partial cleanup failures", async () => {
    const { authenticateApiRequest } = await import("@/lib/auth/api-auth")
    const { getDb } = await import("@/lib/db")
    const { decryptPat } = await import("@/lib/databricks")
    const { getDeploymentStatus, cleanupDeployment } = await import("@/lib/field-ops/deployment")

    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: true,
      userId: "user-1",
    })

    vi.mocked(getDeploymentStatus).mockResolvedValue({
      id: "dep-1",
      userId: "user-1",
      catalogName: "dev",
    } as never)

    const limit = vi.fn().mockResolvedValue([
      {
        workspaceUrl: "https://example.databricks.com/",
        encryptedPat: "encrypted-pat",
        warehouseId: "wh-123",
      },
    ])
    const where = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ where })
    const select = vi.fn().mockReturnValue({ from })

    vi.mocked(getDb).mockReturnValue({ select } as never)
    vi.mocked(decryptPat).mockReturnValue("token")

    vi.mocked(cleanupDeployment).mockResolvedValue({
      result: {
        success: false,
        failures: [
          {
            resourceType: "schema",
            resourceName: "dev.fo_retail_user_bronze",
            errorMessage: "permission denied",
          },
        ],
      },
      operationId: "op-cleanup-1",
      requestId: "req-cleanup-1",
      correlationId: "corr-cleanup-1",
      replayed: false,
    } as never)

    const response = await POST(
      new Request("http://localhost:3000/api/field-ops/cleanup/dep-1", {
        method: "POST",
        headers: {
          "Idempotency-Key": "cleanup-1",
          "X-Request-Id": "req-cleanup-1",
          "X-Correlation-Id": "corr-cleanup-1",
        },
      }) as never,
      { params: Promise.resolve({ deploymentId: "dep-1" }) }
    )

    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.error).toContain("partially")
    expect(body.failures).toHaveLength(1)
    expect(body.metadata).toEqual({
      requestId: "req-cleanup-1",
      correlationId: "corr-cleanup-1",
      operationId: "op-cleanup-1",
      replayed: false,
    })
  })
})
