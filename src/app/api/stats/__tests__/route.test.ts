import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
  users: {},
}))

describe("GET /api/stats", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("returns the registered user count", async () => {
    const select = vi.fn().mockReturnValue({
      from: vi.fn(async () => [{ count: 7 }]),
    })

    vi.doMock("@/lib/db", () => ({
      getDb: () => ({ select }),
      users: {},
    }))

    const { GET } = await import("../route")
    const response = await GET()

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body).toEqual({ userCount: 7 })
  })

  it("returns zeroed fallback when db query fails", async () => {
    const select = vi.fn().mockReturnValue({
      from: vi.fn(async () => {
        throw new Error("db down")
      }),
    })

    vi.doMock("@/lib/db", () => ({
      getDb: () => ({ select }),
      users: {},
    }))

    const { GET } = await import("../route")
    const response = await GET()

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body).toEqual({ userCount: 0 })
  })
})
