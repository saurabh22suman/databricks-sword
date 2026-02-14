/**
 * @file adapter.ts
 * @description Converts between sandbox FlashcardProgress and SRS FlashcardProgress types.
 * The sandbox stores a minimal 5-field progress object; the SRS module uses a richer 14-field type.
 */

import type { FlashcardProgress as SandboxFlashcardProgress } from "@/lib/sandbox/types"
import type { FlashcardProgress as SrsFlashcardProgress } from "./types"

/**
 * Converts sandbox FlashcardProgress to the full SRS FlashcardProgress format.
 *
 * @param cardId - The flashcard ID
 * @param userId - The user ID
 * @param sandbox - The sandbox progress record
 * @returns SRS-compatible FlashcardProgress
 */
export function sandboxToSrsProgress(
  cardId: string,
  userId: string,
  sandbox: SandboxFlashcardProgress,
): SrsFlashcardProgress {
  const now = new Date().toISOString()
  return {
    cardId,
    userId,
    easinessFactor: sandbox.easeFactor,
    interval: sandbox.interval,
    repetitions: sandbox.repetitions,
    nextReview: sandbox.nextReview,
    lastReview: sandbox.lastReviewed,
    totalReviews: sandbox.repetitions,
    lapseCount: 0,
    isGraduated: false,
    createdAt: sandbox.lastReviewed || now,
    updatedAt: sandbox.lastReviewed || now,
  }
}

/**
 * Converts SRS FlashcardProgress back to the sandbox storage format.
 *
 * @param srs - The full SRS FlashcardProgress
 * @returns Sandbox-compatible FlashcardProgress
 */
export function srsToSandboxProgress(
  srs: SrsFlashcardProgress,
): SandboxFlashcardProgress {
  return {
    lastReviewed: srs.lastReview ?? srs.updatedAt,
    interval: srs.interval,
    easeFactor: srs.easinessFactor,
    repetitions: srs.repetitions,
    nextReview: srs.nextReview,
  }
}
