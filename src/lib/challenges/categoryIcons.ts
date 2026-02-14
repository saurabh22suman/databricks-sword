import type { ChallengeCategory } from "./types"

/**
 * Maps challenge categories to their SVG icon paths in /public/icons/.
 */
export const CATEGORY_ICON_MAP: Record<ChallengeCategory, string> = {
  pyspark: "/icons/cat-pyspark.png",
  sql: "/icons/cat-sql.png",
  "delta-lake": "/icons/cat-delta-lake.png",
  streaming: "/icons/cat-streaming.png",
  mlflow: "/icons/cat-mlflow.png",
  "unity-catalog": "/icons/cat-unity-catalog.png",
  architecture: "/icons/cat-architecture.png",
} as const

/**
 * Returns the icon path for a given challenge category.
 */
export function getCategoryIconPath(category: ChallengeCategory): string {
  return CATEGORY_ICON_MAP[category]
}
