/**
 * Industry Card Component
 * Displays an industry with lock/unlock state and progress.
 */

"use client"

import { getUnlockProgress, isIndustryUnlocked } from "@/lib/field-ops/industries"
import type { IndustryConfig } from "@/lib/field-ops/types"
import { cn } from "@/lib/utils"
import { Info, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

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
  const [showBriefing, setShowBriefing] = useState(false)

  return (
    <>
      {/* Briefing Modal */}
      {showBriefing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowBriefing(false)}
          />
          <div className="relative bg-anime-900 border border-anime-700 rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{industry.emoji}</span>
                  <h2 className="font-heading text-2xl text-anime-cyan">
                    {industry.title} Briefing
                  </h2>
                </div>
                <button
                  onClick={() => setShowBriefing(false)}
                  className="text-anime-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-anime-cyan font-semibold mb-2">📋 Scenario</h3>
                  <p className="text-anime-300 text-sm">{industry.scenario}</p>
                </div>

                <div>
                  <h3 className="text-anime-cyan font-semibold mb-2">🎯 Objectives</h3>
                  <ul className="space-y-2">
                    {industry.objectives.map((obj, idx) => (
                      <li key={idx} className="text-anime-300 text-sm flex items-start gap-2">
                        <span className="text-anime-500">•</span>
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-anime-cyan font-semibold mb-2">📦 What Gets Deployed</h3>
                  <ul className="space-y-1 text-anime-300 text-sm">
                    <li>• 3 schemas: bronze, silver, gold</li>
                    <li>• Sample data files ({industry.industry} domain)</li>
                    <li>• Notebook templates (some incomplete/broken)</li>
                    <li>• Validation queries for automated checking</li>
                  </ul>
                </div>

                <div className="flex items-center gap-6 pt-2 border-t border-anime-700">
                  <div>
                    <p className="text-anime-500 text-xs">XP Reward</p>
                    <p className="text-anime-green font-semibold">
                      +{industry.xpReward.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-anime-500 text-xs">Est. Time</p>
                    <p className="text-anime-100 font-semibold">
                      {industry.estimatedMinutes} min
                    </p>
                  </div>
                </div>
              </div>

              {canStart && (
                <Link
                  href={`/field-ops/${industry.industry}`}
                  onClick={() => setShowBriefing(false)}
                  className="mt-6 block w-full text-center cut-corner bg-anime-cyan hover:bg-anime-accent text-anime-950 font-semibold py-3 transition-colors"
                >
                  🚀 Deploy Mission
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

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

          {/* Action Buttons */}
          {canStart ? (
            <div className="space-y-2">
              <Link
                href={`/field-ops/${industry.industry}`}
                className="block w-full text-center cut-corner bg-anime-cyan hover:bg-anime-accent text-anime-950 font-semibold py-2 transition-colors"
              >
                Start Mission
              </Link>
              <button
                onClick={() => setShowBriefing(true)}
                className="w-full flex items-center justify-center gap-2 text-anime-400 hover:text-anime-cyan text-sm py-1 transition-colors"
              >
                <Info className="w-4 h-4" />
                Show Briefing
              </button>
            </div>
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
    </>
  )
}
