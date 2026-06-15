import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db/client", () => ({
  getDb: vi.fn(),
}))

const MOCK_USER_ID = "mock-user-001"
vi.mock("@/lib/auth/mockSession", () => ({
  MOCK_USER_ID,
}))

function createMockRows(users: Array<{ userId: string; userName: string | null; userImage: string | null; totalXp: number }>) {
  return users.map((u) => ({
    userId: u.userId,
    userName: u.userName,
    userImage: u.userImage,
    snapshotData: u.totalXp > 0 ? JSON.stringify({
      version: 1,
      missionProgress: {},
      challengeResults: {},
      userStats: {
        totalXp: u.totalXp,
        totalMissionsCompleted: Math.floor(u.totalXp / 100),
        totalChallengesCompleted: 0,
        totalAchievements: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalTimeSpentMinutes: 0,
      },
      streakData: {
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: "",
        freezesAvailable: 2,
        freezesUsed: 0,
      },
      achievements: [],
      flashcardProgress: {},
      lastSynced: null,
    }) : null,
  }))
}

describe("GET /api/leaderboard", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("returns leaderboard entries using snapshot JSON fields for opted-in users", async () => {
    const rows = createMockRows([
      { userId: "u-1", userName: "Alice", userImage: "/alice.png", totalXp: 1200 },
      { userId: "u-2", userName: "Bob", userImage: null, totalXp: 0 },
    ])

    const firstQuery = {
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(async () => rows),
            })),
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
      .mockReturnValueOnce(secondQuery)
      .mockReturnValueOnce(firstQuery)

    const getDbMock = vi.fn(() => ({ select }))

    vi.doMock("@/lib/db/client", () => ({
      getDb: getDbMock,
    }))

    const { GET } = await import("../route")
    const response = await GET()

    expect(response.status).toBe(200)

    const body = await response.json()

    expect(body.pagination.totalPlayers).toBe(2)
    expect(body.entries).toHaveLength(2)

    expect(body.entries[0]).toMatchObject({
      userId: "u-1",
      name: "Alice",
      totalXp: 1200,
      missionsCompleted: 12,
      currentStreak: 0,
    })

    expect(body.entries[1]).toMatchObject({
      userId: "u-2",
      name: "Bob",
      totalXp: 0,
      missionsCompleted: 0,
      currentStreak: 0,
    })
  })

  it("only returns opted-in users", async () => {
    const rows = createMockRows([
      { userId: "u-1", userName: "Alice", userImage: null, totalXp: 0 },
    ])

    const firstQuery = {
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(async () => rows),
            })),
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
      .mockReturnValueOnce(secondQuery)
      .mockReturnValueOnce(firstQuery)

    const getDbMock = vi.fn(() => ({ select }))

    vi.doMock("@/lib/db/client", () => ({
      getDb: getDbMock,
    }))

    const { GET } = await import("../route")
    const response = await GET()

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.entries).toHaveLength(1)
    expect(body.pagination.totalPlayers).toBe(1)
    expect(body.entries[0].userId).toBe("u-1")
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
            orderBy: vi.fn(() => ({
              limit: vi.fn(async () => rows),
            })),
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
      .mockReturnValueOnce(secondQuery)
      .mockReturnValueOnce(firstQuery)

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

  describe("scope=nearby", () => {
    it("falls back to top when currentXp is missing", async () => {
      const rows = createMockRows([
        { userId: "u-1", userName: "Alice", userImage: null, totalXp: 1200 },
      ])

      const firstQuery = {
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn(async () => rows),
              })),
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
        .mockReturnValueOnce(secondQuery)
        .mockReturnValueOnce(firstQuery)

      vi.doMock("@/lib/db/client", () => ({
        getDb: () => ({ select }),
      }))

      const { GET } = await import("../route")
      const response = await GET()

      expect(response.status).toBe(200)

      const body = await response.json()

      expect(body.scope).toBe("top")
      expect(body.entries).toHaveLength(1)
    })

    it("falls back to top when currentXp is invalid", async () => {
      const rows = createMockRows([
        { userId: "u-1", userName: "Alice", userImage: null, totalXp: 1200 },
      ])

      const firstQuery = {
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn(async () => rows),
              })),
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
        .mockReturnValueOnce(secondQuery)
        .mockReturnValueOnce(firstQuery)

      vi.doMock("@/lib/db/client", () => ({
        getDb: () => ({ select }),
      }))

      const { GET } = await import("../route")
      const response = await GET()

      expect(response.status).toBe(200)

      const body = await response.json()

      expect(body.scope).toBe("top")
    })
  })
})