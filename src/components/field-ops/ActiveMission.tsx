/**
 * Active Mission Component
 * Main interface for working on a deployed Field Ops mission.
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Industry, IndustryConfig } from "@/lib/field-ops/types"
import { ObjectivesList } from "./ObjectivesList"
import { ValidationResults } from "./ValidationResults"
import { updateSandbox } from "@/lib/sandbox"
import { getStreakMultiplier } from "@/lib/gamification"

type ActiveMissionProps = {
  deploymentId: string
  industry: Industry
  config: IndustryConfig
}

type DeploymentData = {
  deployment: {
    id: string
    industry: string
    status: string
    schemaPrefix: string
    deployedAt?: string | null
    completedAt?: string | null
    errorMessage?: string | null
  }
  validations: Array<{
    checkName: string
    passed: boolean
    executedAt: string
    errorMessage?: string | null
  }>
}

export function ActiveMission({
  deploymentId,
  industry,
  config,
}: ActiveMissionProps): React.ReactElement {
  const router = useRouter()
  const [data, setData] = useState<DeploymentData | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load deployment status
  useEffect(() => {
    loadStatus()
    // Poll for updates every 10 seconds
    const interval = setInterval(loadStatus, 10000)
    return () => clearInterval(interval)
  }, [deploymentId])

  const loadStatus = async () => {
    try {
      const response = await fetch(`/api/field-ops/status/${deploymentId}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (err) {
      console.error("Failed to load status:", err)
    }
  }

  const handleValidate = async () => {
    setIsValidating(true)
    setError(null)

    try {
      const response = await fetch(`/api/field-ops/validate/${deploymentId}`, {
        method: "POST",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Validation failed")
      }

      // Reload status to get updated validations
      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed")
    } finally {
      setIsValidating(false)
    }
  }

  const handleComplete = async () => {
    setIsCompleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/field-ops/complete/${deploymentId}`, {
        method: "POST",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to complete mission")
      }

      // Award XP to sandbox with streak multiplier
      const baseXp = result.xpAwarded || config.xpReward
      updateSandbox((data) => {
        const multiplier = getStreakMultiplier(data.streakData.currentStreak)
        const finalXp = Math.floor(baseXp * multiplier)
        // Add industry to completed field ops if not already there
        const completedFieldOps = data.completedFieldOps || []
        const newCompletedFieldOps = completedFieldOps.includes(config.industry)
          ? completedFieldOps
          : [...completedFieldOps, config.industry]
        return {
          ...data,
          userStats: {
            ...data.userStats,
            totalXp: data.userStats.totalXp + finalXp,
          },
          completedFieldOps: newCompletedFieldOps,
        }
      })

      // Show success and redirect
      alert(`Mission complete! +${result.xpAwarded} XP`)
      router.push("/field-ops")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete mission")
    } finally {
      setIsCompleting(false)
    }
  }

  const handleCleanup = async () => {
    if (!confirm("This will delete all deployed resources. Continue?")) {
      return
    }

    setIsCleaning(true)
    setError(null)

    try {
      const response = await fetch(`/api/field-ops/cleanup/${deploymentId}`, {
        method: "POST",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Cleanup failed")
      }

      // Redirect back to field ops
      router.push("/field-ops")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cleanup failed")
    } finally {
      setIsCleaning(false)
    }
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-anime-300">Loading mission...</p>
      </div>
    )
  }

  const deployment = data.deployment
  const validations = data.validations
  const allPassed = validations.length > 0 && validations.every((v) => v.passed)

  // Placeholder objectives
  const objectives = [
    "Ingest raw data into Bronze layer",
    "Clean and deduplicate data in Silver layer",
    "Create business-ready tables in Gold layer",
    "Implement data quality checks",
    "Pass all validation queries",
  ]

  const completed = validations.map((v) => v.passed)

  return (
    <div className="py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <a
            href="/field-ops"
            className="text-anime-cyan hover:text-anime-accent mb-4 inline-block"
          >
            ← Back to Field Operations
          </a>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-6xl">{config.emoji}</span>
              <div>
                <h1 className="font-heading text-4xl text-anime-cyan">
                  {config.title}
                </h1>
                <p className="text-anime-300">Status: {deployment.status}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Objectives & Links */}
          <div className="space-y-6">
            {/* Objectives */}
            <div className="cut-corner bg-anime-900 border border-anime-700 p-6">
              <h2 className="font-heading text-2xl text-anime-cyan mb-3">
                🎯 Objectives ({completed.filter(Boolean).length}/{objectives.length})
              </h2>
              <ObjectivesList objectives={objectives} completed={completed} />
            </div>

            {/* Quick Links */}
            <div className="cut-corner bg-anime-900 border border-anime-700 p-6">
              <h2 className="font-heading text-2xl text-anime-cyan mb-3">
                🔗 Quick Links
              </h2>
              <p className="text-anime-500 text-sm mb-3">
                Schema: <code className="text-anime-cyan">{deployment.schemaPrefix}</code>
              </p>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-anime-cyan hover:text-anime-accent"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    → Open in Databricks
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-anime-cyan hover:text-anime-accent"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    → View Notebooks
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-anime-cyan hover:text-anime-accent"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    → Catalog Explorer
                  </a>
                </li>
              </ul>
            </div>

            {/* Hints */}
            <div className="cut-corner bg-anime-900 border border-anime-700 p-6">
              <h2 className="font-heading text-2xl text-anime-cyan mb-3">
                💡 Hints
              </h2>
              <ol className="space-y-2 text-anime-300 list-decimal list-inside">
                <li>Check the Bronze layer for data ingestion issues</li>
                <li>Look for duplicate records in transformations</li>
                <li>Validate schema names match the deployment prefix</li>
              </ol>
            </div>
          </div>

          {/* Right Column - Validation & Actions */}
          <div className="space-y-6">
            {/* Actions */}
            <div className="cut-corner bg-anime-900 border border-anime-700 p-6">
              <h2 className="font-heading text-2xl text-anime-cyan mb-4">
                ⚙️ Actions
              </h2>
              <div className="space-y-3">
                <button
                  onClick={handleValidate}
                  disabled={isValidating}
                  className="w-full cut-corner bg-anime-cyan hover:bg-anime-accent text-anime-950 font-semibold py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isValidating ? "Validating..." : "🔍 Validate Progress"}
                </button>

                {allPassed && (
                  <button
                    onClick={handleComplete}
                    disabled={isCompleting}
                    className="w-full cut-corner bg-anime-green hover:bg-anime-green/80 text-anime-950 font-semibold py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCompleting ? "Completing..." : "✓ Complete Mission"}
                  </button>
                )}

                <button
                  onClick={handleCleanup}
                  disabled={isCleaning}
                  className="w-full cut-corner bg-anime-accent hover:bg-anime-accent/80 text-white font-semibold py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCleaning ? "Cleaning..." : "🗑️ Cleanup Resources"}
                </button>
              </div>
            </div>

            {/* Validation Results */}
            {validations.length > 0 && (
              <ValidationResults validations={validations} />
            )}

            {/* Error Message */}
            {error && (
              <div className="cut-corner bg-anime-accent/10 border border-anime-accent p-4">
                <p className="text-anime-accent">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
