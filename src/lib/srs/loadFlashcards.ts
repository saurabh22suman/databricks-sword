/**
 * @file loadFlashcards.ts
 * @description Server-side utility to generate flashcards from all missions with concepts.
 * Reads mission JSON content, calls generateFlashcardsFromMission for each.
 */

import { getAllMissions } from "@/lib/missions"
import { generateFlashcardsFromMission } from "@/lib/srs/scheduler"
import type { Flashcard } from "@/lib/srs/types"

/**
 * Loads all flashcards from all missions that have concepts defined.
 * This is a server-only function (uses fs via getAllMissions).
 *
 * @returns Array of all available flashcards
 */
export async function loadAllFlashcards(): Promise<Flashcard[]> {
  const missions = await getAllMissions()
  const allCards: Flashcard[] = []

  for (const mission of missions) {
    if (mission.concepts && mission.concepts.length > 0) {
      const cards = generateFlashcardsFromMission(mission.id, {
        title: mission.title,
        concepts: mission.concepts,
      })
      allCards.push(...cards)
    }
  }

  return allCards
}
