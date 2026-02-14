/**
 * @file page.tsx
 * @description Challenge library page with filterable grid
 */

import { ChallengeGridClient } from "@/components/challenges/ChallengeGridClient"
import { getAllChallenges } from "@/lib/challenges"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Challenge Library | Databricks Sword",
  description:
    "Practice Databricks skills with standalone challenges across PySpark, SQL, Delta Lake, Streaming, and more.",
}

/**
 * Challenge library page — Server Component.
 * Loads all challenges server-side, client grid handles filtering.
 */
export default async function ChallengesPage(): Promise<React.ReactElement> {
  const challenges = await getAllChallenges()

  return (
    <div className="min-h-screen bg-anime-950 cyber-grid pt-20">
      <div className="grain-overlay fixed inset-0 pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Page Header */}
        <div className="mb-12">
          <h1 className="font-heading text-4xl font-bold text-anime-100 mb-2">
            Challenge Library
          </h1>
          <p className="text-anime-400 text-lg">
            Drill specific skills. Filter by category and difficulty.
          </p>
        </div>

        {/* Client Grid with Filters */}
        <ChallengeGridClient challenges={challenges} />
      </div>
    </div>
  )
}
