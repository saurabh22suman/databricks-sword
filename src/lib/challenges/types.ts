import { z } from "zod"

/**
 * Challenge Library Types
 *
 * Standalone challenges for drilling specific Databricks skills.
 * Each challenge is self-contained with its own format, validation, and hints.
 */

/**
 * Challenge category — topic area.
 */
export type ChallengeCategory =
  | "pyspark"
  | "sql"
  | "delta-lake"
  | "streaming"
  | "mlflow"
  | "unity-catalog"
  | "architecture"

export const ChallengeCategorySchema = z.enum([
  "pyspark",
  "sql",
  "delta-lake",
  "streaming",
  "mlflow",
  "unity-catalog",
  "architecture",
])

/**
 * Challenge difficulty rank.
 * B = Beginner, A = Intermediate, S = Advanced
 */
export type ChallengeDifficulty = "B" | "A" | "S"

export const ChallengeDifficultySchema = z.enum(["B", "A", "S"])

/**
 * Challenge format — determines the UI component used.
 */
export type ChallengeFormat = "drag-drop" | "fill-blank" | "free-text"

export const ChallengeFormatSchema = z.enum(["drag-drop", "fill-blank", "free-text"])

/**
 * Code block for drag-drop challenges.
 */
export type ChallengeCodeBlock = {
  readonly id: string
  readonly code: string
  readonly label?: string
}

export const ChallengeCodeBlockSchema = z.object({
  id: z.string(),
  code: z.string(),
  label: z.string().optional(),
})

/**
 * Blank to fill in fill-blank challenges.
 */
export type ChallengeBlank = {
  readonly id: number
  readonly correctAnswer: string
  readonly options: readonly string[]
}

export const ChallengeBlankSchema = z.object({
  id: z.number().nonnegative().int(),
  correctAnswer: z.string(),
  options: z.array(z.string()).min(2),
})

/**
 * Format-specific configuration for drag-drop challenges.
 */
export type DragDropChallengeData = {
  readonly blocks: readonly ChallengeCodeBlock[]
  readonly correctOrder: readonly string[]
}

export const DragDropChallengeDataSchema = z.object({
  blocks: z.array(ChallengeCodeBlockSchema).min(2),
  correctOrder: z.array(z.string()),
})

/**
 * Format-specific configuration for fill-blank challenges.
 */
export type FillBlankChallengeData = {
  readonly codeTemplate: string
  readonly blanks: readonly ChallengeBlank[]
}

export const FillBlankChallengeDataSchema = z.object({
  codeTemplate: z.string(),
  blanks: z.array(ChallengeBlankSchema).min(1),
})

/**
 * Format-specific configuration for free-text challenges.
 */
export type FreeTextChallengeData = {
  readonly starterCode: string
  readonly expectedPattern: string
  readonly simulatedOutput: string
}

export const FreeTextChallengeDataSchema = z.object({
  starterCode: z.string(),
  expectedPattern: z.string(),
  simulatedOutput: z.string(),
})

/**
 * Complete challenge definition.
 */
export type Challenge = {
  readonly id: string
  readonly title: string
  readonly category: ChallengeCategory
  readonly difficulty: ChallengeDifficulty
  readonly format: ChallengeFormat
  readonly description: string
  readonly hints: readonly string[]
  readonly xpReward: number
  readonly optimalSolution: string
  readonly explanation: string
  // Format-specific data (exactly one must be present based on format)
  readonly dragDrop?: DragDropChallengeData
  readonly fillBlank?: FillBlankChallengeData
  readonly freeText?: FreeTextChallengeData
}

export const ChallengeSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    category: ChallengeCategorySchema,
    difficulty: ChallengeDifficultySchema,
    format: ChallengeFormatSchema,
    description: z.string(),
    hints: z.array(z.string()),
    xpReward: z.number().nonnegative(),
    optimalSolution: z.string(),
    explanation: z.string(),
    dragDrop: DragDropChallengeDataSchema.optional(),
    fillBlank: FillBlankChallengeDataSchema.optional(),
    freeText: FreeTextChallengeDataSchema.optional(),
  })
  .refine(
    (data) => {
      // Ensure the correct format-specific data is present
      switch (data.format) {
        case "drag-drop":
          return data.dragDrop !== undefined
        case "fill-blank":
          return data.fillBlank !== undefined
        case "free-text":
          return data.freeText !== undefined
        default:
          return false
      }
    },
    {
      message:
        "Challenge must include format-specific data matching the format field (dragDrop, fillBlank, or freeText)",
    }
  )

/**
 * Result from validating a challenge response.
 */
export type ChallengeResult = {
  readonly correct: boolean
  readonly score: number
  readonly maxScore: number
  readonly feedback: string
  readonly xpAwarded: number
}

/**
 * Validation result from checking a user's answer.
 */
export type ValidationResult = {
  readonly isValid: boolean
  readonly score: number
  readonly maxScore: number
  readonly details: readonly string[]
}
