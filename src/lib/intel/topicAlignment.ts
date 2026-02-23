import type { Challenge, ChallengeCategory } from "@/lib/challenges"

/**
 * Baseline Intel topics that must have challenge coverage at runtime.
 * This list is intentionally fixed and does not expand automatically
 * with future admin-added Intel categories.
 */
export const REQUIRED_INTEL_BASELINE_TOPICS = [
  "delta-lake",
  "pyspark",
  "sql",
  "mlflow",
  "architecture",
] as const

export type RequiredIntelBaselineTopic = (typeof REQUIRED_INTEL_BASELINE_TOPICS)[number]

/**
 * Intel topic → challenge category mapping.
 * Baseline is 1:1 today but kept explicit for future divergence.
 */
export const REQUIRED_INTEL_TOPIC_TO_CHALLENGE_CATEGORY: Record<
  RequiredIntelBaselineTopic,
  ChallengeCategory
> = {
  "delta-lake": "delta-lake",
  pyspark: "pyspark",
  sql: "sql",
  mlflow: "mlflow",
  architecture: "architecture",
}

export const REQUIRED_INTEL_TOPIC_LABELS: Record<RequiredIntelBaselineTopic, string> = {
  "delta-lake": "Delta Lake",
  pyspark: "PySpark",
  sql: "SQL",
  mlflow: "MLflow",
  architecture: "Architecture",
}

export type IntelTopicCoverage = {
  countsByCategory: Partial<Record<ChallengeCategory, number>>
  missingBaselineTopics: RequiredIntelBaselineTopic[]
}

/**
 * Counts how many challenges exist for each challenge category.
 */
export function countChallengeCoverageByCategory(
  challenges: readonly Pick<Challenge, "category">[]
): Partial<Record<ChallengeCategory, number>> {
  const countsByCategory: Partial<Record<ChallengeCategory, number>> = {}

  for (const challenge of challenges) {
    countsByCategory[challenge.category] = (countsByCategory[challenge.category] ?? 0) + 1
  }

  return countsByCategory
}

function isRequiredIntelBaselineTopic(topic: string): topic is RequiredIntelBaselineTopic {
  return Object.hasOwn(REQUIRED_INTEL_TOPIC_TO_CHALLENGE_CATEGORY, topic)
}

/**
 * Maps an Intel topic slug to a challenge category when that topic is
 * part of the required baseline. Non-baseline topics return null.
 */
export function getChallengeCategoryForIntelTopic(topic: string): ChallengeCategory | null {
  if (!isRequiredIntelBaselineTopic(topic)) {
    return null
  }

  return REQUIRED_INTEL_TOPIC_TO_CHALLENGE_CATEGORY[topic]
}

/**
 * Computes baseline Intel topic coverage from available challenges.
 */
export function getIntelTopicCoverage(
  challenges: readonly Pick<Challenge, "category">[]
): IntelTopicCoverage {
  const countsByCategory = countChallengeCoverageByCategory(challenges)

  const missingBaselineTopics = REQUIRED_INTEL_BASELINE_TOPICS.filter(
    (topic) => (countsByCategory[REQUIRED_INTEL_TOPIC_TO_CHALLENGE_CATEGORY[topic]] ?? 0) === 0
  )

  return {
    countsByCategory,
    missingBaselineTopics,
  }
}
