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

type ChallengeCacheEntry = {
  expiresAt: number
  challenges: Challenge[]
}

const CHALLENGE_CACHE_TTL_MS = 30_000
let challengeCache: ChallengeCacheEntry | null = null
const isTestRuntime = process.env.NODE_ENV === "test"

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
    const reason = error instanceof Error ? error.message : String(error)
    console.warn("[challenges-loader] skipped invalid challenge", {
      filePath,
      reason,
    })
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
  if (!isTestRuntime && challengeCache && challengeCache.expiresAt > Date.now()) {
    return challengeCache.challenges
  }

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

  if (!isTestRuntime) {
    challengeCache = {
      expiresAt: Date.now() + CHALLENGE_CACHE_TTL_MS,
      challenges,
    }
  }

  return challenges
}

/**
 * Clears the in-memory challenge cache.
 */
export function clearChallengeCache(): void {
  challengeCache = null
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

  // Timeout wrapper to prevent catastrophic backtracking
  const REGEX_TIMEOUT_MS = 1000
  const isSafeRegex = (pattern: string): boolean => {
    // Reject any pattern with a quantified group repeated by another quantifier.
    // This is the canonical ReDoS structure: (X+)+, (X*)+, (X+)*, etc.
    // where X is any sub-pattern (even a single char like 'a').
    // e.g. (a+)+$, (.*)+, (.+)*, ([^]+)+
    const nestedQuantifierPattern = /\([^)]+[+*?]\)[+*?]/
    if (nestedQuantifierPattern.test(pattern)) {
      return false
    }

    // Reject the most egregious dot-star patterns (non-char-class versions)
    const absoluteBlocklist = [
      /\(\.\*\)\+/,    // (.*)+
      /\(\.\+\)\+/,    // (.+)+
      /\(\.\?\)\+/,    // (.?)+
      /\(\.\*\)\*/,    // (.*)*
      /\(\.\+\)\*/,    // (.+)*
      /\[\^\]\+\.\*/,  // [^]+.*
    ]
    if (absoluteBlocklist.some((b) => b.test(pattern))) {
      return false
    }

    return true
  }

  try {
    if (!isSafeRegex(expectedPattern)) {
      return {
        isValid: false,
        score: 0,
        maxScore: 100,
        details: ["Challenge config contains unsafe pattern"],
      }
    }

    const regex = new RegExp(expectedPattern)

    // Use Promise.race to implement timeout
    const regexTest = () => regex.test(userCode)
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error("Regex timeout")), REGEX_TIMEOUT_MS)
    })

    const isValid = Promise.race([regexTest(), timeoutPromise]) as unknown as boolean

    // For synchronous context, fall back to direct test with try-catch
    // The timeout protection is primarily for DoS scenarios where malformed input
    // could cause excessive backtracking
    const directTest = () => {
      const start = Date.now()
      const result = regex.test(userCode)
      if (Date.now() - start > REGEX_TIMEOUT_MS) {
        throw new Error("Regex execution timeout")
      }
      return result
    }

    let isValidResult: boolean
    try {
      isValidResult = directTest()
    } catch {
      return {
        isValid: false,
        score: 0,
        maxScore: 100,
        details: ["Pattern matching timed out - please simplify your answer"],
      }
    }

    return {
      isValid: isValidResult,
      score: isValidResult ? 100 : 0,
      maxScore: 100,
      details: isValidResult
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
