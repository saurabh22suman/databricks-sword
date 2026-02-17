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
    scenario: "URGENT: MegaMart's Black Friday is in 48 hours and their data pipeline just crashed. The previous data engineer quit abruptly, leaving behind half-finished notebooks and broken Delta tables. Customer purchase patterns are invisible, inventory alerts are silent, and the recommendation engine is dead. Your mission: restore the medallion architecture, fix the broken transformations, and get real-time analytics back online before the biggest shopping day of the year.",
    objectives: [
      "Restore raw transaction ingestion to Bronze layer",
      "Fix broken PII masking in Silver transformations",
      "Rebuild customer 360 aggregations in Gold layer",
      "Enable real-time inventory alerts with Structured Streaming",
      "Pass all 5 validation queries with 100% accuracy",
    ],
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
    scenario: "CRISIS at NeonQuest Studios: Their flagship MMO 'Cyber Realms' is hemorrhaging players—retention dropped 40% this month. The analytics team suspects a bug in the matchmaking algorithm is creating unfair matches, but the event pipeline is a mess of JSON chaos. Player rage-quits are spiking, in-app purchases have flatlined, and the CEO wants answers. Your mission: untangle the event streams, build player behavior models, and identify exactly where the fun is breaking.",
    objectives: [
      "Parse complex nested JSON game events into Bronze",
      "Build player session aggregations in Silver layer",
      "Create churn prediction feature tables in Gold",
      "Implement real-time matchmaking quality metrics",
      "Identify the top 3 player pain points from the data",
    ],
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
    scenario: "CODE RED at Mercy General Hospital Network: A ransomware attack corrupted their legacy EHR system, and while backups exist, they're spread across 12 different formats from 3 different vendors. Patient care is compromised—doctors can't see medication histories, allergies are missing from charts, and duplicate patient records are causing dangerous confusion. HIPAA auditors arrive in 2 weeks. Your mission: unify the chaos into a compliant, queryable patient 360 view.",
    objectives: [
      "Ingest HL7, FHIR, and CSV patient records to Bronze",
      "Implement HIPAA-compliant PII tokenization in Silver",
      "Build unified Patient 360 view in Gold layer",
      "Create medication interaction alert system",
      "Pass HIPAA compliance validation checks",
    ],
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
    scenario: "ALERT: SwiftPay just got hit with a $2.3M fraud ring operating across 15 countries. Their rule-based detection system is useless—fraudsters adapted within hours. Legitimate customers are getting blocked while criminals slip through. The board is furious, regulators are circling, and chargebacks are eating profits alive. Your mission: build a real-time ML-powered fraud detection pipeline that can catch sophisticated attacks without blocking good customers.",
    objectives: [
      "Stream transaction events into Bronze with <100ms latency",
      "Engineer fraud detection features in Silver layer",
      "Deploy ML model scoring pipeline in Gold",
      "Implement real-time alerting for high-risk transactions",
      "Achieve 95% fraud detection with <1% false positive rate",
    ],
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
    scenario: "RECALL CRISIS: TurboMotors just discovered that 50,000 vehicles have a potentially dangerous battery thermal issue—but only under specific driving conditions. They're drowning in 10TB/day of IoT telemetry from sensors worldwide, but can't identify which vehicles are actually at risk. A full recall costs $500M; a targeted recall costs $50M. Your mission: build a predictive maintenance system that can pinpoint exactly which vehicles need immediate attention.",
    objectives: [
      "Ingest high-velocity IoT sensor streams to Bronze",
      "Build vehicle health scoring in Silver layer",
      "Create predictive failure models in Gold with Feature Store",
      "Implement geofenced alerting for at-risk vehicles",
      "Identify the 847 vehicles requiring immediate recall",
    ],
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
    scenario: "PRODUCTION HALT: PrecisionTech's semiconductor fab is producing 23% defective chips—triple the acceptable rate. The $2B factory is bleeding money every hour it runs. Quality engineers are baffled; the defects seem random but the pattern must be hidden in the sensor data. 847 parameters per wafer, 10,000 wafers per day, and somewhere in that tsunami of data is the answer. Your mission: build a quality prediction system using DLT and Feature Store to catch defects before they happen.",
    objectives: [
      "Ingest manufacturing sensor data with DLT to Bronze",
      "Build quality metrics and anomaly detection in Silver",
      "Create defect prediction features in Feature Store",
      "Implement real-time quality scoring in Gold layer",
      "Identify root cause of the 23% defect rate",
    ],
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
    scenario: "NETWORK MELTDOWN: MegaCell's 5G network is experiencing mysterious outages affecting 2 million subscribers. Customer complaints are through the roof, but the NOC team can't find a pattern—towers go down randomly, then recover. Competitors are poaching frustrated customers daily. The CEO suspects a cascading failure pattern but needs proof. Your mission: build a network intelligence platform that can predict outages before they happen and identify the root cause.",
    objectives: [
      "Stream cell tower metrics from 50,000 towers to Bronze",
      "Build network topology graphs in Silver layer",
      "Create cascade failure prediction in Gold layer",
      "Implement proactive maintenance alerting system",
      "Identify the 3 towers causing cascade failures",
    ],
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
    scenario: "HARVEST CRISIS: GreenHarvest Farms manages 500,000 acres across 3 states, and this year's drought is threatening to wipe out 40% of projected yield—a $200M loss. But satellite imagery, soil sensors, and weather data suggest some fields could still be saved with precision irrigation. The catch: water is rationed, and they can only save half the at-risk fields. Your mission: build a crop yield prediction system that identifies exactly which fields to prioritize for maximum harvest.",
    objectives: [
      "Ingest satellite imagery and IoT sensor data to Bronze",
      "Build field health indices in Silver layer",
      "Create yield prediction models in Gold with MLflow",
      "Implement precision irrigation recommendations",
      "Maximize predicted yield within water budget constraints",
    ],
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
