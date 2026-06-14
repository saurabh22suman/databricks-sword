import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db/client"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "../route"

// Mock next-auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

/**
 * Builds a Drizzle mock that:
 *   - First two `db.select(...).from(...).where(...)` calls return the
 *     coupon/field-ops XP aggregates (in that order).
 *   - The third `db.select(...).from(...).where(...).groupBy(...)` call
 *     returns the xp_awards aggregation row(s).
 *   - `db.insert(...).values(...).onConflictDoUpdate(...)` resolves.
 */
function setupDbMock(opts: {
  totalCouponXp: number
  totalFieldOpsXp: number
  ledger: Array<{ sourceType: string; totalXp: number; awardCount: number }>
}) {
  const whereCoupon = vi
    .fn()
    .mockResolvedValueOnce([{ totalCouponXp: opts.totalCouponXp }])
  const fromCoupon = vi.fn().mockReturnValue({ where: whereCoupon })

  const whereFieldOps = vi
    .fn()
    .mockResolvedValueOnce([{ totalFieldOpsXp: opts.totalFieldOpsXp }])
  const fromFieldOps = vi.fn().mockReturnValue({ where: whereFieldOps })

  // The xp_awards query chains .groupBy() after .where(), so the where
  // result must be both thenable AND have a groupBy method.
  const groupBy = vi.fn().mockResolvedValueOnce(opts.ledger)
  const whereLedger: any = vi.fn().mockReturnValue({
    then: (resolve: (rows: unknown) => void) =>
      Promise.resolve(opts.ledger).then(resolve),
    groupBy,
  })
  const fromLedger = vi.fn().mockReturnValue({ where: whereLedger })

  vi.mocked(getDb().select)
    .mockReturnValueOnce({ from: fromCoupon } as any)
    .mockReturnValueOnce({ from: fromFieldOps } as any)
    .mockReturnValueOnce({ from: fromLedger } as any)

  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined)
  const values = vi.fn().mockReturnValue({ onConflictDoUpdate })
  vi.mocked(getDb().insert).mockReturnValue({ values } as any)
  return { values, onConflictDoUpdate }
}

vi.mock("@/lib/db/client", () => ({
  getDb: vi.fn(() => mockDb),
}))

const mockDb = {
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
}

function makeSandbox(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  }
}

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/user/sync", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

const USER_ID = "user-1"

