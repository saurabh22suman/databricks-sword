import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET } from "../route"

vi.mock("@/lib/auth/api-auth", () => ({
  authenticateApiRequest: vi.fn(),
}))

vi.mock("@/lib/field-ops/deployment", () => ({
  getDeploymentStatus: vi.fn(),
  getValidationResults: vi.fn(),
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
    expect(await response.json()).toEqual({ error: "Forbidden" })
  })
})