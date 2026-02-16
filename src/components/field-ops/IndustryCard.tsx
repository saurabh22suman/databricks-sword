/**
 * Industry Card Component
 * Displays an industry with lock/unlock state and progress.
 */

import Link from "next/link"
import type { IndustryConfig } from "@/lib/field-ops/types"
import { isIndustryUnlocked, getUnlockProgress } from "@/lib/field-ops/industries"
import { cn } from "@/lib/utils"

type IndustryCardProps = {
  industry: IndustryConfig
  userXp: number
  isConnected: boolean
}

export function IndustryCard({
  industry,
  userXp,
  isConnected,
}: IndustryCardProps): React.ReactElement {
  const unlocked = isIndustryUnlocked(industry.industry, userXp)
  const progress = getUnlockProgress(industry.industry, userXp)
  const canStart = unlocked && isConnected

  return (
    <div
      className={cn(
        "cut-corner border transition-all",
        unlocked
          ? "bg-anime-900 border-anime-700 hover:border-anime-cyan"
          : "bg-anime-950 border-anime-800 opacity-60"
      )}
    >
      <div className="p-6">
        {/* Industry Header */}
        <div className="flex items-start justify-between mb-3">
          <span className="text-4xl">{industry.emoji}</span>
          {!unlocked && (
            <span className="text-anime-500 text-sm">🔒 Locked</span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-heading text-xl text-anime-cyan mb-2">
          {industry.title}
        </h3>

        {/* Description */}
        <p className="text-anime-300 text-sm mb-4 line-clamp-2">
          {industry.description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm mb-4">
          <div className="flex items-center gap-1">
            <span className="text-anime-500">XP Required:</span>
            <span className="text-anime-100 font-semibold">
              {industry.xpRequired.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm mb-4">
          <div className="flex items-center gap-1">
            <span className="text-anime-500">XP Reward:</span>
            <span className="text-anime-green font-semibold">
              +{industry.xpReward.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-anime-500">Time:</span>
            <span className="text-anime-100">~{industry.estimatedMinutes}min</span>
          </div>
        </div>

        {/* Progress Bar (for locked industries) */}
        {!unlocked && (
          <div className="mb-4">
            <div className="h-2 bg-anime-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-anime-cyan transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-anime-500 text-xs mt-1">
              {Math.round(progress)}% unlocked
            </p>
          </div>
        )}

        {/* Action Button */}
        {canStart ? (
          <Link
            href={`/field-ops/${industry.industry}`}
            className="block w-full text-center cut-corner bg-anime-cyan hover:bg-anime-accent text-anime-950 font-semibold py-2 transition-colors"
          >
            Start Mission
          </Link>
        ) : unlocked ? (
          <div className="w-full text-center cut-corner bg-anime-800 text-anime-500 py-2">
            Connect Databricks
          </div>
        ) : (
          <div className="w-full text-center cut-corner bg-anime-800 text-anime-500 py-2">
            🔒 Locked
          </div>
        )}
      </div>
    </div>
  )
}
