import { describe, expect, it } from "vitest"
import {
    ChallengeBlankSchema,
    ChallengeCategorySchema,
    ChallengeCodeBlockSchema,
    ChallengeDifficultySchema,
    ChallengeFormatSchema,
    ChallengeSchema,
    DragDropChallengeDataSchema,
    FillBlankChallengeDataSchema,
    FreeTextChallengeDataSchema,
} from "../types"

describe("Challenge Types & Schemas", () => {
  describe("ChallengeCategorySchema", () => {
    it("accepts valid categories", () => {
      const validCategories = [
        "pyspark",
        "sql",
        "delta-lake",
        "streaming",
        "mlflow",
        "unity-catalog",
        "architecture",
      ]
      for (const category of validCategories) {
        expect(ChallengeCategorySchema.safeParse(category).success).toBe(true)
      }
    })

    it("rejects invalid categories", () => {
      expect(ChallengeCategorySchema.safeParse("python").success).toBe(false)
      expect(ChallengeCategorySchema.safeParse("").success).toBe(false)
    })
  })

  describe("ChallengeDifficultySchema", () => {
    it("accepts B, A, S", () => {
      expect(ChallengeDifficultySchema.safeParse("B").success).toBe(true)
      expect(ChallengeDifficultySchema.safeParse("A").success).toBe(true)
      expect(ChallengeDifficultySchema.safeParse("S").success).toBe(true)
    })

    it("rejects invalid difficulties", () => {
      expect(ChallengeDifficultySchema.safeParse("C").success).toBe(false)
      expect(ChallengeDifficultySchema.safeParse("beginner").success).toBe(false)
    })
  })

  describe("ChallengeFormatSchema", () => {
    it("accepts valid formats", () => {
      expect(ChallengeFormatSchema.safeParse("drag-drop").success).toBe(true)
      expect(ChallengeFormatSchema.safeParse("fill-blank").success).toBe(true)
      expect(ChallengeFormatSchema.safeParse("free-text").success).toBe(true)
    })

    it("rejects invalid formats", () => {
      expect(ChallengeFormatSchema.safeParse("multiple-choice").success).toBe(false)
    })
  })

  describe("ChallengeCodeBlockSchema", () => {
    it("validates a code block with optional label", () => {
      const block = { id: "b1", code: "df.select('col')", label: "Select" }
      expect(ChallengeCodeBlockSchema.safeParse(block).success).toBe(true)
    })

    it("validates a code block without label", () => {
      const block = { id: "b1", code: "df.select('col')" }
      expect(ChallengeCodeBlockSchema.safeParse(block).success).toBe(true)
    })

    it("rejects missing id", () => {
      const block = { code: "df.select('col')" }
      expect(ChallengeCodeBlockSchema.safeParse(block).success).toBe(false)
    })
  })

  describe("ChallengeBlankSchema", () => {
    it("validates a blank with options", () => {
      const blank = { id: 0, correctAnswer: "filter", options: ["filter", "select", "drop"] }
      expect(ChallengeBlankSchema.safeParse(blank).success).toBe(true)
    })

    it("rejects fewer than 2 options", () => {
      const blank = { id: 0, correctAnswer: "filter", options: ["filter"] }
      expect(ChallengeBlankSchema.safeParse(blank).success).toBe(false)
    })

    it("rejects negative id", () => {
      const blank = { id: -1, correctAnswer: "filter", options: ["filter", "select"] }
      expect(ChallengeBlankSchema.safeParse(blank).success).toBe(false)
    })
  })

  describe("DragDropChallengeDataSchema", () => {
    it("validates drag-drop data", () => {
      const data = {
        blocks: [
          { id: "b1", code: "line1" },
          { id: "b2", code: "line2" },
        ],
        correctOrder: ["b1", "b2"],
      }
      expect(DragDropChallengeDataSchema.safeParse(data).success).toBe(true)
    })

    it("rejects fewer than 2 blocks", () => {
      const data = {
        blocks: [{ id: "b1", code: "line1" }],
        correctOrder: ["b1"],
      }
      expect(DragDropChallengeDataSchema.safeParse(data).success).toBe(false)
    })
  })

  describe("FillBlankChallengeDataSchema", () => {
    it("validates fill-blank data", () => {
      const data = {
        codeTemplate: "df.__BLANK_0__('col')",
        blanks: [{ id: 0, correctAnswer: "select", options: ["select", "filter"] }],
      }
      expect(FillBlankChallengeDataSchema.safeParse(data).success).toBe(true)
    })

    it("rejects missing blanks", () => {
      const data = {
        codeTemplate: "df.__BLANK_0__('col')",
        blanks: [],
      }
      expect(FillBlankChallengeDataSchema.safeParse(data).success).toBe(false)
    })
  })

  describe("FreeTextChallengeDataSchema", () => {
    it("validates free-text data", () => {
      const data = {
        starterCode: "# write your code",
        expectedPattern: "df\\.filter\\(",
        simulatedOutput: "+---+\n| col|\n+---+",
      }
      expect(FreeTextChallengeDataSchema.safeParse(data).success).toBe(true)
    })
  })

  describe("ChallengeSchema", () => {
    const baseDragDrop = {
      id: "dd-001",
      title: "Order PySpark Transformations",
      category: "pyspark",
      difficulty: "B",
      format: "drag-drop",
      description: "Order the transformations correctly.",
      hints: ["Start with the read"],
      xpReward: 50,
      optimalSolution: "df = spark.read...",
      explanation: "Transformations chain ...",
      dragDrop: {
        blocks: [
          { id: "b1", code: "spark.read.csv('data.csv')" },
          { id: "b2", code: ".filter(col('x') > 5)" },
        ],
        correctOrder: ["b1", "b2"],
      },
    }

    const baseFillBlank = {
      id: "fb-001",
      title: "Fill in PySpark Select",
      category: "pyspark",
      difficulty: "A",
      format: "fill-blank",
      description: "Fill in the blanks.",
      hints: ["Use the select method"],
      xpReward: 75,
      optimalSolution: "df.select('col')",
      explanation: "select() picks columns.",
      fillBlank: {
        codeTemplate: "df.__BLANK_0__('col')",
        blanks: [{ id: 0, correctAnswer: "select", options: ["select", "filter", "drop"] }],
      },
    }

    const baseFreeText = {
      id: "ft-001",
      title: "Write a PySpark Filter",
      category: "pyspark",
      difficulty: "S",
      format: "free-text",
      description: "Write a filter expression.",
      hints: ["Use .filter() or .where()"],
      xpReward: 100,
      optimalSolution: "df.filter(col('x') > 5)",
      explanation: "filter() applies row-wise conditions.",
      freeText: {
        starterCode: "# Filter rows where x > 5",
        expectedPattern: "\\.(filter|where)\\(",
        simulatedOutput: "+---+\n| x |\n+---+\n| 10|\n+---+",
      },
    }

    it("validates a drag-drop challenge", () => {
      expect(ChallengeSchema.safeParse(baseDragDrop).success).toBe(true)
    })

    it("validates a fill-blank challenge", () => {
      expect(ChallengeSchema.safeParse(baseFillBlank).success).toBe(true)
    })

    it("validates a free-text challenge", () => {
      expect(ChallengeSchema.safeParse(baseFreeText).success).toBe(true)
    })

    it("rejects drag-drop challenge without dragDrop data", () => {
      const { dragDrop, ...missing } = baseDragDrop
      expect(ChallengeSchema.safeParse(missing).success).toBe(false)
    })

    it("rejects fill-blank challenge without fillBlank data", () => {
      const { fillBlank, ...missing } = baseFillBlank
      expect(ChallengeSchema.safeParse(missing).success).toBe(false)
    })

    it("rejects free-text challenge without freeText data", () => {
      const { freeText, ...missing } = baseFreeText
      expect(ChallengeSchema.safeParse(missing).success).toBe(false)
    })

    it("rejects negative xpReward", () => {
      const bad = { ...baseDragDrop, xpReward: -10 }
      expect(ChallengeSchema.safeParse(bad).success).toBe(false)
    })

    it("rejects invalid category", () => {
      const bad = { ...baseDragDrop, category: "java" }
      expect(ChallengeSchema.safeParse(bad).success).toBe(false)
    })
  })
})
