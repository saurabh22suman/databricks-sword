/**
 * Field Operations Industries Configuration
 * Defines metadata and unlock requirements for all 8 industries.
 */

import type { Industry, IndustryConfig } from "./types"

/**
 * Industry configurations with progressive XP requirements.
 * Unlocked from Retail (easiest) to AgriTech (hardest).
 */
export const INDUSTRY_CONFIGS: Record<Industry, IndustryConfig> = {
  retail: {
    industry: "retail",
    emoji: "🛒",
    title: "Retail Analytics",
    description: "Inventory optimization and sales forecasting for e-commerce",
    xpRequired: 1000,
    xpReward: 700,
    estimatedMinutes: 45,
    schemas: ["bronze", "silver", "gold"],
  },
  gaming: {
    industry: "gaming",
    emoji: "🎮",
    title: "Gaming Analytics",
    description: "Player behavior tracking and retention analysis",
    xpRequired: 2000,
    xpReward: 800,
    estimatedMinutes: 50,
    schemas: ["bronze", "silver", "gold"],
  },
  healthcare: {
    industry: "healthcare",
    emoji: "🏥",
    title: "Healthcare Data Platform",
    description: "EHR data standardization and patient 360 views",
    xpRequired: 5000,
    xpReward: 1100,
    estimatedMinutes: 60,
    schemas: ["bronze", "silver", "gold"],
  },
  fintech: {
    industry: "fintech",
    emoji: "💳",
    title: "FinTech Fraud Detection",
    description: "Real-time transaction monitoring and fraud alerting",
    xpRequired: 8000,
    xpReward: 1300,
    estimatedMinutes: 55,
    schemas: ["bronze", "silver", "gold"],
  },
  automotive: {
    industry: "automotive",
    emoji: "🚗",
    title: "Automotive IoT Platform",
    description: "Vehicle telemetry processing and predictive maintenance",
    xpRequired: 12000,
    xpReward: 1200,
    estimatedMinutes: 65,
    schemas: ["bronze", "silver", "gold"],
  },
  manufacturing: {
    industry: "manufacturing",
    emoji: "🏭",
    title: "Manufacturing Intelligence",
    description: "Quality prediction with DLT and Feature Store",
    xpRequired: 15000,
    xpReward: 1600,
    estimatedMinutes: 70,
    schemas: ["bronze", "silver", "gold"],
  },
  telecom: {
    industry: "telecom",
    emoji: "📡",
    title: "Telecom Network Analytics",
    description: "Cell tower monitoring and service degradation detection",
    xpRequired: 20000,
    xpReward: 1800,
    estimatedMinutes: 75,
    schemas: ["bronze", "silver", "gold"],
  },
  agritech: {
    industry: "agritech",
    emoji: "🌾",
    title: "AgriTech Data Science",
    description: "Crop yield prediction and precision agriculture",
    xpRequired: 25000,
    xpReward: 2000,
    estimatedMinutes: 80,
    schemas: ["bronze", "silver", "gold"],
  },
}

/**
 * Get configuration for a specific industry.
 */
export function getIndustryConfig(industry: Industry): IndustryConfig {
  return INDUSTRY_CONFIGS[industry]
}

/**
 * Check if an industry is unlocked for a user based on their XP.
 */
export function isIndustryUnlocked(industry: Industry, userXp: number): boolean {
  const config = INDUSTRY_CONFIGS[industry]
  return userXp >= config.xpRequired
}

/**
 * Get all industries sorted by XP requirement.
 */
export function getAllIndustries(): IndustryConfig[] {
  return Object.values(INDUSTRY_CONFIGS).sort(
    (a, b) => a.xpRequired - b.xpRequired
  )
}

/**
 * Get the next locked industry for a user.
 */
export function getNextLockedIndustry(userXp: number): IndustryConfig | null {
  const sorted = getAllIndustries()
  const next = sorted.find((config) => userXp < config.xpRequired)
  return next || null
}

/**
 * Get unlock progress for an industry (0-100).
 */
export function getUnlockProgress(industry: Industry, userXp: number): number {
  const config = INDUSTRY_CONFIGS[industry]
  
  // Already unlocked
  if (userXp >= config.xpRequired) {
    return 100
  }
  
  // Find previous industry for baseline
  const sorted = getAllIndustries()
  const currentIndex = sorted.findIndex((c) => c.industry === industry)
  
  if (currentIndex === 0) {
    // First industry - progress from 0
    return Math.min(100, (userXp / config.xpRequired) * 100)
  }
  
  const prevRequired = sorted[currentIndex - 1].xpRequired
  const xpRange = config.xpRequired - prevRequired
  const xpProgress = userXp - prevRequired
  
  return Math.max(0, Math.min(100, (xpProgress / xpRange) * 100))
}
