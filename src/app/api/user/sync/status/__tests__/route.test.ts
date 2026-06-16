import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { getDb } from "@/lib/db/client"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET } from "../route"

// Mock authenticateApiRequest
vi.mock("@/lib/auth/api-auth", () => ({
  authenticateApiRequest: vi.fn(),
}))

// Mock database
const mockDb = {
  select: vi.fn(),
}

vi.mock("@/lib/db/client", () => ({
  getDb: vi.fn(() => mockDb),
}))

describe("GET /api/user/sync/status", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("should return 401 when unauthenticated", async () => {
    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: false,
      error: "Unauthorized",
      status: 401,
    })

    const request = new NextRequest(
      "http://localhost:3000/api/user/sync/status",
      {
        method: "GET",
      }
    )

    const response = await GET(request)
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe("Unauthorized")
  })

  it("should return { updated: false, updatedAt: null } when no snapshot exists", async () => {
    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: true,
      userId: "user-123",
    })

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    })
    vi.mocked(mockDb.select).mockReturnValue(mockSelect())

    const request = new NextRequest(
      "http://localhost:3000/api/user/sync/status?since=2025-01-01T00:00:00.000Z",
      {
        method: "GET",
      }
    )

    const response = await GET(request)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toEqual({ updated: false, updatedAt: null })
  })

  it("should return { updated: true, updatedAt: <iso> } when no since is provided and a snapshot exists", async () => {
    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: true,
      userId: "user-123",
    })

    const snapshotUpdatedAt = new Date("2025-01-15T10:30:00.000Z")

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: "snapshot-1",
                userId: "user-123",
                snapshotData: "{}",
                updatedAt: snapshotUpdatedAt,
              },
            ]),
          }),
        }),
      }),
    })
    vi.mocked(mockDb.select).mockReturnValue(mockSelect())

    const request = new NextRequest(
      "http://localhost:3000/api/user/sync/status",
      {
        method: "GET",
      }
    )

    const response = await GET(request)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.updated).toBe(true)
    expect(data.updatedAt).toBe("2025-01-15T10:30:00.000Z")
  })

  it("should return { updated: true, updatedAt: <iso> } when since is older than the snapshot's updatedAt", async () => {
    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: true,
      userId: "user-123",
    })

    const snapshotUpdatedAt = new Date("2025-01-15T10:30:00.000Z")

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: "snapshot-1",
                userId: "user-123",
                snapshotData: "{}",
                updatedAt: snapshotUpdatedAt,
              },
            ]),
          }),
        }),
      }),
    })
    vi.mocked(mockDb.select).mockReturnValue(mockSelect())

    // since is older than snapshot's updatedAt
    const request = new NextRequest(
      "http://localhost:3000/api/user/sync/status?since=2025-01-10T00:00:00.000Z",
      {
        method: "GET",
      }
    )

    const response = await GET(request)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.updated).toBe(true)
    expect(data.updatedAt).toBe("2025-01-15T10:30:00.000Z")
  })

  it("should return { updated: false, updatedAt: <iso> } when since is newer than or equal to the snapshot's updatedAt", async () => {
    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: true,
      userId: "user-123",
    })

    const snapshotUpdatedAt = new Date("2025-01-15T10:30:00.000Z")

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: "snapshot-1",
                userId: "user-123",
                snapshotData: "{}",
                updatedAt: snapshotUpdatedAt,
              },
            ]),
          }),
        }),
      }),
    })
    vi.mocked(mockDb.select).mockReturnValue(mockSelect())

    // since is equal to snapshot's updatedAt
    const request = new NextRequest(
      "http://localhost:3000/api/user/sync/status?since=2025-01-15T10:30:00.000Z",
      {
        method: "GET",
      }
    )

    const response = await GET(request)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.updated).toBe(false)
    expect(data.updatedAt).toBe("2025-01-15T10:30:00.000Z")
  })

  it("should return { updated: false, updatedAt: <iso> } when since is newer than the snapshot's updatedAt", async () => {
    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: true,
      userId: "user-123",
    })

    const snapshotUpdatedAt = new Date("2025-01-15T10:30:00.000Z")

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: "snapshot-1",
                userId: "user-123",
                snapshotData: "{}",
                updatedAt: snapshotUpdatedAt,
              },
            ]),
          }),
        }),
      }),
    })
    vi.mocked(mockDb.select).mockReturnValue(mockSelect())

    // since is newer than snapshot's updatedAt
    const request = new NextRequest(
      "http://localhost:3000/api/user/sync/status?since=2025-01-20T00:00:00.000Z",
      {
        method: "GET",
      }
    )

    const response = await GET(request)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.updated).toBe(false)
    expect(data.updatedAt).toBe("2025-01-15T10:30:00.000Z")
  })

  it("should return 400 on invalid since (e.g., 'not-a-date')", async () => {
    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: true,
      userId: "user-123",
    })

    const request = new NextRequest(
      "http://localhost:3000/api/user/sync/status?since=not-a-date",
      {
        method: "GET",
      }
    )

    const response = await GET(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe("Invalid 'since' parameter")
  })

  it("should return 500 on DB error", async () => {
    vi.mocked(authenticateApiRequest).mockResolvedValue({
      authenticated: true,
      userId: "user-123",
    })

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error("DB connection failed")),
          }),
        }),
      }),
    })
    vi.mocked(mockDb.select).mockReturnValue(mockSelect())

    const request = new NextRequest(
      "http://localhost:3000/api/user/sync/status",
      {
        method: "GET",
      }
    )

    const response = await GET(request)
    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe("Internal server error")
  })
})