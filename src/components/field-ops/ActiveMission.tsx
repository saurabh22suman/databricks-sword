/**
 * Active Mission Component
 * Main interface for working on a deployed Field Ops mission.
 */

"use client"

import { useSyncNow } from "@/components/auth"
import { buildFieldOpsLinks } from "@/lib/field-ops/links"
import type { Industry, IndustryConfig } from "@/lib/field-ops/types"
import { updateSandbox } from "@/lib/sandbox"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ConfirmDialog } from "../ui/ConfirmDialog"
import { ObjectivesList } from "./ObjectivesList"
import { ValidationResults } from "./ValidationResults"

type MissionValidationSummary = {
  checkKey: string
  checkName: string
}

type MissionContentSummary = {
  objectives: string[]
  hints: string[]
  hintsInNotebooks: boolean
  hintsNote?: string
  validations: MissionValidationSummary[]
}

type ActiveMissionProps = {
  deploymentId: string
  industry: Industry
  config: IndustryConfig
  mission: MissionContentSummary
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
    workspaceUrl?: string
    catalogName?: string
    warehouseId?: string
  }
  validationRun?: {
    runId: string
    totalChecks: number
    passedChecks: number
  } | null
  validations: Array<{
    checkKey: string
    checkName: string
    passed: boolean
    executedAt: string
    errorMessage?: string | null
  }>
  operations?: Array<{
    id: string
    type: string
    state: string
    requestId: string
    correlationId: string
    durationMs: number | null
    retryCount: number
    failureClass: string | null
  }>
  metadata?: {
    requestId: string
    staleOperationsMarked: number
  }
}

