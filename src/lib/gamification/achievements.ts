import { RANKS } from "./ranks"
import type { Achievement, AchievementCondition, UserProfile } from "./types"

/**
 * Achievement System Implementation
 * 
 * Defines ~20 achievements with unlock conditions and helper functions.
 * Categories: First Steps, Mastery, Consistency, Progression, Exploration
 */

/**
 * All available achievements in the gamification system.
 * Each achievement has unlock conditions and awards bonus XP.
 */
export const ACHIEVEMENTS: readonly Achievement[] = [
  // ============================================================================
  // First Steps
  // ============================================================================
  {
    id: "first-blood",
    title: "First Blood",
    description: "Complete your first mission",
    icon: "sword",
    xpBonus: 75,
    condition: { type: "mission-complete", count: 1 },
  },
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Complete your first challenge",
    icon: "flag",
    xpBonus: 35,
    condition: { type: "challenge-complete", count: 1 },
  },

  // ============================================================================
  // Mission Mastery
  // ============================================================================
  {
    id: "mission-clear",
    title: "Mission Clear",
    description: "Complete 5 missions",
    icon: "target",
    xpBonus: 150,
    condition: { type: "mission-complete", count: 5 },
  },
  {
    id: "s-rank-clear",
    title: "S-Rank Clear",
    description: "Complete 10 missions",
    icon: "star",
    xpBonus: 275,
    condition: { type: "mission-complete", count: 10 },
  },
  {
    id: "mission-master",
    title: "Mission Master",
    description: "Complete all 20 missions",
    icon: "crown",
    xpBonus: 750,
    condition: { type: "mission-complete", count: 20 },
  },

  // ============================================================================
  // Challenge Mastery
  // ============================================================================
  {
    id: "challenge-hunter",
    title: "Challenge Hunter",
    description: "Complete 10 challenges",
    icon: "compass",
    xpBonus: 200,
    condition: { type: "challenge-complete", count: 10 },
  },
  {
    id: "challenge-master",
    title: "Challenge Master",
    description: "Complete 25 challenges",
    icon: "trophy",
    xpBonus: 400,
    condition: { type: "challenge-complete", count: 25 },
  },
  {
    id: "challenge-legend",
    title: "Challenge Legend",
    description: "Complete 50 challenges",
    icon: "diamond",
    xpBonus: 800,
    condition: { type: "challenge-complete", count: 50 },
  },

  // ============================================================================
  // Category Specialists
  // ============================================================================
  {
    id: "pyspark-specialist",
    title: "PySpark Specialist",
    description: "Complete 10 PySpark challenges",
    icon: "spark",
    xpBonus: 275,
    condition: { type: "challenge-complete", category: "pyspark", count: 10 },
  },
  {
    id: "sql-wizard",
    title: "SQL Wizard",
    description: "Complete 10 SQL challenges",
    icon: "database",
    xpBonus: 275,
    condition: { type: "challenge-complete", category: "sql", count: 10 },
  },
  {
    id: "delta-devotee",
    title: "Delta Devotee",
    description: "Complete 10 Delta Lake challenges",
    icon: "delta",
    xpBonus: 275,
    condition: { type: "challenge-complete", category: "delta-lake", count: 10 },
  },
  {
    id: "streaming-sage",
    title: "Streaming Sage",
    description: "Complete 10 Streaming challenges",
    icon: "stream",
    xpBonus: 275,
    condition: { type: "challenge-complete", category: "streaming", count: 10 },
  },

  // ============================================================================
  // Consistency & Streaks
  // ============================================================================
  {
    id: "streak-7",
    title: "Week Warrior",
    description: "Maintain a 7-day learning streak",
    icon: "fire",
    xpBonus: 150,
    condition: { type: "streak", days: 7 },
  },
  {
    id: "streak-30",
    title: "Month Master",
    description: "Maintain a 30-day learning streak",
    icon: "flame",
    xpBonus: 400,
    condition: { type: "streak", days: 30 },
  },
  {
    id: "streak-100",
    title: "Century Club",
    description: "Maintain a 100-day learning streak",
    icon: "infinity",
    xpBonus: 1300,
    condition: { type: "streak", days: 100 },
  },

  // ============================================================================
  // Rank Progression
  // ============================================================================
  {
    id: "operative",
    title: "Operative",
    description: "Reach Operative rank",
    icon: "badge-operative",
    xpBonus: 150,
    condition: { type: "rank-reached", rankId: "operative" },
  },
  {
    id: "commander",
    title: "Commander",
    description: "Reach Commander rank",
    icon: "badge-commander",
    xpBonus: 275,
    condition: { type: "rank-reached", rankId: "commander" },
  },
  {
    id: "architect",
    title: "Architect",
    description: "Reach Architect rank",
    icon: "badge-architect",
    xpBonus: 650,
    condition: { type: "rank-reached", rankId: "architect" },
  },
  {
    id: "grandmaster",
    title: "Grandmaster",
    description: "Reach Grandmaster rank (max level)",
    icon: "badge-grandmaster",
    xpBonus: 1300,
    condition: { type: "rank-reached", rankId: "grandmaster" },
  },

  // ============================================================================
  // Exploration
  // ============================================================================
  {
    id: "oss-explorer",
    title: "OSS Explorer",
    description: "Complete 5 side quests (OSS deep dives)",
    icon: "book",
    xpBonus: 325,
    condition: { type: "side-quest-complete", count: 5 },
  },
  {
    id: "oss-scholar",
    title: "OSS Scholar",
    description: "Complete 10 side quests (OSS deep dives)",
    icon: "scroll",
    xpBonus: 650,
    condition: { type: "side-quest-complete", count: 10 },
  },

  // ============================================================================
  // Field Ops Industry Mastery
  // ============================================================================
  {
    id: "field-ops-retail",
    title: "Retail Analytics Expert",
    description: "Complete the Retail Analytics Field Ops deployment",
    icon: "shopping-cart",
    xpBonus: 500,
    condition: { type: "field-ops-complete", industry: "retail" },
  },
  {
    id: "field-ops-gaming",
    title: "Gaming Analytics Engineer",
    description: "Complete the Gaming Analytics Field Ops deployment",
    icon: "gamepad",
    xpBonus: 500,
    condition: { type: "field-ops-complete", industry: "gaming" },
  },
  {
    id: "field-ops-healthcare",
    title: "Healthcare Data Architect",
    description: "Complete the Healthcare EHR Field Ops deployment",
    icon: "heart-pulse",
    xpBonus: 600,
    condition: { type: "field-ops-complete", industry: "healthcare" },
  },
  {
    id: "field-ops-fintech",
    title: "FinTech Security Specialist",
    description: "Complete the FinTech Fraud Detection Field Ops deployment",
    icon: "shield-check",
    xpBonus: 600,
    condition: { type: "field-ops-complete", industry: "fintech" },
  },
  {
    id: "field-ops-automotive",
    title: "Automotive IoT Architect",
    description: "Complete the Automotive IoT Field Ops deployment",
    icon: "car",
    xpBonus: 550,
    condition: { type: "field-ops-complete", industry: "automotive" },
  },
  {
    id: "field-ops-manufacturing",
    title: "Manufacturing Intelligence",
    description: "Complete the Smart Factory Field Ops deployment",
    icon: "factory",
    xpBonus: 650,
    condition: { type: "field-ops-complete", industry: "manufacturing" },
  },
  {
    id: "field-ops-telecom",
    title: "Telecom Network Analyst",
    description: "Complete the Network Operations Field Ops deployment",
    icon: "antenna",
    xpBonus: 625,
    condition: { type: "field-ops-complete", industry: "telecom" },
  },
  {
    id: "field-ops-agritech",
    title: "AgriTech Data Scientist",
    description: "Complete the Precision Agriculture Field Ops deployment",
    icon: "leaf",
    xpBonus: 750,
    condition: { type: "field-ops-complete", industry: "agritech" },
  },
] as const