describe("POST /api/user/sync — recompute from xp_awards ledger", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("computes totalXp from the xp_awards ledger, ignoring client-sent mission/challenge XP", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: USER_ID, email: "test@example.com" },
      expires: "2026-01-01",
    } as any)

    // Ledger says: 100 stage + 250 mission + 75 challenge = 425
    // Client lies: 50 mission + 25 challenge (in sandbox)
    // Expected totalXp: 425 + 0 coupon + 0 field ops = 425
    const { values } = setupDbMock({
      totalCouponXp: 0,
      totalFieldOpsXp: 0,
      ledger: [
        { sourceType: "stage", totalXp: 100, awardCount: 1 },
        { sourceType: "mission", totalXp: 250, awardCount: 1 },
        { sourceType: "challenge", totalXp: 75, awardCount: 1 },
      ],
    })

    const sandbox = makeSandbox({
      missionProgress: {
        // Client lies — claims 999999 for a mission
        missionA: {
          started: true,
          completed: true,
          stageProgress: {},
          sideQuestsCompleted: [],
          totalXpEarned: 999999,
        },
      },
      challengeResults: {
        challenge1: {
          attempted: true,
          completed: true,
          xpEarned: 999999,
          hintsUsed: 0,
          attempts: 1,
          completionCount: 1,
        },
      },
    })

    const response = await POST(makeRequest(sandbox))
    expect(response.status).toBe(200)

    const insertedPayload = values.mock.calls[0][0]
    const persistedSnapshot = JSON.parse(insertedPayload.snapshotData)

    // Server-computed totalXp from ledger (425) wins over client-sent (1999998+)
    expect(persistedSnapshot.userStats.totalXp).toBe(425)
    expect(insertedPayload.totalXp).toBe(425)
  })

  it("overrides forged userStats.totalXp from the client", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: USER_ID, email: "test@example.com" },
      expires: "2026-01-01",
    } as any)

    const { values } = setupDbMock({
      totalCouponXp: 0,
      totalFieldOpsXp: 0,
      ledger: [
        { sourceType: "stage", totalXp: 50, awardCount: 1 },
      ],
    })

    const sandbox = makeSandbox({
      userStats: {
        totalXp: 999999,
        totalMissionsCompleted: 999,
        totalChallengesCompleted: 999,
        totalAchievements: 999,
        currentStreak: 999,
        longestStreak: 999,
        totalTimeSpentMinutes: 120,
      },
    })

    const response = await POST(makeRequest(sandbox))
    expect(response.status).toBe(200)

    const insertedPayload = values.mock.calls[0][0]
    const persistedSnapshot = JSON.parse(insertedPayload.snapshotData)

    // All XP values come from the ledger
    expect(persistedSnapshot.userStats.totalXp).toBe(50)
    // Mission/challenge counts come from the ledger too (not client stats)
    expect(persistedSnapshot.userStats.totalMissionsCompleted).toBe(0)
    expect(persistedSnapshot.userStats.totalChallengesCompleted).toBe(0)
    // totalTimeSpentMinutes is preserved from client (not an XP field)
    expect(persistedSnapshot.userStats.totalTimeSpentMinutes).toBe(120)
  })

  it("includes coupon and field ops XP on top of the ledger", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: USER_ID, email: "test@example.com" },
      expires: "2026-01-01",
    } as any)

    // Ledger: 100 + 50 = 150
    // Coupons: 11000
    // Field ops: 0
    // Total: 11150
    const { values } = setupDbMock({
      totalCouponXp: 11000,
      totalFieldOpsXp: 0,
      ledger: [
        { sourceType: "stage", totalXp: 100, awardCount: 2 },
        { sourceType: "challenge", totalXp: 50, awardCount: 1 },
      ],
    })

    const sandbox = makeSandbox()

    const response = await POST(makeRequest(sandbox))
    expect(response.status).toBe(200)

    const insertedPayload = values.mock.calls[0][0]
    const persistedSnapshot = JSON.parse(insertedPayload.snapshotData)

    expect(persistedSnapshot.userStats.totalXp).toBe(11150)
  })

  it("counts completed missions from mission awards in the ledger", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: USER_ID, email: "test@example.com" },
      expires: "2026-01-01",
    } as any)

    const { values } = setupDbMock({
      totalCouponXp: 0,
      totalFieldOpsXp: 0,
      ledger: [
        { sourceType: "mission", totalXp: 500, awardCount: 3 },
        { sourceType: "challenge", totalXp: 200, awardCount: 5 },
      ],
    })

    const sandbox = makeSandbox({
      // Client lies about counts
      missionProgress: {
        m1: { started: true, completed: true, stageProgress: {}, sideQuestsCompleted: [], totalXpEarned: 0 },
        m2: { started: true, completed: true, stageProgress: {}, sideQuestsCompleted: [], totalXpEarned: 0 },
        m3: { started: true, completed: true, stageProgress: {}, sideQuestsCompleted: [], totalXpEarned: 0 },
        m4: { started: true, completed: true, stageProgress: {}, sideQuestsCompleted: [], totalXpEarned: 0 },
      },
    })

    const response = await POST(makeRequest(sandbox))
    expect(response.status).toBe(200)

    const insertedPayload = values.mock.calls[0][0]
    const persistedSnapshot = JSON.parse(insertedPayload.snapshotData)

    // Server uses ledger counts, not client missionProgress.completed count
    expect(persistedSnapshot.userStats.totalMissionsCompleted).toBe(3)
    expect(persistedSnapshot.userStats.totalChallengesCompleted).toBe(5)
  })

  it("falls back to client sandbox when the ledger is empty (legacy/transition mode)", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: USER_ID, email: "test@example.com" },
      expires: "2026-01-01",
    } as any)

    // Empty ledger (user has never claimed via the new endpoints)
    const { values } = setupDbMock({
      totalCouponXp: 0,
      totalFieldOpsXp: 0,
      ledger: [],
    })

    const sandbox = makeSandbox({
      missionProgress: {
        m1: {
          started: true,
          completed: true,
          stageProgress: {},
          sideQuestsCompleted: [],
          totalXpEarned: 50,
        },
      },
      challengeResults: {
        c1: {
          attempted: true,
          completed: true,
          xpEarned: 25,
          hintsUsed: 0,
          attempts: 1,
          completionCount: 1,
        },
      },
      achievements: ["first-blood"], // 75 XP bonus
    })

    const response = await POST(makeRequest(sandbox))
    expect(response.status).toBe(200)

    const insertedPayload = values.mock.calls[0][0]
    const persistedSnapshot = JSON.parse(insertedPayload.snapshotData)

    // Legacy mode: trust the sandbox since ledger is empty
    // 50 + 25 + 75 = 150
    expect(persistedSnapshot.userStats.totalXp).toBe(150)
    expect(persistedSnapshot.userStats.totalMissionsCompleted).toBe(1)
    expect(persistedSnapshot.userStats.totalChallengesCompleted).toBe(1)
  })
})