export function ActiveMission({
  deploymentId,
  industry,
  config,
  mission,
}: ActiveMissionProps): React.ReactElement {
  const router = useRouter()
  const { syncNow } = useSyncNow()
  const [data, setData] = useState<DeploymentData | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false)
  const [cleanupSuccess, setCleanupSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(true) // Auto-refresh enabled by default

  // Auto-refresh control - faster when validating
  useEffect(() => {
    loadStatus()
    const intervalMs = isLive ? 5000 : 15000 // 5s live, 15s otherwise
    const interval = setInterval(loadStatus, intervalMs)
    return () => clearInterval(interval)
  }, [deploymentId, isLive])

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
    const idempotencyKey = crypto.randomUUID()
    const requestId = crypto.randomUUID()
    const correlationId = requestId

    setIsValidating(true)
    setError(null)

    try {
      const response = await fetch(`/api/field-ops/validate/${deploymentId}`, {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
          "X-Request-Id": requestId,
          "X-Correlation-Id": correlationId,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Validation failed")
      }

      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed")
    } finally {
      setIsValidating(false)
    }
  }

  const handleComplete = async () => {
    const idempotencyKey = crypto.randomUUID()
    const requestId = crypto.randomUUID()
    const correlationId = requestId

    setIsCompleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/field-ops/complete/${deploymentId}`, {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
          "X-Request-Id": requestId,
          "X-Correlation-Id": correlationId,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to complete mission")
      }

      updateSandbox((sandbox) => {
        const completedFieldOps = sandbox.completedFieldOps || []
        const alreadyCompleted = completedFieldOps.includes(industry)

        return {
          ...sandbox,
          completedFieldOps: alreadyCompleted
            ? completedFieldOps
            : [...completedFieldOps, industry],
        }
      })
      void syncNow()

      const awardedXp = result.xpAwarded || config.xpReward
      alert(result.alreadyAwarded ? "Mission already completed previously." : `Mission complete! +${awardedXp} XP`)
      router.push("/field-ops")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete mission")
    } finally {
      setIsCompleting(false)
    }
  }

  const handleCleanup = async () => {
    const idempotencyKey = crypto.randomUUID()
    const requestId = crypto.randomUUID()
    const correlationId = requestId

    setIsCleaning(true)
    setError(null)

    try {
      const response = await fetch(`/api/field-ops/cleanup/${deploymentId}`, {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
          "X-Request-Id": requestId,
          "X-Correlation-Id": correlationId,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        const failureSummary = Array.isArray(result.failures)
          ? result.failures.map((failure: { resourceType: string; resourceName: string }) => `${failure.resourceType}:${failure.resourceName}`).join(", ")
          : "Cleanup failed"
        throw new Error(result.error ? `${result.error} (${failureSummary})` : failureSummary)
      }

      setShowCleanupConfirm(false)
      setCleanupSuccess(true)
      setTimeout(() => {
        router.push("/field-ops")
      }, 2000)
    } catch (err) {
      setShowCleanupConfirm(false)
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
  const operations = data.operations ?? []
  const allPassed = validations.length > 0 && validations.every((v) => v.passed)

  const validationByKey = validations.reduce<Record<string, boolean>>((acc, validation) => {
    acc[validation.checkKey] = validation.passed
    return acc
  }, {})

  const objectiveChecks = mission.validations.length > 0
    ? mission.validations
    : mission.objectives.map((objective, index) => ({
        checkKey: `objective_${index}`,
        checkName: objective,
      }))

  const objectives = objectiveChecks.map((validation) => validation.checkName)
  const completed = objectiveChecks.map((validation) => validationByKey[validation.checkKey] ?? false)

  const links = buildFieldOpsLinks({
    workspaceUrl: deployment.workspaceUrl,
    catalogName: deployment.catalogName,
    schemaPrefix: deployment.schemaPrefix,
  })

  const hints = mission.hints.length > 0
    ? mission.hints
    : ["Use the notebook comments and query results to diagnose failures."]

  return (
    <div className="py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Real Databricks Warning Banner */}
        <div className="mb-6 p-4 bg-anime-800/80 border border-anime-600 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-anime-100 font-semibold">
                Running on YOUR Databricks workspace
              </p>
              <p className="text-anime-400 text-sm mt-1">
                This mission deploys real resources to your connected workspace.
                Estimated cost: <span className="text-anime-cyan">~$0.25-1.00 credit</span>.
                Use <code className="text-anime-accent">Detach</code> button to clean up when done.
              </p>
            </div>
          </div>
        </div>

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
                {data.validationRun && (
                  <p className="text-anime-500 text-sm">
                    Latest run: {data.validationRun.passedChecks}/{data.validationRun.totalChecks} checks passed
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="cut-corner bg-anime-900 border border-anime-700 p-6">
              <h2 className="font-heading text-2xl text-anime-cyan mb-3">
                🎯 Objectives ({completed.filter(Boolean).length}/{objectives.length})
              </h2>
              <ObjectivesList objectives={objectives} completed={completed} />
            </div>

            <div className="cut-corner bg-anime-900 border border-anime-700 p-6">
              <h2 className="font-heading text-2xl text-anime-cyan mb-3">
                🔗 Quick Links
              </h2>
              <p className="text-anime-500 text-sm mb-3">
                Schema prefix: <code className="text-anime-cyan">{deployment.schemaPrefix}</code>
              </p>
              <ul className="space-y-2">
                {links.workspace && (
                  <li>
                    <a
                      href={links.workspace}
                      className="text-anime-cyan hover:text-anime-accent"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      → Open Databricks Workspace
                    </a>
                  </li>
                )}
                {links.notebooks && (
                  <li>
                    <a
                      href={links.notebooks}
                      className="text-anime-cyan hover:text-anime-accent"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      → Open Deployed Notebooks
                    </a>
                  </li>
                )}
                {links.explorerBronze && (
                  <li>
                    <a
                      href={links.explorerBronze}
                      className="text-anime-cyan hover:text-anime-accent"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      → Bronze Schema Explorer
                    </a>
                  </li>
                )}
                {links.explorerSilver && (
                  <li>
                    <a
                      href={links.explorerSilver}
                      className="text-anime-cyan hover:text-anime-accent"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      → Silver Schema Explorer
                    </a>
                  </li>
                )}
                {links.explorerGold && (
                  <li>
                    <a
                      href={links.explorerGold}
                      className="text-anime-cyan hover:text-anime-accent"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      → Gold Schema Explorer
                    </a>
                  </li>
                )}

                {/* dbdemos link for more practice */}
                <li className="pt-3 border-t border-anime-700 mt-3">
                  <a
                    href="/blog/databricks-db-demos"
                    className="text-anime-purple hover:text-anime-cyan flex items-center gap-2"
                  >
                    <span>🚀</span>
                    <span>Want more real-world examples?</span>
                  </a>
                  <p className="text-anime-500 text-xs mt-1 ml-6">
                    Explore dbdemos for production-grade demos
                  </p>
                </li>

                {!links.workspace && (
                  <li className="text-anime-500 italic">
                    No connection info available
                  </li>
                )}
              </ul>
            </div>

            <div className="cut-corner bg-anime-900 border border-anime-700 p-6">
              <h2 className="font-heading text-2xl text-anime-cyan mb-3">
                💡 Hints
              </h2>
              <ol className="space-y-2 text-anime-300 list-decimal list-inside">
                {hints.map((hint, index) => (
                  <li key={index}>{hint}</li>
                ))}
              </ol>
              {mission.hintsInNotebooks && mission.hintsNote && (
                <p className="text-anime-500 text-sm mt-3">{mission.hintsNote}</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Live Mode Toggle */}
            <div className="cut-corner bg-anime-900 border border-anime-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-anime-100 font-medium">Auto-refresh</p>
                  <p className="text-anime-500 text-sm">
                    {isLive ? "Updates every 5 seconds" : "Updates every 15 seconds"}
                  </p>
                </div>
                <button
                  onClick={() => setIsLive(!isLive)}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-all
                    ${isLive
                      ? "bg-anime-cyan text-anime-950"
                      : "bg-anime-800 text-anime-400 border border-anime-700"
                    }
                  `}
                >
                  {isLive ? "● Live" : "○ Paused"}
                </button>
              </div>
            </div>

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
                  onClick={() => setShowCleanupConfirm(true)}
                  disabled={isCleaning}
                  className="w-full cut-corner bg-anime-accent hover:bg-anime-accent/80 text-white font-semibold py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCleaning ? "Cleaning..." : "🗑️ Cleanup Resources"}
                </button>
              </div>
            </div>

            {validations.length > 0 && (
              <ValidationResults validations={validations} isLive={isLive && isValidating} />
            )}

            {operations.length > 0 && (
              <div className="cut-corner bg-anime-900 border border-anime-700 p-6">
                <h2 className="font-heading text-2xl text-anime-cyan mb-3">Recent Operations</h2>
                <div className="space-y-3">
                  {operations.map((operation) => (
                    <div
                      key={operation.id}
                      className="rounded border border-anime-700/70 bg-anime-950/70 p-3"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <p className="text-anime-cyan font-medium uppercase tracking-wide">
                          {operation.type.replaceAll("_", " ")}
                        </p>
                        <p className="text-anime-300 uppercase">{operation.state}</p>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-anime-400 sm:grid-cols-2">
                        <p>Duration: {operation.durationMs ?? "—"}ms</p>
                        <p>Retries: {operation.retryCount}</p>
                        <p>Failure class: {operation.failureClass ?? "none"}</p>
                        <p>Request ID: {operation.requestId}</p>
                        <p className="sm:col-span-2">Correlation ID: {operation.correlationId}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="cut-corner bg-anime-accent/10 border border-anime-accent p-4">
                <p className="text-anime-accent">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showCleanupConfirm}
        title="🗑️ Cleanup Resources"
        description="This will permanently delete all deployed schemas, volumes, and notebooks from your Databricks workspace. This action cannot be undone."
        confirmLabel="Delete Resources"
        cancelLabel="Cancel"
        variant="danger"
        loading={isCleaning}
        onConfirm={handleCleanup}
        onCancel={() => setShowCleanupConfirm(false)}
      />

      {cleanupSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="cut-corner bg-anime-900 border border-anime-green px-6 py-3 shadow-neon-cyan/30">
            <p className="text-anime-green font-medium">
              ✓ Resources cleaned up successfully. Redirecting...
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
