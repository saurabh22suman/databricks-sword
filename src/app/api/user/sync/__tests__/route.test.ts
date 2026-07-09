import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db/client"
import { NextRequest } from "next/server"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { decryptSandbox, encryptSandbox } from "@/lib/sandbox/encryption"
import { GET, POST } from "../route"

// Production runs with ENCRYPTION_KEY set, so the POST handler stores
// ciphertext. To exercise the real round-trip the GET handler must
// support, we need encryption actually enabled during these tests.
beforeAll(() => {
  process.env.ENCRYPTION_KEY = "test-encryption-key-must-be-at-least-32-chars-long"
})

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

function mockRewardXp(totalCouponXp: number, totalFieldOpsXp: number): void {
  const whereCoupon = vi.fn().mockResolvedValue([{ totalCouponXp }])
  const fromCoupon = vi.fn().mockReturnValue({ where: whereCoupon })

  const whereFieldOps = vi.fn().mockResolvedValue([{ totalFieldOpsXp }])
  const fromFieldOps = vi.fn().mockReturnValue({ where: whereFieldOps })

  // The xp_awards aggregation query chains .groupBy() after .where(),
  // so the where result needs a groupBy method that resolves the rows.
  const groupBy = vi.fn().mockResolvedValue([])
  const whereLedger: any = vi.fn().mockReturnValue({ groupBy })
  const fromLedger = vi.fn().mockReturnValue({ where: whereLedger })

  vi.mocked(mockDb.select)
    .mockReturnValueOnce({ from: fromCoupon } as any)
    .mockReturnValueOnce({ from: fromFieldOps } as any)
    .mockReturnValueOnce({ from: fromLedger } as any)
}
vi.mock("@/lib/db/client", () => ({
  getDb: vi.fn(() => mockDb),
}))

