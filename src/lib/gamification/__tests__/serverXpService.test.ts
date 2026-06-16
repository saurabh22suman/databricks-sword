import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the DB client and content loaders so the service can be tested
// without touching the filesystem or a real database.
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
}
const mockGetMission = vi.fn()
const mockGetChallenge = vi.fn()
const mockGetUserSandbox = vi.fn()

vi.mock("@/lib/db/client", () => ({
  getDb: vi.fn(() => mockDb),
}))

vi.mock("@/lib/missions/loader", () => ({
  getMission: (...args: unknown[]) => mockGetMission(...args),
}))

vi.mock("@/lib/challenges/loader", () => ({
  getChallenge: (...args: unknown[]) => mockGetChallenge(...args),
}))

vi.mock("@/app/api/user/helpers", () => ({
  getUserSandbox: (...args: unknown[]) => mockGetUserSandbox(...args),
}))

import {
  claimAchievementXp,
  claimChallengeXp,
  claimMissionXp,
  claimStageXp,
  computeStreakFromAwards,
  getXpMultiplierForUser,
} from "../serverXpService"

import { ACHIEVEMENTS } from "../achievements"

// -----------------------------------------------------------------------------
// Test helpers
// -----------------------------------------------------------------------------

/**
 * Sets up a mock chain for `db.insert(xpAwards).values(...).onConflictDoNothing().returning()`.
 * Returns a `returning` spy that the test can configure.
 */
function setupInsertReturning(rows: Array<{ id: string; xpAmount: number }>) {
  const returning = vi.fn().mockResolvedValue(rows)
  const onConflictDoNothing = vi.fn().mockReturnValue({ returning })
  const values = vi.fn().mockReturnValue({ onConflictDoNothing })
  mockDb.insert.mockReturnValue({ values } as any)
  return { values, onConflictDoNothing, returning }
}

/**
 * Sets up a mock chain for `db.insert(stageAttempts).values(...).onConflictDoUpdate()`.
 * Returns the chain so the test can configure resolution.
 *
 * This modifies the mock to always include onConflictDoUpdate in the chain.
 */
function setupStageAttemptUpsert() {
  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined)

  // Store reference to the existing insert mock
  const prevInsert = mockDb.insert.getMockImplementation()

  mockDb.insert.mockImplementation((table: any) => {
    // Always add onConflictDoUpdate to the chain result
    const result: any = prevInsert ? prevInsert(table) : {}

    // If we got a values method, wrap it to add onConflictDoUpdate
    if (result.values) {
      const originalValues = result.values
      result.values = (...args: any[]) => {
        const valuesResult = originalValues(...args)
        // Add onConflictDoUpdate to whatever the original returns
        return {
          ...valuesResult,
          onConflictDoUpdate,
        }
      }
    }

    return result
  })

  return { values: vi.fn(), onConflictDoUpdate }
}

// Track select call count for multiple select calls in one test
let selectCallCount = 0

/**
 * Sets up a mock chain for `db.select(...).from(table).where(...).orderBy(...).all()`.
 * The where result must be both thenable (so `await` works) and have an
 * orderBy method (since the production query chains orderBy after where).
 *
 * For stage_attempts queries (from stageAttempts table), returns empty rows
 * when no prior attempts exist. For xp_awards, returns the provided rows.
 */
function setupSelectRows(rows: Array<{ awardedAt: Date }>, tableName?: string) {
  selectCallCount++

  // Create a mock that returns different results based on the table being selected
  const prevSelect = mockDb.select.getMockImplementation()

  mockDb.select.mockImplementation((table: any) => {
    // Check if this is a stage_attempts query by examining the table object
    const isStageAttempts = table && typeof table === 'object' &&
      'columnNames' in table && table.columnNames &&
      'userId' in table.columnNames

    const orderBy = vi.fn().mockReturnValue({
      then: (resolve: (rows: any) => void) => Promise.resolve(rows).then(resolve),
    })

    const resultRows = isStageAttempts ? [] : rows

    const whereThenable: any = {
      then: (resolve: (rows: any) => void) => Promise.resolve(resultRows).then(resolve),
      orderBy,
    }

    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(whereThenable),
      }),
    }
  })
}

