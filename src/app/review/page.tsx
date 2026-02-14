import { loadAllFlashcards } from "@/lib/srs/loadFlashcards"
import React from "react"
import ReviewPageClient from "./ReviewPageClient"

/**
 * Review page server component.
 * Loads all flashcards from mission concepts and passes them
 * to the client component for interactive review sessions.
 */
export default async function ReviewPage(): Promise<React.ReactElement> {
  const flashcards = await loadAllFlashcards()

  return <ReviewPageClient initialFlashcards={flashcards} />
}