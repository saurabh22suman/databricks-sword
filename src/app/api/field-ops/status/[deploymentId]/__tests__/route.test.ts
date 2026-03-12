import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET } from "../route"

vi.mock("@/lib/auth/api-auth", () => ({
  authenticateApiRequest: vi.fn(),
}))

vi.mock("@/lib/field-ops/deployment", () => ({
  getDeploymentStatus: vi.fn(),
  getLatestValidationRun: vi.fn(),
  getDeploymentOperations: vi.fn(),
  markStaleDeploymentOperations: vi.fn(),
}))

describe("Field Ops status route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when user is not authenticated", async () => {
    const { authenticateApiRequest } = await import("@/lib/auth/api-auth")
    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: false,
      error: "Unauthorized",
      status: 401,
    })

    const response = await GET(
      new Request("http://localhost:3000/api/field-ops/status/deployment-1") as never,
      { params: Promise.resolve({ deploymentId: "deployment-1" }) }
    )

    expect(response.status).toBe(401)
  })

  it("returns 403 when deployment belongs to another user", async () => {
    const { authenticateApiRequest } = await import("@/lib/auth/api-auth")
    const { getDeploymentStatus } = await import("@/lib/field-ops/deployment")

    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: true,
      userId: "user-1",
    })
    vi.mocked(getDeploymentStatus).mockResolvedValue({
      id: "deployment-1",
      userId: "user-2",
      industry: "retail",
      status: "deployed",
      schemaPrefix: "field_ops_retail_abcd1234",
      deployedAt: new Date(),
      completedAt: null,
      errorMessage: null,
      workspaceUrl: "https://example.databricks.com",
      catalogName: "dev",
      warehouseId: "wh-123",
    } as never)

    const response = await GET(
      new Request("http://localhost:3000/api/field-ops/status/deployment-1") as never,
      { params: Promise.resolve({ deploymentId: "deployment-1" }) }
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      success: false,
      error: "Forbidden",
      errorCode: "FORBIDDEN",
    })
  })

  it("returns only latest validation run", async () => {
    const { authenticateApiRequest } = await import("@/lib/auth/api-auth")
    const {
      getDeploymentStatus,
      getLatestValidationRun,
      getDeploymentOperations,
      markStaleDeploymentOperations,
    } = await import("@/lib/field-ops/deployment")

    vi.mocked(authenticateApiRequest).mockResolvedValue({ authenticated: true, userId: "user-1" })
    vi.mocked(getDeploymentStatus).mockResolvedValue({
      id: "deployment-1",
      userId: "user-1",
      industry: "retail",
      status: "deployed",
      schemaPrefix: "field_ops_retail_abcd1234",
      catalogName: "dev",
      warehouseId: "wh-123",
      workspaceUrl: "https://example.databricks.com",
    } as never)

    vi.mocked(markStaleDeploymentOperations).mockResolvedValue(1)
    vi.mocked(getDeploymentOperations).mockResolvedValue([
      {
        id: "op-1",
        operationType: "validate",
        state: "succeeded",
        requestId: "req-1",
        correlationId: "corr-1",
        startedAt: new Date("2026-03-10T00:00:00Z"),
        completedAt: new Date("2026-03-10T00:00:10Z"),
        durationMs: 10000,
        failureClass: null,
        retryCount: 1,
      },
    ] as never)

    vi.mocked(getLatestValidationRun).mockResolvedValue({
      runId: "run-2",
      results: [
        {
          checkKey: "bronze_sales_data_exists",
          checkName: "Bronze sales data exists",
          passed: true,
          executedAt: new Date("2026-03-10T00:00:00Z"),
          errorMessage: null,
        },
      ],
    } as never)

    const response = await GET(
      new Request("http://localhost:3000/api/field-ops/status/deployment-1", {
        headers: { "X-Request-Id": "req-status-1" },
      }) as never,
      { params: Promise.resolve({ deploymentId: "deployment-1" }) }
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.validationRun).toEqual({
      runId: "run-2",
      totalChecks: 1,
      passedChecks: 1,
    })
    expect(body.validations).toEqual([
      {
        checkKey: "bronze_sales_data_exists",
        checkName: "Bronze sales data exists",
        passed: true,
        executedAt: new Date("2026-03-10T00:00:00Z").toISOString(),
        errorMessage: null,
      },
    ])
    expect(body.operations).toHaveLength(1)
    expect(body.metadata).toEqual({
      requestId: "req-status-1",
      staleOperationsMarked: 1,
    })
  })
})
