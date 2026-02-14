import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db/client"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET, POST } from "../route"

// Mock next-auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

// Mock database
const mockDb = {
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
}
vi.mock("@/lib/db/client", () => ({
  getDb: vi.fn(() => mockDb),
}))

describe("Sandbox Sync API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("POST /api/user/sync", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any)

      const request = new NextRequest("http://localhost:3000/api/user/sync", {
        method: "POST",
        body: JSON.stringify({ version: 1, missionProgress: {} }),
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe("Unauthorized")
    })

    it("should return 400 when request body is invalid", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: "2025-01-01",
      } as any)

      const request = new NextRequest("http://localhost:3000/api/user/sync", {
        method: "POST",
        body: JSON.stringify({ invalid: "data" }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe("Invalid sandbox data")
    })

    it("should upsert sandbox data and return 200 when valid", async () => {
      const userId = "user-123"
      vi.mocked(auth).mockResolvedValue({
        user: { id: userId, email: "test@example.com" },
        expires: "2025-01-01",
      } as any)

      const sandboxData = {
        version: 1,
        missionProgress: {},
        challengeResults: {},
        userStats: {
          totalXp: 0,
          totalMissionsCompleted: 0,
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
        lastSynced: new Date().toISOString(),
      }

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        }),
      })
      vi.mocked(mockDb.insert).mockReturnValue(mockInsert())

      const request = new NextRequest("http://localhost:3000/api/user/sync", {
        method: "POST",
        body: JSON.stringify(sandboxData),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })

  describe("GET /api/user/sync", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any)

      const request = new NextRequest("http://localhost:3000/api/user/sync", {
        method: "GET",
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe("Unauthorized")
    })

    it("should return null when no snapshot exists", async () => {
      const userId = "user-123"
      vi.mocked(auth).mockResolvedValue({
        user: { id: userId, email: "test@example.com" },
        expires: "2025-01-01",
      } as any)

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

      const request = new NextRequest("http://localhost:3000/api/user/sync", {
        method: "GET",
      })

      const response = await GET(request)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toBe(null)
    })

    it("should return snapshot data when it exists", async () => {
      const userId = "user-123"
      vi.mocked(auth).mockResolvedValue({
        user: { id: userId, email: "test@example.com" },
        expires: "2025-01-01",
      } as any)

      const snapshotData = {
        version: 1,
        missionProgress: {},
        challengeResults: {},
        userStats: {
          totalXp: 100,
          totalMissionsCompleted: 1,
          totalChallengesCompleted: 0,
          totalAchievements: 1,
          currentStreak: 3,
          longestStreak: 5,
          totalTimeSpentMinutes: 30,
        },
        streakData: {
          currentStreak: 3,
          longestStreak: 5,
          lastActiveDate: "2025-01-15",
          freezesAvailable: 1,
          freezesUsed: 1,
        },
        achievements: ["first-blood"],
        flashcardProgress: {},
        lastSynced: new Date().toISOString(),
      }

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: "snapshot-1",
                  userId,
                  snapshotData: JSON.stringify(snapshotData),
                  updatedAt: new Date(),
                },
              ]),
            }),
          }),
        }),
      })
      vi.mocked(mockDb.select).mockReturnValue(mockSelect())

      const request = new NextRequest("http://localhost:3000/api/user/sync", {
        method: "GET",
      })

      const response = await GET(request)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(snapshotData)
    })
  })
})
