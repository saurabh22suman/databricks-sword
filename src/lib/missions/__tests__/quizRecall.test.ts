import { buildQuizWithRecall } from "@/lib/missions/quizRecall"
import type { QuizQuestion } from "@/lib/missions/types"
import { describe, expect, it } from "vitest"

const currentQuestions: QuizQuestion[] = [
  {
    id: "c1",
    question: "Current Q1?",
    options: ["A", "B", "C", "D"],
    correctAnswer: 0,
    explanation: "Explanation 1",
  },
  {
    id: "c2",
    question: "Current Q2?",
    options: ["A", "B", "C", "D"],
    correctAnswer: 1,
    explanation: "Explanation 2",
  },
  {
    id: "c3",
    question: "Current Q3?",
    options: ["A", "B", "C", "D"],
    correctAnswer: 2,
    explanation: "Explanation 3",
  },
  {
    id: "c4",
    question: "Current Q4?",
    options: ["A", "B", "C", "D"],
    correctAnswer: 3,
    explanation: "Explanation 4",
  },
  {
    id: "c5",
    question: "Current Q5?",
    options: ["A", "B", "C", "D"],
    correctAnswer: 0,
    explanation: "Explanation 5",
  },
]

const recallQuestions: QuizQuestion[] = [
  {
    id: "r1",
    question: "Recall Q1?",
    options: ["X", "Y"],
    correctAnswer: 0,
    explanation: "Recall explanation 1",
  },
  {
    id: "r2",
    question: "Recall Q2?",
    options: ["X", "Y"],
    correctAnswer: 1,
    explanation: "Recall explanation 2",
  },
  {
    id: "r3",
    question: "Recall Q3?",
    options: ["X", "Y"],
    correctAnswer: 0,
    explanation: "Recall explanation 3",
  },
  {
    id: "r4",
    question: "Recall Q4?",
    options: ["X", "Y"],
    correctAnswer: 1,
    explanation: "Recall explanation 4",
  },
]

describe("buildQuizWithRecall", () => {
  it("returns 100% current questions for B-rank missions", () => {
    const result = buildQuizWithRecall(currentQuestions, recallQuestions, "B")

    expect(result).toHaveLength(currentQuestions.length)
    for (const q of result) {
      expect(q.id).toMatch(/^c/)
    }
  })

  it("mixes ~80% current + ~20% recall for A-rank missions", () => {
    const result = buildQuizWithRecall(currentQuestions, recallQuestions, "A")

    // With 5 current questions, 20% recall = 1 recall question
    const currentIds = result.filter((q) => q.id.startsWith("c"))
    const recallIds = result.filter((q) => q.id.startsWith("r"))

    expect(currentIds.length).toBeGreaterThanOrEqual(4)
    expect(recallIds.length).toBeGreaterThanOrEqual(1)
    expect(result.length).toBe(currentQuestions.length + recallIds.length)
  })

  it("mixes ~60% current + ~40% recall for S-rank missions", () => {
    const result = buildQuizWithRecall(currentQuestions, recallQuestions, "S")

    const currentIds = result.filter((q) => q.id.startsWith("c"))
    const recallIds = result.filter((q) => q.id.startsWith("r"))

    // 5 current questions → target ~3.3 recall questions (40% of total)
    // With 5 current at 60%, total ≈ 8.3, recall ≈ 3.3 → 3 recall
    expect(currentIds.length).toBe(5) // all current kept
    expect(recallIds.length).toBeGreaterThanOrEqual(2)
    expect(result.length).toBeGreaterThan(currentQuestions.length)
  })

  it("returns all current questions when recall pool is empty", () => {
    const resultA = buildQuizWithRecall(currentQuestions, [], "A")
    const resultS = buildQuizWithRecall(currentQuestions, [], "S")

    expect(resultA).toHaveLength(currentQuestions.length)
    expect(resultS).toHaveLength(currentQuestions.length)
  })

  it("tags recall questions with a recall marker", () => {
    const result = buildQuizWithRecall(currentQuestions, recallQuestions, "S")

    const recallItems = result.filter((q) => q.id.startsWith("recall_"))
    // Recall questions should be prefixed to distinguish them
    expect(recallItems.length).toBeGreaterThanOrEqual(2)
  })

  it("does not duplicate recall questions", () => {
    const result = buildQuizWithRecall(currentQuestions, recallQuestions, "S")

    const ids = result.map((q) => q.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })
})
