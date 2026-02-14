import fs from "fs"
import path from "path"
import type { Challenge, ChallengeCategory, ValidationResult } from "./types"
import { ChallengeSchema } from "./types"

/**
 * Challenge Loader
 *
 * Auto-discovery and loading of challenge content from src/content/challenges/.
 * Validates all challenge data with Zod schemas.
 */

/**
 * Base path to challenge content directory.
 */
const CHALLENGES_DIR = path.join(process.cwd(), "src", "content", "challenges")

/**
 * Difficulty sort order.
 */
const DIFFICULTY_ORDER: Record<string, number> = {
  B: 1,
  A: 2,
  S: 3,
}

/**
 * Discovers all category directories in the challenges folder.
 *
 * @returns Array of category directory names
 */
function getCategoryDirectories(): string[] {
  try {
    const entries = fs.readdirSync(CHALLENGES_DIR, { withFileTypes: true })
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  } catch {
    return []
  }
}

/**
 * Loads a single challenge from a JSON file.
 *
 * @param filePath - Absolute path to the challenge JSON file
 * @returns Validated Challenge or null if invalid
 */
function loadChallengeFile(filePath: string): Challenge | null {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8")
    const parsed = JSON.parse(fileContent)
    const validated = ChallengeSchema.parse(parsed)
    return validated as Challenge
  } catch (error) {
    console.error(`Failed to load challenge ${filePath}:`, error)
    return null
  }
}

/**
 * Loads all challenges from the content directory.
 * Sorts by category then by difficulty (B → A → S).
 *
 * @returns Array of all valid challenges
 *
 * @example
 * ```ts
 * const challenges = await getAllChallenges()
 * ```
 */
export async function getAllChallenges(): Promise<Challenge[]> {
  const categories = getCategoryDirectories()
  const challenges: Challenge[] = []

  for (const category of categories) {
    const categoryDir = path.join(CHALLENGES_DIR, category)
    let files: string[]

    try {
      files = fs.readdirSync(categoryDir) as unknown as string[]
    } catch {
      continue
    }

    for (const file of files) {
      if (typeof file !== "string" || !file.endsWith(".json")) continue

      const filePath = path.join(categoryDir, file)
      const challenge = loadChallengeFile(filePath)
      if (challenge) {
        challenges.push(challenge)
      }
    }
  }

  // Sort by category, then by difficulty
  challenges.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category)
    }
    return (DIFFICULTY_ORDER[a.difficulty] ?? 0) - (DIFFICULTY_ORDER[b.difficulty] ?? 0)
  })

  return challenges
}

/**
 * Filters challenges by category.
 *
 * @param category - Category to filter by
 * @returns Challenges matching the category
 *
 * @example
 * ```ts
 * const pysparkChallenges = await getChallengesByCategory('pyspark')
 * ```
 */
export async function getChallengesByCategory(
  category: ChallengeCategory
): Promise<Challenge[]> {
  const allChallenges = await getAllChallenges()
  return allChallenges.filter((c) => c.category === category)
}

/**
 * Loads a single challenge by its ID.
 *
 * @param id - Challenge ID
 * @returns Challenge or null if not found
 *
 * @example
 * ```ts
 * const challenge = await getChallenge('dd-pyspark-001')
 * ```
 */
export async function getChallenge(id: string): Promise<Challenge | null> {
  const allChallenges = await getAllChallenges()
  return allChallenges.find((c) => c.id === id) ?? null
}

/**
 * Validates a user's response to a challenge.
 *
 * @param challenge - The challenge being attempted
 * @param response - The user's response (format-specific)
 * @returns Validation result with score and feedback
 *
 * @example
 * ```ts
 * const result = validateChallengeResponse(challenge, { order: ['b1', 'b2'] })
 * ```
 */
export function validateChallengeResponse(
  challenge: Challenge,
  response: Record<string, unknown>
): ValidationResult {
  switch (challenge.format) {
    case "drag-drop":
      return validateDragDrop(challenge, response)
    case "fill-blank":
      return validateFillBlank(challenge, response)
    case "free-text":
      return validateFreeText(challenge, response)
    default:
      return {
        isValid: false,
        score: 0,
        maxScore: 100,
        details: ["Unknown challenge format"],
      }
  }
}

/**
 * Validates a drag-drop response by comparing order of blocks.
 */
function validateDragDrop(
  challenge: Challenge,
  response: Record<string, unknown>
): ValidationResult {
  const userOrder = response.order as string[] | undefined
  const correctOrder = challenge.dragDrop?.correctOrder

  if (!userOrder || !correctOrder) {
    return { isValid: false, score: 0, maxScore: 100, details: ["Missing response or config"] }
  }

  const maxScore = correctOrder.length
  let correctCount = 0

  for (let i = 0; i < correctOrder.length; i++) {
    if (userOrder[i] === correctOrder[i]) {
      correctCount++
    }
  }

  const score = Math.round((correctCount / maxScore) * 100)
  const isValid = correctCount === maxScore

  return {
    isValid,
    score,
    maxScore: 100,
    details: isValid
      ? ["All blocks in correct order"]
      : [`${correctCount}/${maxScore} blocks in correct position`],
  }
}

/**
 * Validates fill-blank responses by checking each blank answer.
 */
function validateFillBlank(
  challenge: Challenge,
  response: Record<string, unknown>
): ValidationResult {
  const userAnswers = response.answers as Record<string, string> | undefined
  const blanks = challenge.fillBlank?.blanks

  if (!userAnswers || !blanks) {
    return { isValid: false, score: 0, maxScore: 100, details: ["Missing response or config"] }
  }

  const maxScore = blanks.length
  let correctCount = 0
  const details: string[] = []

  for (const blank of blanks) {
    const userAnswer = userAnswers[String(blank.id)]
    if (userAnswer === blank.correctAnswer) {
      correctCount++
    } else {
      details.push(`Blank ${blank.id}: expected "${blank.correctAnswer}", got "${userAnswer ?? ""}"`)
    }
  }

  const score = Math.round((correctCount / maxScore) * 100)
  const isValid = correctCount === maxScore

  if (isValid) {
    details.push("All blanks filled correctly")
  }

  return { isValid, score, maxScore: 100, details }
}

/**
 * Validates free-text response by matching against expected regex pattern.
 */
function validateFreeText(
  challenge: Challenge,
  response: Record<string, unknown>
): ValidationResult {
  const userCode = response.code as string | undefined
  const expectedPattern = challenge.freeText?.expectedPattern

  if (!userCode || !expectedPattern) {
    return { isValid: false, score: 0, maxScore: 100, details: ["Missing response or config"] }
  }

  try {
    const regex = new RegExp(expectedPattern)
    const isValid = regex.test(userCode)

    return {
      isValid,
      score: isValid ? 100 : 0,
      maxScore: 100,
      details: isValid
        ? ["Code matches expected pattern"]
        : ["Code does not match expected pattern"],
    }
  } catch {
    return {
      isValid: false,
      score: 0,
      maxScore: 100,
      details: ["Invalid expected pattern in challenge config"],
    }
  }
}
