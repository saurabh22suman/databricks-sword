import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

// Mock database
const mockDb = {
  select: vi.fn(),
}
vi.mock("@/lib/db/client", () => ({
  getDb: vi.fn(() => mockDb),
}))

// The sandbox snapshot that lives in the DB
const validSandboxJson = JSON.stringify({
  version: 1,
  missionProgress: {
    "lakehouse-fundamentals": {
      started: true,
      completed: true,
      stageProgress: {
        "01-briefing": { completed: true, xpEarned: 50, codeAttempts: [], hintsUsed: 0, completedAt: "2026-02-12T10:00:00Z" },
      },
      sideQuestsCompleted: [],
      totalXpEarned: 250,
      completedAt: "2026-02-12T12:00:00Z",
    },
  },
  challengeResults: {
    "df-transformations": {
      attempted: true,
      completed: true,
      xpEarned: 75,
      hintsUsed: 0,
      attempts: 1,
      completedAt: "2026-02-13T08:00:00Z",
    },
  },
  userStats: {
    totalXp: 1250,
    totalMissionsCompleted: 1,
    totalChallengesCompleted: 1,
    totalAchievements: 3,
    currentStreak: 5,
    longestStreak: 10,
    totalTimeSpentMinutes: 120,
  },
  streakData: {
    currentStreak: 5,
    longestStreak: 10,
    lastActiveDate: "2026-02-13",
    freezesAvailable: 2,
    freezesUsed: 0,
  },
  achievements: ["first-blood", "mission-clear", "streak-3"],
  flashcardProgress: {},
  lastSynced: "2026-02-13T09:00:00Z",
})

describe("GET /api/user/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>)

    const { GET } = await import("@/app/api/user/stats/route")
    const request = new NextRequest("http://localhost:3000/api/user/stats")
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it("returns null when user has no snapshot", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
      expires: "",
    } as unknown as Awaited<ReturnType<typeof auth>>)

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    })

    const { GET } = await import("@/app/api/user/stats/route")
    const request = new NextRequest("http://localhost:3000/api/user/stats")
    const response = await GET(request)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toBeNull()
  })

  it("returns user stats with rank from snapshot", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
      expires: "",
    } as unknown as Awaited<ReturnType<typeof auth>>)

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { snapshotData: validSandboxJson },
            ]),
          }),
        }),
      }),
    })

    const { GET } = await import("@/app/api/user/stats/route")
    const request = new NextRequest("http://localhost:3000/api/user/stats")
    const response = await GET(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.totalXp).toBe(1250)
    expect(data.rank).toBeDefined()
    expect(data.rank.title).toBeTruthy()
    expect(data.currentStreak).toBe(5)
    expect(data.missionsCompleted).toBe(1)
    expect(data.challengesCompleted).toBe(1)
    expect(data.achievements).toHaveLength(3)
  })
})

describe("GET /api/user/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>)

    const { GET } = await import("@/app/api/user/profile/route")
    const request = new NextRequest("http://localhost:3000/api/user/profile")
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it("returns full profile with mission progress and rank progress", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123", name: "Test User", image: "/avatar.png" },
      expires: "",
    } as unknown as Awaited<ReturnType<typeof auth>>)

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { snapshotData: validSandboxJson },
            ]),
          }),
        }),
      }),
    })

    const { GET } = await import("@/app/api/user/profile/route")
    const request = new NextRequest("http://localhost:3000/api/user/profile")
    const response = await GET(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.user.name).toBe("Test User")
    expect(data.totalXp).toBe(1250)
    expect(data.rank).toBeDefined()
    expect(data.completedMissions).toContain("lakehouse-fundamentals")
    expect(data.rankProgress).toBeDefined()
  })
})
