/**
 * Connection Status Component
 * Shows Databricks connection status banner.
 */

"use client"

import { useSyncNow } from "@/components/auth"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

type ConnectionStatusProps = {
  isConnected: boolean
  workspaceUrl?: string
  refreshOnInitialSync?: boolean
}

export function ConnectionStatus({
  isConnected,
  workspaceUrl,
  refreshOnInitialSync = false,
}: ConnectionStatusProps): React.ReactElement {
  const { isInitialSyncComplete } = useSyncNow()
  const router = useRouter()
  const hasRefreshedRef = useRef(false)

  useEffect(() => {
    if (!refreshOnInitialSync || !isInitialSyncComplete || hasRefreshedRef.current) return
    hasRefreshedRef.current = true
    router.refresh()
  }, [isInitialSyncComplete, refreshOnInitialSync, router])
  return (
    <div
      className={cn(
        "cut-corner border p-4 flex items-center justify-between",
        isConnected
          ? "bg-anime-green/10 border-anime-green"
          : "bg-anime-accent/10 border-anime-accent"
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{isConnected ? "✓" : "⚠"}</span>
        <div>
          <p className={cn("font-semibold", isConnected ? "text-anime-green" : "text-anime-accent")}>
            {isConnected ? "Databricks Connected" : "Databricks Not Connected"}
          </p>
          {isConnected && workspaceUrl && (
            <p className="text-anime-300 text-sm">{workspaceUrl}</p>
          )}
          {!isConnected && (
            <p className="text-anime-300 text-sm">
              Connect your workspace to start Field Operations
            </p>
          )}
        </div>
      </div>

      <Link
        href="/settings"
        className="cut-corner bg-anime-cyan hover:bg-anime-accent text-anime-950 font-semibold px-4 py-2 transition-colors"
      >
        {isConnected ? "Manage Connection" : "Connect Now"}
      </Link>
    </div>
  )
}
