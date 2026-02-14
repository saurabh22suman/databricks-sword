/**
 * @file page.tsx
 * @description Daily Forge page — daily challenge with streak tracking
 */

import { DailyForgeClient } from "@/components/challenges/DailyForgeClient"
import { getAllChallenges } from "@/lib/challenges"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Daily Forge | Databricks Sword",
  description:
    "Complete a daily challenge to maintain your streak and earn bonus XP.",
}

/**
 * Deterministically selects today's challenge based on date.
 */
function getTodaysChallengeIndex(totalChallenges: number): number {
  const today = new Date()
  const dayOfYear =
    Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  return dayOfYear % totalChallenges
}

/**
 * Daily Forge page — Server Component.
 */
export default async function DailyPage(): Promise<React.ReactElement> {
  const challenges = await getAllChallenges()

  if (challenges.length === 0) {
    return (
      <div className="min-h-screen bg-anime-950 cyber-grid pt-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-anime-accent mb-4">
            No Challenges Available
          </h1>
          <p className="text-anime-400">
            Challenge content is being prepared. Check back soon!
          </p>
        </div>
      </div>
    )
  }

  const todayIndex = getTodaysChallengeIndex(challenges.length)
  const todaysChallenge = challenges[todayIndex]

  return (
    <div className="min-h-screen bg-anime-950 cyber-grid pt-20">
      <div className="grain-overlay fixed inset-0 pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-16 max-w-4xl">
        <DailyForgeClient challenge={todaysChallenge} />
      </div>
    </div>
  )
}
