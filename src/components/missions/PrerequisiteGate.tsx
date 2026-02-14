/**
 * @file PrerequisiteGate.tsx
 * @description Server component that enforces mission prerequisites
 */

import { getMission } from "@/lib/missions/loader"
import { checkPrerequisites } from "@/lib/missions/prerequisites"
import { cn } from "@/lib/utils"
import { Lock } from "lucide-react"
import Link from "next/link"

export type PrerequisiteGateProps = {
  missionId: string
  completedMissions: string[]
  children: React.ReactNode
}

/**
 * PrerequisiteGate - Enforces mission prerequisites
 * Shows locked screen if prerequisites not met, otherwise renders children
 */
export async function PrerequisiteGate({
  missionId,
  completedMissions,
  children,
}: PrerequisiteGateProps): Promise<React.ReactElement> {
  const mission = await getMission(missionId)
  const result = await checkPrerequisites(missionId, completedMissions)

  // If prerequisites are met, render children normally
  if (result.met) {
    return <>{children}</>
  }

  // Prerequisites not met - show locked screen
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto max-w-2xl p-8">
        <div className="cut-corner bg-anime-900 border border-anime-accent p-8 shadow-neon-red">
          {/* Lock Icon */}
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-anime-accent/20 p-6">
              <Lock className="h-16 w-16 text-anime-accent" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="mb-4 font-heading text-3xl text-anime-accent">
            Prerequisites Required
          </h1>

          {/* Mission Title */}
          <p className="mb-6 text-lg text-anime-100">
            <span className="text-anime-cyan">{mission.title}</span> is locked.
            Complete the following missions first:
          </p>

          {/* Missing Prerequisites List */}
          <ul className="mb-8 space-y-3">
            {result.missing.map((prereqId) => {
              const isCompleted = completedMissions.includes(prereqId)
              return (
                <li key={prereqId} className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      isCompleted ? "bg-anime-green" : "bg-anime-accent",
                    )}
                  />
                  <Link
                    href={`/missions/${prereqId}`}
                    className={cn(
                      "transition-colors hover:text-anime-cyan",
                      isCompleted ? "text-anime-green line-through" : "text-anime-100",
                    )}
                  >
                    {prereqId}
                  </Link>
                  {!isCompleted && (
                    <span className="text-sm text-anime-accent">(Locked)</span>
                  )}
                </li>
              )
            })}
          </ul>

          {/* Back to Missions Button */}
          <div className="flex justify-center">
            <Link
              href="/missions"
              className="cut-corner bg-anime-700 border border-anime-accent px-6 py-3 font-heading text-anime-accent transition-all hover:bg-anime-accent hover:text-anime-950 hover:shadow-neon-red"
            >
              ← Back to Mission Select
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
