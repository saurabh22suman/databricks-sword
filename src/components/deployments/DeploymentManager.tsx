"use client"

import { Database, RefreshCw, Trash2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

export type Deployment = {
  schemaName: string
  industry: string
  userId: string
  timestamp: string
}

/**
 * DeploymentManager Component
 * Lists Field Ops deployments and allows selection/deletion
 */
export function DeploymentManager(): React.ReactElement {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [selectedDeployments, setSelectedDeployments] = useState<Set<string>>(
    new Set(),
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const fetchDeployments = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    setStatusMessage(null)
    try {
      const response = await fetch("/api/databricks/field-ops-deployments")
      const data = await response.json()
      if (response.ok && data.deployments) {
        setDeployments(data.deployments)
      } else {
        setError(data.error || "Failed to load deployments")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load deployments")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchDeployments()
  }, [fetchDeployments])

  const toggleSelection = useCallback((schemaName: string): void => {
    setSelectedDeployments((prev) => {
      const next = new Set(prev)
      if (next.has(schemaName)) {
        next.delete(schemaName)
      } else {
        next.add(schemaName)
      }
      return next
    })
  }, [])

  const handleDelete = useCallback(async (): Promise<void> => {
    if (selectedDeployments.size === 0) return

    const confirmed = window.confirm(
      `Delete ${selectedDeployments.size} selected deployment${selectedDeployments.size === 1 ? "" : "s"}? This cannot be undone.`,
    )
    if (!confirmed) return

    setIsDeleting(true)
    setError(null)
    setStatusMessage(null)

    try {
      const response = await fetch("/api/databricks/field-ops-deployments/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schemaNames: Array.from(selectedDeployments) }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setError(payload?.error || "Failed to delete deployments")
        return
      }

      // Clear selected and refresh list
      setSelectedDeployments(new Set())
      void fetchDeployments()

      // Show success message
      const succeeded = payload.results?.filter((r: { success: boolean }) => r.success).length ?? 0
      setStatusMessage(`Deleted ${succeeded} deployment${succeeded === 1 ? "" : "s"}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete deployments")
    } finally {
      setIsDeleting(false)
    }
  }, [selectedDeployments, fetchDeployments])

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-anime-100 text-sm font-bold flex items-center gap-2">
            <Database className="h-4 w-4 text-anime-cyan" />
            Field Ops Deployments
          </div>
          <div className="text-anime-400 text-xs">
            Select deployments to delete from your Databricks workspace
          </div>
        </div>
        <button
          onClick={() => void fetchDeployments()}
          disabled={isLoading}
          className="text-anime-cyan hover:text-white p-2 rounded-lg hover:bg-anime-800 transition-colors disabled:opacity-50"
          title="Refresh deployments"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && <p className="text-anime-accent text-xs mb-3">{error}</p>}
      {statusMessage && (
        <p className="text-anime-green text-xs mb-3">{statusMessage}</p>
      )}

      {isLoading ? (
        <div className="text-anime-400 text-xs py-4 text-center">
          Loading deployments...
        </div>
      ) : deployments.length === 0 ? (
        <p className="text-anime-500 text-xs py-4 text-center">
          No Field Ops deployments found
        </p>
      ) : (
        <>
          <div className="max-h-64 overflow-y-auto border border-anime-700 rounded-lg">
            {deployments.map((dep) => (
              <div
                key={dep.schemaName}
                className="flex items-center gap-3 px-3 py-2 border-b border-anime-800 last:border-b-0 hover:bg-anime-800/30"
              >
                <input
                  type="checkbox"
                  checked={selectedDeployments.has(dep.schemaName)}
                  onChange={() => toggleSelection(dep.schemaName)}
                  className="accent-anime-cyan h-4 w-4 rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-anime-100 text-xs font-mono truncate">
                    {dep.schemaName}
                  </div>
                  <div className="text-anime-500 text-xs">
                    {dep.industry} • {dep.timestamp || "No timestamp"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedDeployments.size > 0 && (
            <div className="flex items-center justify-between mt-3">
              <span className="text-anime-400 text-xs">
                {selectedDeployments.size} selected
              </span>
              <button
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30 rounded-lg px-3 py-1.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                {isDeleting ? "Deleting..." : "Delete Selected"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}