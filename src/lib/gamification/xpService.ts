/**
 * @file xpService.ts
 * @description Client-side XP event tracking service.
 *
 * Produces XpEvent objects and writes them into the sandbox.
 * Applies streak multipliers and bonuses (first-try, no-hints).
 * Each function returns the XpEvent so the UI can animate it.
 * After every XP award, checks and unlocks any newly earned achievements.
 */

import { initializeSandbox, loadSandbox, updateSandbox } from "@/lib/sandbox/storage"
import type { SandboxData } from "@/lib/sandbox/types"
import { ACHIEVEMENTS, checkAchievement } from "./achievements"
import { getRankForXp } from "./ranks"
import { getStreakMultiplier } from "./streaks"
import type { UserProfile, XpEvent } from "./types"

/** Bonus XP for completing a stage on the first attempt */
const FIRST_TRY_BONUS = 15

/** Bonus XP for completing a stage without using any hints */
const NO_HINTS_BONUS = 50

/**
 * Builds a UserProfile from sandbox data for achievement condition checking.
 *
 * @param data - The current sandbox data
 * @returns A UserProfile suitable for checkAchievement()
 */
function buildProfileFromSandbox(data: SandboxData): UserProfile {
  const perfectQuizzes = Object.values(data.missionProgress).reduce(
    (sum, mp) => {
      const stageQuizPerfects = Object.values(mp.stageProgress).filter(
        (sp) => sp.quizScore === 100,
      ).length
      return sum + stageQuizPerfects
    },
    0,
  )

  const completedSideQuests = Object.values(data.missionProgress).reduce(
    (sum, mp) => sum + mp.sideQuestsCompleted.length,
    0,
  )

  return {
    id: "local",
    displayName: "Local User",
    rank: getRankForXp(data.userStats.totalXp),
    totalXp: data.userStats.totalXp,
    achievements: data.achievements,
    streakData: data.streakData,
    completedMissions: Object.entries(data.missionProgress)
      .filter(([, p]) => p.completed)
      .map(([slug]) => slug),
    completedChallenges: Object.entries(data.challengeResults)
      .filter(([, r]) => r.completed)
      .map(([id]) => id),
    perfectQuizzes,
    completedSideQuests,
    createdAt: new Date().toISOString(),
  }
}

/**
 * Checks all achievements against current sandbox state
 * and unlocks any newly earned ones, awarding their XP bonuses.
 *
 * Called automatically after every XP award (stage, mission, challenge).
 */
function checkAndUnlockAchievements(): void {
  const sandbox = loadSandbox()
  if (!sandbox) return

  const profile = buildProfileFromSandbox(sandbox)
  const alreadyUnlocked = new Set(sandbox.achievements)
  const newlyUnlocked: string[] = []
  let bonusXp = 0

  for (const achievement of ACHIEVEMENTS) {
    if (alreadyUnlocked.has(achievement.id)) continue
    if (checkAchievement(achievement.condition, profile)) {
      newlyUnlocked.push(achievement.id)
      bonusXp += achievement.xpBonus
    }
  }

  if (newlyUnlocked.length === 0) return

  updateSandbox((data) => ({
    ...data,
    achievements: [...data.achievements, ...newlyUnlocked],
    userStats: {
      ...data.userStats,
      totalXp: data.userStats.totalXp + bonusXp,
      totalAchievements: data.achievements.length + newlyUnlocked.length,
    },
  }))
}

type StageXpOptions = {
  firstTry?: boolean
  noHints?: boolean
}

/**
 * Awards XP for completing a mission stage.
 * Applies streak multiplier and optional bonuses.
 * Writes stage progress and updated totalXp to sandbox.
 *
 * @param missionId - The mission slug
 * @param stageId - The stage ID within the mission
 * @param baseXp - Base XP reward before multipliers
 * @param options - Optional bonuses (firstTry, noHints)
 * @returns The XpEvent with final computed amount
 */