const MISSION_ID = "test-mission"
const STAGE_ID = "01-briefing"
const USER_ID = "user-1"
const CHALLENGE_ID = "test-challenge-1"

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe("serverXpService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: empty xp_awards (no streak, no prior awards)
    setupSelectRows([])
    mockGetUserSandbox.mockResolvedValue(null)
  })

  describe("claimStageXp", () => {
    it("returns 0 and skips insert when stage is not in the mission", async () => {
      mockGetMission.mockResolvedValue({
        id: MISSION_ID,
        stages: [
          { id: "01-briefing", xpReward: 100 },
          { id: "02-diagram", xpReward: 80 },
        ],
      })

      const result = await claimStageXp({
        userId: USER_ID,
        missionId: MISSION_ID,
        stageId: "nonexistent-stage",
      })

      expect(result).toEqual({ xpAwarded: 0, alreadyAwarded: false })
      expect(mockDb.insert).not.toHaveBeenCalled()
    })

    it("uses server-side xpReward from content config (ignores any client-sent amount)", async () => {
      // Mission has a 100-XP stage. Server must read 100 from config,
      // not trust any client-provided amount.
      // With hintsUsed undefined/defaults to 0, both first-try and no-hints apply (15 + 50 = 65)
      mockGetMission.mockResolvedValue({
        id: MISSION_ID,
        stages: [{ id: STAGE_ID, xpReward: 100 }],
      })
      // 100 + 15 first-try + 50 no-hints = 165
      const { values } = setupInsertReturning([
        { id: "row-1", xpAmount: 165 },
      ])
      setupStageAttemptUpsert()

      const result = await claimStageXp({
        userId: USER_ID,
        missionId: MISSION_ID,
        stageId: STAGE_ID,
      })

      expect(result.xpAwarded).toBe(165)
      // The values payload should contain the canonical server-computed amount
      // There are 2 insert calls - check the xp_awards call (2nd)
      expect(values).toHaveBeenCalledTimes(2)
      const lastCall = values.mock.calls[1][0]
      expect(lastCall).toMatchObject({
        userId: USER_ID,
        sourceType: "stage",
        sourceId: `${MISSION_ID}:${STAGE_ID}`,
        xpAmount: 165,
      })
    })

    it("applies firstTry and noHints bonuses on top of base xp", async () => {
      mockGetMission.mockResolvedValue({
        id: MISSION_ID,
        stages: [{ id: STAGE_ID, xpReward: 100 }],
      })
      // Constants: FIRST_TRY_BONUS = 15, NO_HINTS_BONUS = 50
      // Total base = 100 + 15 + 50 = 165, multiplier 1.0x => 165
      const { values } = setupInsertReturning([
        { id: "row-1", xpAmount: 165 },
      ])
      setupStageAttemptUpsert()

      const result = await claimStageXp({
        userId: USER_ID,
        missionId: MISSION_ID,
        stageId: STAGE_ID,
        options: { hintsUsed: 0 },
      })

      expect(result.xpAwarded).toBe(165)
      expect(values).toHaveBeenCalledWith(
        expect.objectContaining({ xpAmount: 165 }),
      )
    })

    it("applies streak multiplier (1.5x for 7-day streak)", async () => {
      // Award timestamps from the past 7 days, ending today
      const today = new Date()
      const recent: Array<{ awardedAt: Date }> = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        return { awardedAt: d }
      })
      setupSelectRows(recent)

      mockGetMission.mockResolvedValue({
        id: MISSION_ID,
        stages: [{ id: STAGE_ID, xpReward: 100 }],
      })
      // 100 * 1.5 = 150
      setupInsertReturning([{ id: "row-1", xpAmount: 150 }])
      setupStageAttemptUpsert()

      const result = await claimStageXp({
        userId: USER_ID,
        missionId: MISSION_ID,
        stageId: STAGE_ID,
      })

      expect(result.xpAwarded).toBe(150)
    })

    it("is idempotent: returns existing XP and skips insert on duplicate claim", async () => {
      mockGetMission.mockResolvedValue({
        id: MISSION_ID,
        stages: [{ id: STAGE_ID, xpReward: 100 }],
      })
      // onConflictDoNothing returns empty array when row already exists
      const { values } = setupInsertReturning([])
      setupStageAttemptUpsert()

      const result = await claimStageXp({
        userId: USER_ID,
        missionId: MISSION_ID,
        stageId: STAGE_ID,
      })

      expect(result).toEqual({ xpAwarded: 0, alreadyAwarded: true })
      // Insert was called twice: stage_attempts (upsert) and xp_awards (conflict)
      expect(values).toHaveBeenCalledTimes(2)
    })

    it("applies first-try bonus when no prior stage_attempts row exists", async () => {
      mockGetMission.mockResolvedValue({
        id: MISSION_ID,
        stages: [{ id: STAGE_ID, xpReward: 100 }],
      })
      // Empty select — no prior attempts
      setupSelectRows([])
      const { returning } = setupInsertReturning([
        { id: "award-1", xpAmount: 165 }, // 100 base + 15 first-try + 50 no-hints = 165
      ])
      setupStageAttemptUpsert()

      const result = await claimStageXp({
        userId: USER_ID,
        missionId: MISSION_ID,
        stageId: STAGE_ID,
        options: { hintsUsed: 0 }, // hintsUsed: 0 triggers no-hints bonus, no prior row triggers first-try bonus
      })

      // Actual computed value: 100 + 15 (first-try) + 50 (no-hints) = 165
      expect(result.xpAwarded).toBe(165)
    })

    it("applies no-hints bonus when hintsUsed in the request is 0", async () => {
      mockGetMission.mockResolvedValue({
        id: MISSION_ID,
        stages: [{ id: STAGE_ID, xpReward: 100 }],
      })
      // Empty select — no prior attempts (tests both bonuses applied to base)
      setupSelectRows([])
      setupInsertReturning([{ id: "award-1", xpAmount: 165 }]) // 100 + 15 + 50 = 165
      setupStageAttemptUpsert()

      const result = await claimStageXp({
        userId: USER_ID,
        missionId: MISSION_ID,
        stageId: STAGE_ID,
        options: { hintsUsed: 0 },
      })

      // With hintsUsed: 0 AND no prior row: both bonuses apply (100 + 15 + 50 = 165)
      expect(result.xpAwarded).toBe(165)
    })
  })

  describe("claimMissionXp", () => {
    it("writes mission-completion bonus to ledger", async () => {
      mockGetMission.mockResolvedValue({
        id: MISSION_ID,
        xpReward: 250,
        stages: [],
      })
      const { values } = setupInsertReturning([
        { id: "row-1", xpAmount: 250 },
      ])

      const result = await claimMissionXp({
        userId: USER_ID,
        missionId: MISSION_ID,
      })

      expect(result.xpAwarded).toBe(250)
      expect(values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          sourceType: "mission",
          sourceId: MISSION_ID,
          xpAmount: 250,
        }),
      )
    })

    it("returns 0 when mission does not exist (no insert)", async () => {
      mockGetMission.mockRejectedValue(new Error("Mission not found"))

      const result = await claimMissionXp({
        userId: USER_ID,
        missionId: "does-not-exist",
      })

      expect(result.xpAwarded).toBe(0)
      expect(mockDb.insert).not.toHaveBeenCalled()
    })
  })

  describe("claimChallengeXp", () => {
    it("writes challenge XP to ledger using content config", async () => {
      mockGetChallenge.mockResolvedValue({
        id: CHALLENGE_ID,
        xpReward: 75,
      })
      const { values } = setupInsertReturning([
        { id: "row-1", xpAmount: 75 },
      ])

      const result = await claimChallengeXp({
        userId: USER_ID,
        challengeId: CHALLENGE_ID,
      })

      expect(result.xpAwarded).toBe(75)
      expect(values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          sourceType: "challenge",
          sourceId: CHALLENGE_ID,
          xpAmount: 75,
        }),
      )
    })

    it("returns 0 when challenge does not exist (no insert)", async () => {
      mockGetChallenge.mockResolvedValue(null)

      const result = await claimChallengeXp({
        userId: USER_ID,
        challengeId: "nope",
      })

      expect(result.xpAwarded).toBe(0)
      expect(mockDb.insert).not.toHaveBeenCalled()
    })
  })

  describe("computeStreakFromAwards", () => {
    it("returns 0 when there are no awards", () => {
      expect(computeStreakFromAwards([])).toBe(0)
    })

    it("returns 1 for an award dated today", () => {
      const today = new Date()
      expect(computeStreakFromAwards([{ awardedAt: today }])).toBe(1)
    })

    it("returns 1 for an award dated yesterday (streak maintained)", () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(computeStreakFromAwards([{ awardedAt: yesterday }])).toBe(1)
    })

    it("returns 0 for an award dated 2+ days ago (streak broken)", () => {
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      expect(computeStreakFromAwards([{ awardedAt: threeDaysAgo }])).toBe(0)
    })

    it("returns 3 for awards on three consecutive days ending today", () => {
      const today = new Date()
      const awards = Array.from({ length: 3 }, (_, i) => {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        return { awardedAt: d }
      })
      expect(computeStreakFromAwards(awards)).toBe(3)
    })
  })

  describe("getXpMultiplierForUser", () => {
    it("returns 1.0x for a user with no recent awards", async () => {
      setupSelectRows([])
      const multiplier = await getXpMultiplierForUser(USER_ID)
      expect(multiplier).toBe(1.0)
    })

    it("returns 1.5x for a user with a 7-day streak", async () => {
      const today = new Date()
      const recent: Array<{ awardedAt: Date }> = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        return { awardedAt: d }
      })
      setupSelectRows(recent)
      const multiplier = await getXpMultiplierForUser(USER_ID)
      expect(multiplier).toBe(1.5)
    })
  })

  describe("claimAchievementXp", () => {
    it("returns 0 when achievementId is unknown", async () => {
      const result = await claimAchievementXp({
        userId: USER_ID,
        achievementId: "does-not-exist",
      })
      expect(result).toEqual({ xpAwarded: 0, alreadyAwarded: false })
    })

    it("inserts an award with the achievement's xpBonus", async () => {
      const { returning } = setupInsertReturning([
        { id: "award-1", xpAmount: ACHIEVEMENTS[0].xpBonus },
      ])
      const result = await claimAchievementXp({
        userId: USER_ID,
        achievementId: ACHIEVEMENTS[0].id, // "first-blood", xpBonus 75
      })
      expect(result).toEqual({ xpAwarded: 75, alreadyAwarded: false })
      expect(returning).toHaveBeenCalled()
    })

    it("returns alreadyAwarded: true when insert is a no-op", async () => {
      setupInsertReturning([]) // empty returning → conflict
      const result = await claimAchievementXp({
        userId: USER_ID,
        achievementId: ACHIEVEMENTS[0].id,
      })
      expect(result).toEqual({ xpAwarded: 0, alreadyAwarded: true })
    })
  })
})