/**
 * Checks if an achievement condition is met for a given user profile.
 * 
 * @param condition - The achievement unlock condition to check
 * @param profile - The user's profile data
 * @returns True if the condition is satisfied, false otherwise
 */
export function checkAchievement(
  condition: AchievementCondition,
  profile: UserProfile,
): boolean {
  switch (condition.type) {
    case "mission-complete": {
      if (condition.missionId) {
        // Check for specific mission completion
        return profile.completedMissions.includes(condition.missionId)
      }
      // Check for mission count
      const count = condition.count ?? 1
      return profile.completedMissions.length >= count
    }

    case "quiz-perfect": {
      const requiredCount = condition.count ?? 1
      return (profile.perfectQuizzes ?? 0) >= requiredCount
    }

    case "streak": {
      return profile.streakData.currentStreak >= condition.days
    }

    case "rank-reached": {
      const targetRankIndex = RANKS.findIndex((r) => r.id === condition.rankId)
      const currentRankIndex = RANKS.findIndex((r) => r.id === profile.rank.id)
      return currentRankIndex >= targetRankIndex
    }

    case "side-quest-complete": {
      return (profile.completedSideQuests ?? 0) >= condition.count
    }

    case "challenge-complete": {
      if (condition.category) {
        // Check for category-specific challenges
        const categoryCount = profile.completedChallenges.filter((id) =>
          id.startsWith(condition.category!),
        ).length
        return categoryCount >= condition.count
      }
      // Check for total challenge count
      return profile.completedChallenges.length >= condition.count
    }

    case "field-ops-complete": {
      // Check if the specific industry Field Ops deployment is completed
      return (profile.completedFieldOps ?? []).includes(condition.industry)
    }

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = condition
      return false
    }
  }
}

/**
 * Returns all achievements that the user has unlocked.
 * 
 * @param profile - The user's profile data
 * @returns Array of unlocked achievements
 */
export function getUnlockedAchievements(profile: UserProfile): Achievement[] {
  return ACHIEVEMENTS.filter((achievement) =>
    checkAchievement(achievement.condition, profile),
  )
}

/**
 * Returns all achievements that the user has NOT unlocked yet.
 * 
 * @param profile - The user's profile data
 * @returns Array of locked achievements
 */
export function getLockedAchievements(profile: UserProfile): Achievement[] {
  return ACHIEVEMENTS.filter(
    (achievement) => !checkAchievement(achievement.condition, profile),
  )
}
