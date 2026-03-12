import { beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "../route"

vi.mock("@/lib/auth/api-auth", () => ({
  authenticateApiRequest: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  fieldOpsCompletions: {
    userId: "userId",
    industry: "industry",
    xpAwarded: "xpAwarded",
  },
  getDb: vi.fn(),
}))

vi.mock("@/lib/field-ops/deployment", () => ({
  allValidationsPassed: vi.fn(),
  completeDeployment: vi.fn(),
  getDeploymentStatus: vi.fn(),
}))

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args) => args),
  eq: vi.fn((left, right) => ({ left, right })),
}))

describe("Field Ops complete route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 400 when idempotency header is missing", async () => {
    const { authenticateApiRequest } = await import("@/lib/auth/api-auth")

    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: true,
      userId: "user-1",
    })

    const response = await POST(
      new Request("http://localhost:3000/api/field-ops/complete/dep-1", {
        method: "POST",
      }) as never,
      { params: Promise.resolve({ deploymentId: "dep-1" }) }
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      success: false,
      errorCode: "BAD_REQUEST",
    })
  })

  it("requires latest-run validations to pass", async () => {
    const { authenticateApiRequest } = await import("@/lib/auth/api-auth")
    const { getDeploymentStatus, allValidationsPassed } = await import("@/lib/field-ops/deployment")

    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: true,
      userId: "user-1",
    })

    vi.mocked(getDeploymentStatus).mockResolvedValue({
      id: "dep-1",
      userId: "user-1",
      industry: "retail",
    } as never)

    vi.mocked(allValidationsPassed).mockResolvedValue(false)

    const response = await POST(
      new Request("http://localhost:3000/api/field-ops/complete/dep-1", {
        method: "POST",
        headers: { "Idempotency-Key": "complete-validate-fail" },
      }) as never,
      { params: Promise.resolve({ deploymentId: "dep-1" }) }
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain("latest run")
    expect(body.errorCode).toBe("BAD_REQUEST")
  })

  it("returns alreadyAwarded=true when completion ledger exists", async () => {
    const { authenticateApiRequest } = await import("@/lib/auth/api-auth")
    const { getDb } = await import("@/lib/db")
    const { getDeploymentStatus, allValidationsPassed, completeDeployment } = await import("@/lib/field-ops/deployment")

    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: true,
      userId: "user-1",
    })

    vi.mocked(getDeploymentStatus).mockResolvedValue({
      id: "dep-1",
      userId: "user-1",
      industry: "retail",
    } as never)

    vi.mocked(allValidationsPassed).mockResolvedValue(true)
    vi.mocked(completeDeployment).mockResolvedValue({
      completedAt: new Date("2026-03-10T00:00:00Z"),
    } as never)

    const selectLimit = vi
      .fn()
      .mockResolvedValueOnce([
        { id: "ledger-1", xpAwarded: 700, userId: "user-1", industry: "retail" },
      ])
      .mockResolvedValueOnce([
        { id: "ledger-1", xpAwarded: 700, userId: "user-1", industry: "retail" },
      ])

    const selectWhere = vi.fn().mockReturnValue({ limit: selectLimit })
    const selectFrom = vi.fn().mockReturnValue({ where: selectWhere })

    const insertOnConflictDoNothing = vi.fn().mockResolvedValue(undefined)
    const insertValues = vi.fn().mockReturnValue({ onConflictDoNothing: insertOnConflictDoNothing })

    vi.mocked(getDb).mockReturnValue({
      select: vi.fn().mockReturnValue({ from: selectFrom }),
      insert: vi.fn().mockReturnValue({ values: insertValues }),
    } as never)

    const response = await POST(
      new Request("http://localhost:3000/api/field-ops/complete/dep-1", {
        method: "POST",
        headers: {
          "Idempotency-Key": "complete-ledger-existing",
          "X-Request-Id": "complete-req-1",
          "X-Correlation-Id": "complete-corr-1",
        },
      }) as never,
      { params: Promise.resolve({ deploymentId: "dep-1" }) }
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.alreadyAwarded).toBe(true)
    expect(body.xpAwarded).toBe(700)
    expect(body.metadata).toEqual({
      requestId: "complete-req-1",
      correlationId: "complete-corr-1",
    })
    expect(insertValues).not.toHaveBeenCalled()
  })
})
