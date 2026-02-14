/**
 * @file quizRecall.ts
 * @description Quiz recall/reinforcement utility.
 * Mixes current mission quiz questions with recall questions from earlier missions
 * based on mission rank:
 * - B-rank: 100% current mission concepts
 * - A-rank: 80% current + 20% recall from prerequisites
 * - S-rank: 60% current + 40% recall from earlier missions
 */

import { getAllMissions, getStageConfig } from "./loader"
import type { QuizConfig, QuizQuestion } from "./types"

/** Mission rank type — "B" | "A" | "S" */
type MissionRank = "B" | "A" | "S"

/** Recall ratio configuration per rank */
const RECALL_RATIOS: Record<MissionRank, number> = {
  B: 0,    // 100% current, 0% recall
  A: 0.2,  // 80% current, 20% recall
  S: 0.4,  // 60% current, 40% recall
}

/**
 * Builds a quiz that mixes current mission questions with recall questions
 * from earlier missions based on the mission's rank.
 *
 * All current questions are always included. Recall questions are added
 * on top to reach the target ratio. Recall question IDs are prefixed
 * with "recall_" to distinguish them from current questions.
 *
 * @param currentQuestions - Questions from the current mission's quiz
 * @param recallPool - Questions from previously completed missions
 * @param rank - The current mission's rank (B, A, or S)
 * @returns Combined quiz questions with recall questions mixed in
 */
export function buildQuizWithRecall(
  currentQuestions: QuizQuestion[],
  recallPool: QuizQuestion[],
  rank: MissionRank,
): QuizQuestion[] {
  const recallRatio = RECALL_RATIOS[rank]

  // B-rank or empty recall pool → return current questions only
  if (recallRatio === 0 || recallPool.length === 0) {
    return [...currentQuestions]
  }

  // Calculate how many recall questions to add.
  // currentQuestions represent (1 - recallRatio) of the total.
  // total = currentQuestions.length / (1 - recallRatio)
  // recallCount = total - currentQuestions.length
  const totalTarget = Math.ceil(currentQuestions.length / (1 - recallRatio))
  const recallCount = Math.min(totalTarget - currentQuestions.length, recallPool.length)

  // Shuffle and pick from the recall pool
  const shuffled = shuffleArray([...recallPool])
  const selectedRecall = shuffled.slice(0, recallCount)

  // Prefix recall question IDs to distinguish them
  const taggedRecall: QuizQuestion[] = selectedRecall.map((q) => ({
    ...q,
    id: `recall_${q.id}`,
  }))

  // Interleave: keep all current questions, then append recall
  return [...currentQuestions, ...taggedRecall]
}

/**
 * Fisher-Yates shuffle for an array (returns a new array).
 */
function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Loads quiz questions from all missions except the specified one.
 * Used server-side to build a recall pool for quiz reinforcement.
 *
 * @param excludeMissionId - Mission ID to exclude (current mission)
 * @returns Array of quiz questions from other missions
 */
export async function loadRecallPool(
  excludeMissionId: string,
): Promise<QuizQuestion[]> {
  const missions = await getAllMissions()
  const pool: QuizQuestion[] = []

  for (const mission of missions) {
    if (mission.id === excludeMissionId) continue

    // Find the quiz stage in this mission
    const quizStage = mission.stages.find((s) => s.type === "quiz")
    if (!quizStage || !quizStage.configFile) continue

    try {
      const quizConfig = await getStageConfig<QuizConfig>(
        mission.id,
        quizStage.configFile,
      )
      if (quizConfig.questions) {
        pool.push(...quizConfig.questions)
      }
    } catch {
      // Skip missions with missing/invalid quiz configs
    }
  }

  return pool
}
