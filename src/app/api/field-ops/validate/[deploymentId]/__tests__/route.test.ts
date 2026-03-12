import { beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "../route"

vi.mock("@/lib/auth/api-auth", () => ({
  authenticateApiRequest: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  databricksConnections: { userId: "userId" },
  getDb: vi.fn(),
}))

vi.mock("@/lib/databricks", () => ({
  decryptPat: vi.fn(),
}))

vi.mock("@/lib/field-ops/deployment", () => ({
  getDeploymentStatus: vi.fn(),
  validateDeployment: vi.fn(),
  DeploymentConflictError: class DeploymentConflictError extends Error {},
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => "where-clause"),
}))

describe("Field Ops validate route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns runId and check keys on success", async () => {
    const { authenticateApiRequest } = await import("@/lib/auth/api-auth")
    const { getDb } = await import("@/lib/db")
    const { decryptPat } = await import("@/lib/databricks")
    const { getDeploymentStatus, validateDeployment } = await import("@/lib/field-ops/deployment")

    vi.mocked(authenticateApiRequest).mockResolvedValue({ authenticated: true, userId: "user-1" })
    vi.mocked(getDeploymentStatus).mockResolvedValue({
      id: "deployment-1",
      userId: "user-1",
      industry: "retail",
      status: "deployed",
      schemaPrefix: "field_ops_retail_abcd1234",
      catalogName: "dev",
    } as never)

    const limit = vi.fn().mockResolvedValue([
      { workspaceUrl: "https://example.databricks.com/", encryptedPat: "encrypted-pat", warehouseId: "wh-123" },
    ])
    const where = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ where })
    const select = vi.fn().mockReturnValue({ from })
    vi.mocked(getDb).mockReturnValue({ select } as never)
    vi.mocked(decryptPat).mockReturnValue("decrypted-pat")

    vi.mocked(validateDeployment).mockResolvedValue({
      runId: "run-1",
      results: [
        {
          checkKey: "bronze_sales_data_exists",
          checkName: "Bronze sales data exists",
          passed: true,
          errorMessage: null,
        },
      ],
      allPassed: true,
      operationId: "op-validate-1",
      requestId: "req-validate-1",
      correlationId: "corr-validate-1",
      replayed: false,
    } as never)

    const response = await POST(
      new Request("http://localhost:3000/api/field-ops/validate/deployment-1", {
        method: "POST",
        headers: {
          "Idempotency-Key": "validate-1",
          "X-Request-Id": "req-validate-1",
          "X-Correlation-Id": "corr-validate-1",
        },
      }) as never,
      { params: Promise.resolve({ deploymentId: "deployment-1" }) }
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.runId).toBe("run-1")
    expect(body.results[0]).toMatchObject({
      checkKey: "bronze_sales_data_exists",
      checkName: "Bronze sales data exists",
      passed: true,
    })
    expect(body.metadata).toEqual({
      requestId: "req-validate-1",
      correlationId: "corr-validate-1",
      operationId: "op-validate-1",
      replayed: false,
    })

    expect(validateDeployment).toHaveBeenCalledWith(
      "deployment-1",
      "user-1",
      expect.any(Object),
      {
        idempotencyKey: "validate-1",
        requestId: "req-validate-1",
        correlationId: "corr-validate-1",
      }
    )
  })
})
