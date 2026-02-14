import path from "path"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Challenge } from "../types"

const CHALLENGES_DIR = path.join(process.cwd(), "src", "content", "challenges")

/** Helper to create a valid drag-drop challenge JSON */
function makeDragDropChallenge(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "dd-test-001",
    title: "Test Drag Drop",
    category: "pyspark",
    difficulty: "B",
    format: "drag-drop",
    description: "Order the steps.",
    hints: ["Hint 1"],
    xpReward: 50,
    optimalSolution: "spark.read...",
    explanation: "Explanation here.",
    dragDrop: {
      blocks: [
        { id: "b1", code: "spark.read.csv('data.csv')" },
        { id: "b2", code: ".filter(col('x') > 5)" },
      ],
      correctOrder: ["b1", "b2"],
    },
    ...overrides,
  }
}

/** Helper to create a valid fill-blank challenge JSON */
function makeFillBlankChallenge(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "fb-test-001",
    title: "Test Fill Blank",
    category: "sql",
    difficulty: "A",
    format: "fill-blank",
    description: "Fill in the blanks.",
    hints: ["Hint 1"],
    xpReward: 75,
    optimalSolution: "SELECT * FROM t",
    explanation: "SQL select.",
    fillBlank: {
      codeTemplate: "__BLANK_0__ * FROM t",
      blanks: [{ id: 0, correctAnswer: "SELECT", options: ["SELECT", "INSERT", "DELETE"] }],
    },
    ...overrides,
  }
}

/** Helper to create a valid free-text challenge JSON */
function makeFreeTextChallenge(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "ft-test-001",
    title: "Test Free Text",
    category: "delta-lake",
    difficulty: "S",
    format: "free-text",
    description: "Write code.",
    hints: ["Hint 1"],
    xpReward: 100,
    optimalSolution: "df.write.format('delta').save('/path')",
    explanation: "Delta format.",
    freeText: {
      starterCode: "# Write to Delta",
      expectedPattern: "\\.format\\(['\"]delta['\"]\\)",
      simulatedOutput: "Written successfully",
    },
    ...overrides,
  }
}

// Create mock functions
const mockReaddirSync = vi.fn()
const mockReadFileSync = vi.fn()

// Mock fs before any import of loader
vi.mock("fs", () => ({
  default: {
    readdirSync: (...args: unknown[]) => mockReaddirSync(...args),
    existsSync: () => true,
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  },
  readdirSync: (...args: unknown[]) => mockReaddirSync(...args),
  existsSync: () => true,
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
}))

// Import after mocking
const { getAllChallenges, getChallengesByCategory, getChallenge, validateChallengeResponse } =
  await import("../loader")

