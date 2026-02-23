/**
 * @file useSandboxSync.ts
 * @description React hook that syncs localStorage sandbox to/from Turso DB.
 *
 * On mount (authenticated): pulls remote snapshot, merges with local, saves merged.
 * Exposes `syncNow()` for explicit push after XP events.
 * Registers `visibilitychange` listener for auto-push on tab hide.
 */

"use client"

import { useSession } from "next-auth/react"
import { useCallback, useEffect, useRef } from "react"
import { validateStreakData } from "../gamification/streaks"
import { initializeSandbox, loadSandbox, saveSandbox } from "./storage"
import { mergeConflicts, shouldSync, syncFromServer, syncToServer } from "./sync"

export type UseSandboxSyncResult = {
  /** Push current sandbox to server immediately */
  syncNow: () => Promise<void>
  /** Whether a sync operation is in progress */
  isSyncing: boolean
}

/**
 * Hook that keeps the browser sandbox in sync with the server DB.
 *
 * - On mount (when authenticated): pulls remote, merges with local, saves.
 * - On `visibilitychange` (tab hidden): pushes to server if `shouldSync()`.
 * - Exposes `syncNow()` for manual push after XP events.
 *
 * @returns Object with `syncNow` function and `isSyncing` state
 */
export function useSandboxSync(): UseSandboxSyncResult {
  const { data: session, status } = useSession()
  const isSyncingRef = useRef(false)
  const hasPulledRef = useRef(false)

  const userId = session?.user?.id

  /** Push local sandbox to server, update lastSynced */
  const syncNow = useCallback(async (): Promise<void> => {
    if (!userId || isSyncingRef.current) return
    isSyncingRef.current = true

    try {
      const sandbox = loadSandbox() ?? initializeSandbox()
      const result = await syncToServer(userId, sandbox)

      if (result.success && result.lastSynced) {
        saveSandbox({ ...sandbox, lastSynced: result.lastSynced })
      }
    } finally {
      isSyncingRef.current = false
    }
  }, [userId])

  // Pull remote on mount when authenticated
  useEffect(() => {
    if (status !== "authenticated" || !userId || hasPulledRef.current) return
    hasPulledRef.current = true

    const pullAndMerge = async (): Promise<void> => {
      isSyncingRef.current = true

      try {
        const local = loadSandbox() ?? initializeSandbox()
        const remote = await syncFromServer(userId)

        if (remote) {
          const merged = mergeConflicts(local, remote)

          // Validate and decay streak if needed
          const today = new Date().toISOString().split("T")[0]
          const validatedStreakData = validateStreakData(merged.streakData, today)
          const validatedMerged = {
            ...merged,
            streakData: validatedStreakData,
            userStats: {
              ...merged.userStats,
              currentStreak: validatedStreakData.currentStreak,
              longestStreak: validatedStreakData.longestStreak,
            },
          }

          const lastSynced = new Date().toISOString()
          saveSandbox({ ...validatedMerged, lastSynced })

          // Push merged result back so server always has latest
          await syncToServer(userId, { ...validatedMerged, lastSynced })
        } else if (local.userStats.totalXp > 0) {
          // No remote snapshot exists — push local data to server
          const result = await syncToServer(userId, local)
          if (result.success && result.lastSynced) {
            saveSandbox({ ...local, lastSynced: result.lastSynced })
          }
        }
      } finally {
        isSyncingRef.current = false
      }
    }

    void pullAndMerge()
  }, [status, userId])

  // Auto-push on tab hide / beforeunload
  useEffect(() => {
    if (status !== "authenticated" || !userId) return

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === "hidden") {
        const sandbox = loadSandbox()
        if (sandbox && shouldSync(sandbox)) {
          // Use sendBeacon for reliability on tab close
          const blob = new Blob([JSON.stringify(sandbox)], {
            type: "application/json",
          })
          navigator.sendBeacon("/api/user/sync", blob)
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [status, userId])

  return { syncNow, isSyncing: isSyncingRef.current }
}
