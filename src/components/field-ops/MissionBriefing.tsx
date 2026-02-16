/**
 * Mission Briefing Component
 * Displays mission overview and start button.
 */

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Industry, IndustryConfig } from "@/lib/field-ops/types"
import { ObjectivesList } from "./ObjectivesList"

type MissionBriefingProps = {
  industry: Industry
  config: IndustryConfig
}

export function MissionBriefing({
  industry,
  config,
}: MissionBriefingProps): React.ReactElement {
  const router = useRouter()
  const [isDeploying, setIsDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDeploy = async () => {
    setIsDeploying(true)
    setError(null)

    try {
      const response = await fetch("/api/field-ops/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Deployment failed")
      }

      // Redirect to active mission page
      router.push(`/field-ops/${industry}/active`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deployment failed")
    } finally {
      setIsDeploying(false)
    }
  }

  // Placeholder objectives - will be loaded from mission.json
  const objectives = [
    "Ingest raw data into Bronze layer",
    "Clean and deduplicate data in Silver layer",
    "Create business-ready tables in Gold layer",
    "Implement data quality checks",
    "Pass all validation queries",
  ]

  return (
    <div className="py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <a
            href="/field-ops"
            className="text-anime-cyan hover:text-anime-accent mb-4 inline-block"
          >
            ← Back to Field Operations
          </a>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-6xl">{config.emoji}</span>
            <div>
              <h1 className="font-heading text-4xl text-anime-cyan">
                {config.title}
              </h1>
              <p className="text-anime-300 text-lg">{config.description}</p>
            </div>
          </div>
        </div>

        {/* Scenario */}
        <div className="cut-corner bg-anime-900 border border-anime-700 p-6 mb-6">
          <h2 className="font-heading text-2xl text-anime-cyan mb-3">
            📋 Scenario
          </h2>
          <p className="text-anime-300">
            {/* TODO: Load from mission.json */}
            Your team has been deployed to fix critical data pipelines. The previous
            engineer left incomplete notebooks and broken transformations. Your mission
            is to get the data flowing again.
          </p>
        </div>

        {/* Objectives */}
        <div className="cut-corner bg-anime-900 border border-anime-700 p-6 mb-6">
          <h2 className="font-heading text-2xl text-anime-cyan mb-3">
            🎯 Objectives
          </h2>
          <ObjectivesList objectives={objectives} completed={[]} />
        </div>

        {/* What Gets Deployed */}
        <div className="cut-corner bg-anime-900 border border-anime-700 p-6 mb-6">
          <h2 className="font-heading text-2xl text-anime-cyan mb-3">
            📦 What Gets Deployed
          </h2>
          <ul className="space-y-2 text-anime-300">
            <li>• 3 schemas: bronze, silver, gold</li>
            <li>• Sample data files ({config.industry} domain)</li>
            <li>• Notebook templates (some incomplete/broken)</li>
            <li>• Validation queries for automated checking</li>
          </ul>
        </div>

        {/* Stats & CTA */}
        <div className="flex items-center justify-between cut-corner bg-anime-900 border border-anime-700 p-6 mb-6">
          <div className="flex gap-8">
            <div>
              <p className="text-anime-500 text-sm">XP Reward</p>
              <p className="text-anime-green font-semibold text-xl">
                +{config.xpReward.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-anime-500 text-sm">Estimated Time</p>
              <p className="text-anime-100 font-semibold text-xl">
                {config.estimatedMinutes} min
              </p>
            </div>
          </div>

          <button
            onClick={handleDeploy}
            disabled={isDeploying}
            className="cut-corner bg-anime-cyan hover:bg-anime-accent text-anime-950 font-semibold px-8 py-3 text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeploying ? "Deploying..." : "🚀 Deploy Mission"}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="cut-corner bg-anime-accent/10 border border-anime-accent p-4">
            <p className="text-anime-accent">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