describe("Challenge Loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getAllChallenges", () => {
    it("loads challenges from all category directories", async () => {
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === CHALLENGES_DIR) {
          return [
            { name: "pyspark", isDirectory: () => true },
            { name: "sql", isDirectory: () => true },
          ]
        }
        if (dirPath.endsWith("pyspark")) {
          return ["dd-test-001.json", "fb-test-002.json"]
        }
        if (dirPath.endsWith("sql")) {
          return ["fb-test-001.json"]
        }
        return []
      })

      mockReadFileSync.mockImplementation((filePath: string) => {
        if (filePath.includes("dd-test-001")) {
          return JSON.stringify(makeDragDropChallenge())
        }
        if (filePath.includes("fb-test-002")) {
          return JSON.stringify(makeFillBlankChallenge({ id: "fb-test-002", category: "pyspark", format: "fill-blank" }))
        }
        if (filePath.includes("fb-test-001")) {
          return JSON.stringify(makeFillBlankChallenge())
        }
        return "{}"
      })

      const challenges = await getAllChallenges()
      expect(challenges).toHaveLength(3)
    })

    it("returns empty array when challenges directory does not exist", async () => {
      mockReaddirSync.mockImplementation(() => {
        throw new Error("ENOENT")
      })

      const challenges = await getAllChallenges()
      expect(challenges).toEqual([])
    })

    it("skips invalid challenge files gracefully", async () => {
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === CHALLENGES_DIR) {
          return [{ name: "pyspark", isDirectory: () => true }]
        }
        return ["valid.json", "invalid.json"]
      })

      mockReadFileSync.mockImplementation((filePath: string) => {
        if (filePath.includes("invalid")) {
          return "{ broken json"
        }
        if (filePath.includes("valid")) {
          return JSON.stringify(makeDragDropChallenge({ id: "valid" }))
        }
        return "{}"
      })

      const challenges = await getAllChallenges()
      expect(challenges).toHaveLength(1)
      expect(challenges[0].id).toBe("valid")
    })

    it("sorts by category then difficulty", async () => {
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === CHALLENGES_DIR) {
          return [
            { name: "sql", isDirectory: () => true },
            { name: "pyspark", isDirectory: () => true },
          ]
        }
        if (dirPath.endsWith("pyspark")) {
          return ["s-challenge.json", "b-challenge.json"]
        }
        if (dirPath.endsWith("sql")) {
          return ["a-challenge.json"]
        }
        return []
      })

      mockReadFileSync.mockImplementation((filePath: string) => {
        if (filePath.includes("s-challenge")) {
          return JSON.stringify(makeDragDropChallenge({ id: "ps-s", difficulty: "S", category: "pyspark" }))
        }
        if (filePath.includes("b-challenge")) {
          return JSON.stringify(makeDragDropChallenge({ id: "ps-b", difficulty: "B", category: "pyspark" }))
        }
        if (filePath.includes("a-challenge")) {
          return JSON.stringify(makeFillBlankChallenge({ id: "sql-a", difficulty: "A", category: "sql" }))
        }
        return "{}"
      })

      const challenges = await getAllChallenges()
      expect(challenges).toHaveLength(3)
      expect(challenges[0].id).toBe("ps-b")
      expect(challenges[1].id).toBe("ps-s")
      expect(challenges[2].id).toBe("sql-a")
    })
  })

  describe("getChallengesByCategory", () => {
    it("returns only challenges matching the category", async () => {
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === CHALLENGES_DIR) {
          return [
            { name: "pyspark", isDirectory: () => true },
            { name: "sql", isDirectory: () => true },
          ]
        }
        if (dirPath.endsWith("pyspark")) {
          return ["dd-test-001.json"]
        }
        if (dirPath.endsWith("sql")) {
          return ["fb-test-001.json"]
        }
        return []
      })

      mockReadFileSync.mockImplementation((filePath: string) => {
        if (filePath.includes("dd-test-001")) {
          return JSON.stringify(makeDragDropChallenge())
        }
        if (filePath.includes("fb-test-001")) {
          return JSON.stringify(makeFillBlankChallenge())
        }
        return "{}"
      })

      const sqlChallenges = await getChallengesByCategory("sql")
      expect(sqlChallenges).toHaveLength(1)
      expect(sqlChallenges[0].category).toBe("sql")
    })
  })

  describe("getChallenge", () => {
    it("loads a challenge by id", async () => {
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === CHALLENGES_DIR) {
          return [{ name: "pyspark", isDirectory: () => true }]
        }
        return ["dd-test-001.json"]
      })

      mockReadFileSync.mockReturnValue(JSON.stringify(makeDragDropChallenge()))

      const challenge = await getChallenge("dd-test-001")
      expect(challenge).not.toBeNull()
      expect(challenge!.id).toBe("dd-test-001")
      expect(challenge!.format).toBe("drag-drop")
    })

    it("returns null for non-existent challenge", async () => {
      mockReaddirSync.mockImplementation((dirPath: string) => {
        if (dirPath === CHALLENGES_DIR) {
          return [{ name: "pyspark", isDirectory: () => true }]
        }
        return ["dd-test-001.json"]
      })

      mockReadFileSync.mockReturnValue(JSON.stringify(makeDragDropChallenge()))

      const challenge = await getChallenge("nonexistent")
      expect(challenge).toBeNull()
    })
  })

  describe("validateChallengeResponse", () => {
    it("validates correct drag-drop order", () => {
      const challenge = makeDragDropChallenge() as unknown as Challenge
      const result = validateChallengeResponse(challenge, { order: ["b1", "b2"] })
      expect(result.isValid).toBe(true)
      expect(result.score).toBe(result.maxScore)
    })

    it("rejects incorrect drag-drop order", () => {
      const challenge = makeDragDropChallenge() as unknown as Challenge
      const result = validateChallengeResponse(challenge, { order: ["b2", "b1"] })
      expect(result.isValid).toBe(false)
      expect(result.score).toBeLessThan(result.maxScore)
    })

    it("validates correct fill-blank answers", () => {
      const challenge = makeFillBlankChallenge() as unknown as Challenge
      const result = validateChallengeResponse(challenge, { answers: { 0: "SELECT" } })
      expect(result.isValid).toBe(true)
      expect(result.score).toBe(result.maxScore)
    })

    it("rejects incorrect fill-blank answers", () => {
      const challenge = makeFillBlankChallenge() as unknown as Challenge
      const result = validateChallengeResponse(challenge, { answers: { 0: "INSERT" } })
      expect(result.isValid).toBe(false)
    })

    it("validates matching free-text response", () => {
      const challenge = makeFreeTextChallenge() as unknown as Challenge
      const result = validateChallengeResponse(challenge, {
        code: "df.write.format('delta').save('/path')",
      })
      expect(result.isValid).toBe(true)
    })

    it("rejects non-matching free-text response", () => {
      const challenge = makeFreeTextChallenge() as unknown as Challenge
      const result = validateChallengeResponse(challenge, {
        code: "df.write.save('/path')",
      })
      expect(result.isValid).toBe(false)
    })

    it("handles missing response data", () => {
      const challenge = makeDragDropChallenge() as unknown as Challenge
      const result = validateChallengeResponse(challenge, {})
      expect(result.isValid).toBe(false)
    })
  })
})
