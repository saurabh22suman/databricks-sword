import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db/client", () => ({
  getDb: vi.fn(),
}))

const MOCK_USER_ID = "mock-user-001"
vi.mock("@/lib/auth/mockSession", () => ({
  MOCK_USER_ID,
}))

describe("GET /api/leaderboard", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("returns leaderboard entries using snapshot JSON fields", async () => {
    const rows = [
      {
        userId: "u-1",
        userName: "Alice",
        userImage: "/alice.png",
        snapshotData: JSON.stringify({
          version: 1,
          missionProgress: {},
          challengeResults: {},
          userStats: {
            totalXp: 1200,
            totalMissionsCompleted: 4,
            totalChallengesCompleted: 10,
            totalAchievements: 2,
            currentStreak: 5,
            longestStreak: 8,
            totalTimeSpentMinutes: 40,
          },
          streakData: {
            currentStreak: 5,
            longestStreak: 8,
            lastActiveDate: "2026-02-21",
            freezesAvailable: 1,
            freezesUsed: 0,
          },
          achievements: [],
          flashcardProgress: {},
          lastSynced: "2026-02-21T00:00:00.000Z",
        }),
      },
      {
        userId: "u-2",
        userName: "Bob",
        userImage: null,
        snapshotData: null,
      },
    ]

    const firstQuery = {
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(async () => rows),
          })),
        })),
      })),
    }

    const secondQuery = {
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ totalPlayers: 2 }]),
      })),
    }

    const select = vi
      .fn()
      .mockReturnValueOnce(firstQuery)
      .mockReturnValueOnce(secondQuery)

    const getDbMock = vi.fn(() => ({ select }))

    vi.doMock("@/lib/db/client", () => ({
      getDb: getDbMock,
    }))

    const { GET } = await import("../route")
    const response = await GET()

    expect(response.status).toBe(200)

    const body = await response.json()

    expect(body.totalPlayers).toBe(2)
    expect(body.entries).toHaveLength(2)

    expect(body.entries[0]).toMatchObject({
      userId: "u-1",
      name: "Alice",
      totalXp: 1200,
      missionsCompleted: 4,
      currentStreak: 5,
    })

    expect(body.entries[1]).toMatchObject({
      userId: "u-2",
      name: "Bob",
      totalXp: 0,
      missionsCompleted: 0,
      currentStreak: 0,
    })
  })

  it("gracefully handles malformed snapshot JSON", async () => {
    const rows = [
      {
        userId: "u-1",
        userName: "Alice",
        userImage: null,
        snapshotData: "{invalid-json}",
      },
    ]

    const firstQuery = {
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(async () => rows),
          })),
        })),
      })),
    }

    const secondQuery = {
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ totalPlayers: 1 }]),
      })),
    }

    const select = vi
      .fn()
      .mockReturnValueOnce(firstQuery)
      .mockReturnValueOnce(secondQuery)

    vi.doMock("@/lib/db/client", () => ({
      getDb: () => ({ select }),
    }))

    const { GET } = await import("../route")
    const response = await GET()

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.entries).toHaveLength(1)
    expect(body.entries[0]).toMatchObject({
      userId: "u-1",
      totalXp: 0,
      missionsCompleted: 0,
      currentStreak: 0,
    })
  })

  it("returns 500 when leaderboard query throws", async () => {
    const select = vi.fn().mockReturnValue({
      from: vi.fn(() => {
        throw new Error("DB failure")
      }),
    })

    vi.doMock("@/lib/db/client", () => ({
      getDb: () => ({ select }),
    }))

    const { GET } = await import("../route")
    const response = await GET()

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe("Internal server error")
    expect(body.errorCode).toBe("INTERNAL_ERROR")
  })
})
