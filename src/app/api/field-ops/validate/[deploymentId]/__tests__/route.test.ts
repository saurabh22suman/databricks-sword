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
  updateDeploymentStatus: vi.fn(),
}))

vi.mock("@/lib/field-ops/validation", () => ({
  runValidation: vi.fn(),
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => "where-clause"),
}))

describe("Field Ops validate route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("recovers status back to deployed when validation throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const { authenticateApiRequest } = await import("@/lib/auth/api-auth")
    const { getDb } = await import("@/lib/db")
    const { decryptPat } = await import("@/lib/databricks")
    const { getDeploymentStatus, updateDeploymentStatus } = await import("@/lib/field-ops/deployment")
    const { runValidation } = await import("@/lib/field-ops/validation")

    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: true,
      userId: "user-1",
    })

    vi.mocked(getDeploymentStatus).mockResolvedValue({
      id: "deployment-1",
      userId: "user-1",
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

    vi.mocked(decryptPat).mockReturnValue("decrypted-pat")
    vi.mocked(runValidation).mockRejectedValue(new Error("validation crashed"))

    const response = await POST(
      new Request("http://localhost:3000/api/field-ops/validate/deployment-1", {
        method: "POST",
      }) as never,
      { params: Promise.resolve({ deploymentId: "deployment-1" }) }
    )

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "validation crashed" })

    expect(updateDeploymentStatus).toHaveBeenCalledTimes(2)
    expect(updateDeploymentStatus).toHaveBeenNthCalledWith(1, "deployment-1", "validating")
    expect(updateDeploymentStatus).toHaveBeenNthCalledWith(2, "deployment-1", "deployed")

    errorSpy.mockRestore()
  })

  it("returns original validation error even if status recovery fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const { authenticateApiRequest } = await import("@/lib/auth/api-auth")
    const { getDb } = await import("@/lib/db")
    const { decryptPat } = await import("@/lib/databricks")
    const { getDeploymentStatus, updateDeploymentStatus } = await import("@/lib/field-ops/deployment")
    const { runValidation } = await import("@/lib/field-ops/validation")

    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: true,
      userId: "user-1",
    })

    vi.mocked(getDeploymentStatus).mockResolvedValue({
      id: "deployment-1",
      userId: "user-1",
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

    vi.mocked(decryptPat).mockReturnValue("decrypted-pat")
    vi.mocked(runValidation).mockRejectedValue(new Error("validation crashed"))
    vi.mocked(updateDeploymentStatus)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("recovery failed"))

    const response = await POST(
      new Request("http://localhost:3000/api/field-ops/validate/deployment-1", {
        method: "POST",
      }) as never,
      { params: Promise.resolve({ deploymentId: "deployment-1" }) }
    )

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "validation crashed" })

    expect(updateDeploymentStatus).toHaveBeenCalledTimes(2)
    expect(updateDeploymentStatus).toHaveBeenNthCalledWith(1, "deployment-1", "validating")
    expect(updateDeploymentStatus).toHaveBeenNthCalledWith(2, "deployment-1", "deployed")

    errorSpy.mockRestore()
  })
})