describe("Sandbox Sync API Route", () => {
  beforeEach(() => {
    vi.resetAllMocks()
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
      mockRewardXp(0, 0)
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
      mockRewardXp(0, 0)
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
        completedFieldOps: [],
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

    it("should sanitize forged aggregate stats before persisting", async () => {
      mockRewardXp(0, 0)
      const userId = "user-123"
      vi.mocked(auth).mockResolvedValue({
        user: { id: userId, email: "test@example.com" },
        expires: "2025-01-01",
      } as any)

      const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined)
      const values = vi.fn().mockReturnValue({ onConflictDoUpdate })
      vi.mocked(mockDb.insert).mockReturnValue({ values } as any)

      const forgedSandboxData = {
        version: 1,
        missionProgress: {
          missionA: {
            started: true,
            completed: true,
            stageProgress: {
              stage1: {
                completed: true,
                xpEarned: 40,
                codeAttempts: [],
                hintsUsed: 0,
              },
              stage2: {
                completed: true,
                xpEarned: 10,
                codeAttempts: [],
                hintsUsed: 0,
              },
            },
            sideQuestsCompleted: [],
            totalXpEarned: 50,
          },
          missionB: {
            started: true,
            completed: false,
            stageProgress: {},
            sideQuestsCompleted: [],
            totalXpEarned: 0,
          },
        },
        challengeResults: {
          challenge1: {
            attempted: true,
            completed: true,
            xpEarned: 25,
            hintsUsed: 0,
            attempts: 1,
            completionCount: 1,
          },
          challenge2: {
            attempted: true,
            completed: false,
            xpEarned: 0,
            hintsUsed: 0,
            attempts: 2,
            completionCount: 0,
          },
        },
        userStats: {
          totalXp: 999999,
          totalMissionsCompleted: 999,
          totalChallengesCompleted: 999,
          totalAchievements: 999,
          currentStreak: 999,
          longestStreak: 999,
          totalTimeSpentMinutes: 120,
        },
        streakData: {
          currentStreak: 4,
          longestStreak: 9,
          lastActiveDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          freezesAvailable: 1,
          freezesUsed: 1,
        },
        achievements: ["first-blood", "getting-started"],
        completedFieldOps: ["retail", "retail", "gaming"],
        flashcardProgress: {},
        lastSynced: new Date().toISOString(),
      }

      const request = new NextRequest("http://localhost:3000/api/user/sync", {
        method: "POST",
        body: JSON.stringify(forgedSandboxData),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      expect(values).toHaveBeenCalledTimes(1)
      const insertedPayload = values.mock.calls[0][0]
      // Production POST stores snapshotData encrypted (see route.ts:295
      // encryptSandbox). Tests now run with ENCRYPTION_KEY set so we
      // must decrypt before inspecting the persisted payload.
      const persistedSnapshot = JSON.parse(decryptSandbox(insertedPayload.snapshotData))

      expect(persistedSnapshot.userStats).toMatchObject({
        totalXp: 185,
        totalMissionsCompleted: 1,
        totalChallengesCompleted: 1,
        totalAchievements: 2,
        currentStreak: 2,
        longestStreak: 9,
        totalTimeSpentMinutes: 120,
      })

      // No freeze used since user was active yesterday
      expect(persistedSnapshot.streakData.freezesAvailable).toBe(1)
      expect(persistedSnapshot.streakData.freezesUsed).toBe(1)
    })

    it("should include coupon XP in authoritative totalXp recomputation", async () => {
      mockRewardXp(11000, 0)
      const userId = "user-123"
      vi.mocked(auth).mockResolvedValue({
        user: { id: userId, email: "test@example.com" },
        expires: "2025-01-01",
      } as any)

      const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined)
      const values = vi.fn().mockReturnValue({ onConflictDoUpdate })
      vi.mocked(mockDb.insert).mockReturnValue({ values } as any)

      const sandboxData = {
        version: 1,
        missionProgress: {
          missionA: {
            started: true,
            completed: true,
            stageProgress: {},
            sideQuestsCompleted: [],
            totalXpEarned: 50,
          },
        },
        challengeResults: {
          challenge1: {
            attempted: true,
            completed: true,
            xpEarned: 25,
            hintsUsed: 0,
            attempts: 1,
            completionCount: 1,
          },
        },
        userStats: {
          totalXp: 0,
          totalMissionsCompleted: 0,
          totalChallengesCompleted: 0,
          totalAchievements: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalTimeSpentMinutes: 20,
        },
        streakData: {
          currentStreak: 0,
          longestStreak: 0,
          lastActiveDate: "",
          freezesAvailable: 2,
          freezesUsed: 0,
        },
        achievements: ["first-blood"],
        completedFieldOps: [],
        flashcardProgress: {},
        lastSynced: new Date().toISOString(),
      }

      const request = new NextRequest("http://localhost:3000/api/user/sync", {
        method: "POST",
        body: JSON.stringify(sandboxData),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const insertedPayload = values.mock.calls[0][0]
      // Production POST stores snapshotData encrypted (see route.ts:295
      // encryptSandbox). Tests now run with ENCRYPTION_KEY set so we
      // must decrypt before inspecting the persisted payload.
      const persistedSnapshot = JSON.parse(decryptSandbox(insertedPayload.snapshotData))

      // 50 mission + 25 challenge + 75 achievement(first-blood) + 11000 coupons
      expect(persistedSnapshot.userStats.totalXp).toBe(11150)
      expect(insertedPayload.totalXp).toBe(11150)
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
        completedFieldOps: [],
        flashcardProgress: {},
        lastSynced: new Date().toISOString(),
      }

      // Production stores the snapshot encrypted (POST route uses
      // encryptSandbox). The GET handler must decrypt before parsing —
      // otherwise JSON.parse throws on ciphertext and every GET 500s.
      const encryptedSnapshot = encryptSandbox(JSON.stringify(snapshotData))

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: "snapshot-1",
                  userId,
                  snapshotData: encryptedSnapshot,
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

    it("should return 500 when the stored snapshot is corrupted (decryption fails)", async () => {
      const userId = "user-123"
      vi.mocked(auth).mockResolvedValue({
        user: { id: userId, email: "test@example.com" },
        expires: "2025-01-01",
      } as any)

      // Garbage that encryptSandbox would never produce — verifies the
      // GET handler surfaces decryption errors as 500s (not 200 with
      // parsed garbage) so the client can distinguish corruption from
      // a genuinely empty snapshot.
      const corrupted = "not-valid-base64-or-ciphertext-at-all"

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: "snapshot-1",
                  userId,
                  snapshotData: corrupted,
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
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })
  })
})
