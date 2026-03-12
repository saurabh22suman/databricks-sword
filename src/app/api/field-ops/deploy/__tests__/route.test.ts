import { beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "../route"


vi.mock("@/app/api/user/helpers", () => ({
  getUserSandbox: vi.fn(),
}))

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
  startDeployment: vi.fn(),
  DeploymentConflictError: class DeploymentConflictError extends Error {},
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => "where-clause"),
}))

describe("Field Ops deploy route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("blocks deploy when warehouse is missing", async () => {
    const { authenticateApiRequest } = await import("@/lib/auth/api-auth")
    const { getUserSandbox } = await import("@/app/api/user/helpers")
    const { getDb } = await import("@/lib/db")

    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: true,
      userId: "user-1",
    })

    vi.mocked(getUserSandbox).mockResolvedValue({
      userStats: { totalXp: 5000 },
    } as never)

    const limit = vi.fn().mockResolvedValue([
      {
        workspaceUrl: "https://example.databricks.com/",
        encryptedPat: "encrypted-pat",
        warehouseId: null,
        catalogName: "dev",
      },
    ])
    const where = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ where })
    const select = vi.fn().mockReturnValue({ from })
    vi.mocked(getDb).mockReturnValue({ select } as never)

    const response = await POST(
      new Request("http://localhost:3000/api/field-ops/deploy", {
        method: "POST",
        headers: { "Idempotency-Key": "dep-warehouse-missing" },
        body: JSON.stringify({ industry: "retail" }),
      }) as never
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain("warehouse")
  })

  it("uses persisted catalog and warehouse", async () => {
    const { authenticateApiRequest } = await import("@/lib/auth/api-auth")
    const { getUserSandbox } = await import("@/app/api/user/helpers")
    const { getDb } = await import("@/lib/db")
    const { decryptPat } = await import("@/lib/databricks")
    const { startDeployment } = await import("@/lib/field-ops/deployment")

    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: true,
      userId: "user-1",
    })

    vi.mocked(getUserSandbox).mockResolvedValue({
      userStats: { totalXp: 5000 },
    } as never)

    const limit = vi.fn().mockResolvedValue([
      {
        workspaceUrl: "https://example.databricks.com/",
        encryptedPat: "encrypted-pat",
        warehouseId: "wh-123",
        catalogName: "analytics",
      },
    ])
    const where = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ where })
    const select = vi.fn().mockReturnValue({ from })
    vi.mocked(getDb).mockReturnValue({ select } as never)

    vi.mocked(decryptPat).mockReturnValue("token")
    vi.mocked(startDeployment).mockResolvedValue({
      deployment: {
        id: "dep-1",
        industry: "retail",
        status: "deploying",
        schemaPrefix: "fo_retail_u1_x",
      },
      operationId: "op-1",
      requestId: "req-1",
      correlationId: "corr-1",
      replayed: false,
    } as never)

    const response = await POST(
      new Request("http://localhost:3000/api/field-ops/deploy", {
        method: "POST",
        headers: {
          "Idempotency-Key": "dep-success",
          "X-Request-Id": "req-1",
          "X-Correlation-Id": "corr-1",
        },
        body: JSON.stringify({ industry: "retail" }),
      }) as never
    )

    expect(response.status).toBe(200)
    expect(startDeployment).toHaveBeenCalledWith(
      "user-1",
      "retail",
      expect.objectContaining({
        catalog: "analytics",
        warehouseId: "wh-123",
      }),
      {
        idempotencyKey: "dep-success",
        requestId: "req-1",
        correlationId: "corr-1",
      }
    )

    const body = await response.json()
    expect(body.metadata).toEqual({
      requestId: "req-1",
      correlationId: "corr-1",
      operationId: "op-1",
      replayed: false,
    })
  })
})
