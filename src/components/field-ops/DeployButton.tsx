/**
 * Deploy Button Component
 * Button with loading state for mission deployment.
 */

"use client"

import type { Industry } from "@/lib/field-ops/types"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useState } from "react"

type DeployButtonProps = {
  industry: Industry
  isConnected: boolean
  disabled?: boolean
  className?: string
}

/**
 * Deploy Mission button with loading state.
 * Handles deployment API call and redirects to active mission page.
 */
export function DeployButton({
  industry,
  isConnected,
  disabled = false,
  className,
}: DeployButtonProps): React.ReactElement {
  const router = useRouter()
  const [isDeploying, setIsDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDeploy = async () => {
    if (!isConnected) {
      setError("Please connect Databricks in Settings first")
      return
    }

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
      setIsDeploying(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleDeploy}
        disabled={isDeploying || disabled || !isConnected}
        className={cn(
          "cut-corner font-semibold px-8 py-3 text-lg transition-all duration-300",
          isConnected
            ? "bg-anime-cyan hover:bg-anime-accent text-anime-950"
            : "bg-anime-800 text-anime-500 cursor-not-allowed",
          isDeploying && "animate-pulse",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        {isDeploying ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Deploying...
          </span>
        ) : !isConnected ? (
          "🔌 Connect Databricks First"
        ) : (
          "🚀 Deploy Mission"
        )}
      </button>

      {error && (
        <p className="text-anime-accent text-sm">{error}</p>
      )}
    </div>
  )
}