export function awardStageXp(
  missionId: string,
  stageId: string,
  baseXp: number,
  options?: StageXpOptions,
): XpEvent {
  const sandbox = loadSandbox() ?? initializeSandbox()
  const multiplier = getStreakMultiplier(sandbox.streakData.currentStreak)

  let bonusXp = 0
  if (options?.firstTry) bonusXp += FIRST_TRY_BONUS
  if (options?.noHints) bonusXp += NO_HINTS_BONUS

  const amount = Math.floor((baseXp + bonusXp) * multiplier)

  const event: XpEvent = {
    type: "stage",
    amount,
    multiplier,
    source: `${missionId}/${stageId}`,
    timestamp: new Date().toISOString(),
  }

  updateSandbox((data) => {
    const missionProgress = { ...data.missionProgress }
    const existing = missionProgress[missionId] ?? {
      started: true,
      completed: false,
      stageProgress: {},
      sideQuestsCompleted: [],
      totalXpEarned: 0,
    }

    const stageProgress = { ...existing.stageProgress }
    const existingStage = stageProgress[stageId] ?? {
      completed: false,
      xpEarned: 0,
      codeAttempts: [],
      hintsUsed: 0,
    }

    stageProgress[stageId] = {
      ...existingStage,
      completed: true,
      xpEarned: amount,
      completedAt: event.timestamp,
    }

    missionProgress[missionId] = {
      ...existing,
      started: true,
      stageProgress,
      totalXpEarned: existing.totalXpEarned + amount,
    }

    return {
      ...data,
      missionProgress,
      userStats: {
        ...data.userStats,
        totalXp: data.userStats.totalXp + amount,
      },
    }
  })

  checkAndUnlockAchievements()

  return event
}

/**
 * Awards XP for completing an entire mission.
 * Applies streak multiplier. Marks mission as completed.
 *
 * @param missionId - The mission slug
 * @param baseXp - Mission completion bonus XP
 * @returns The XpEvent with final computed amount
 */
export function awardMissionXp(
  missionId: string,
  baseXp: number,
): XpEvent {
  const sandbox = loadSandbox() ?? initializeSandbox()
  const multiplier = getStreakMultiplier(sandbox.streakData.currentStreak)
  const amount = Math.floor(baseXp * multiplier)

  const event: XpEvent = {
    type: "mission",
    amount,
    multiplier,
    source: missionId,
    timestamp: new Date().toISOString(),
  }

  updateSandbox((data) => {
    const missionProgress = { ...data.missionProgress }
    const existing = missionProgress[missionId] ?? {
      started: true,
      completed: false,
      stageProgress: {},
      sideQuestsCompleted: [],
      totalXpEarned: 0,
    }

    missionProgress[missionId] = {
      ...existing,
      completed: true,
      completedAt: event.timestamp,
      totalXpEarned: existing.totalXpEarned + amount,
    }

    return {
      ...data,
      missionProgress,
      userStats: {
        ...data.userStats,
        totalXp: data.userStats.totalXp + amount,
        totalMissionsCompleted: data.userStats.totalMissionsCompleted + 1,
      },
    }
  })

  checkAndUnlockAchievements()

  return event
}

/**
 * Awards XP for completing a standalone challenge.
 * Applies streak multiplier. Records challenge result.
 *
 * @param challengeId - The challenge identifier
 * @param baseXp - Base XP reward
 * @returns The XpEvent with final computed amount
 */
export function awardChallengeXp(
  challengeId: string,
  baseXp: number,
): XpEvent {
  const sandbox = loadSandbox() ?? initializeSandbox()
  const multiplier = getStreakMultiplier(sandbox.streakData.currentStreak)
  const amount = Math.floor(baseXp * multiplier)

  const event: XpEvent = {
    type: "challenge",
    amount,
    multiplier,
    source: challengeId,
    timestamp: new Date().toISOString(),
  }

  updateSandbox((data) => {
    const challengeResults = { ...data.challengeResults }
    const existing = challengeResults[challengeId]

    challengeResults[challengeId] = {
      attempted: true,
      completed: true,
      xpEarned: amount,
      hintsUsed: existing?.hintsUsed ?? 0,
      attempts: (existing?.attempts ?? 0) + 1,
      completedAt: event.timestamp,
    }

    return {
      ...data,
      challengeResults,
      userStats: {
        ...data.userStats,
        totalXp: data.userStats.totalXp + amount,
        totalChallengesCompleted: data.userStats.totalChallengesCompleted + 1,
      },
    }
  })

  checkAndUnlockAchievements()

  return event
}
