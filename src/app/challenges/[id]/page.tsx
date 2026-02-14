/**
 * @file page.tsx
 * @description Individual challenge player page
 */

import { ChallengePlayerWrapper } from "@/components/challenges/ChallengePlayerWrapper"
import { getChallenge } from "@/lib/challenges"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

type ChallengePageProps = {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({
  params,
}: ChallengePageProps): Promise<Metadata> {
  const { id } = await params
  const challenge = await getChallenge(id)

  if (!challenge) {
    return { title: "Challenge Not Found | Databricks Sword" }
  }

  return {
    title: `${challenge.title} | Databricks Sword`,
    description: challenge.description,
  }
}

/**
 * Individual challenge page — Server Component.
 * Loads challenge data, delegates rendering to client wrapper.
 */
export default async function ChallengePage({
  params,
}: ChallengePageProps): Promise<React.ReactElement> {
  const { id } = await params
  const challenge = await getChallenge(id)

  if (!challenge) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-anime-950 cyber-grid pt-20">
      <div className="grain-overlay fixed inset-0 pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-16 max-w-4xl">
        {/* Back Link */}
        <div className="mb-8">
          <a
            href="/challenges"
            className="text-anime-cyan hover:text-anime-purple transition-colors"
          >
            ← Back to Challenges
          </a>
        </div>

        {/* Challenge Meta */}
        <div className="flex items-center gap-4 mb-6">
          <span className="text-xs font-medium uppercase tracking-wider text-anime-500">
            {challenge.category}
          </span>
          <span
            className={`px-3 py-1 text-sm font-heading font-bold border rounded ${
              challenge.difficulty === "S"
                ? "bg-anime-accent/20 text-anime-accent border-anime-accent"
                : challenge.difficulty === "A"
                  ? "bg-anime-purple/20 text-anime-purple border-anime-purple"
                  : "bg-anime-cyan/20 text-anime-cyan border-anime-cyan"
            }`}
          >
            {challenge.difficulty}
          </span>
          <span className="text-anime-cyan text-sm font-medium">
            {challenge.xpReward} XP
          </span>
        </div>

        {/* Challenge Player */}
        <ChallengePlayerWrapper challenge={challenge} />
      </div>
    </div>
  )
}
