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
import { useCallback, useEffect, useRef, useState } from "react"
import { validateStreakData } from "../gamification/streaks"
import { initializeSandbox, loadSandbox, saveSandbox } from "./storage"
import {
  mergeConflicts,
  shouldSync,
  syncFromServer,
  syncToServer,
} from "./sync"

export type UseSandboxSyncResult = {
  /** Push current sandbox to server immediately */
  syncNow: () => Promise<boolean>
  /** Whether a sync operation is in progress */
  isSyncing: boolean
  /** Whether initial pull/merge sync has completed for this auth session */
  isInitialSyncComplete: boolean
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
  const [isSyncing, setIsSyncing] = useState(false)
  const [isInitialSyncComplete, setIsInitialSyncComplete] = useState(false)

  const hasPulledRef = useRef(false)
  const inFlightSyncRef = useRef<Promise<boolean> | null>(null)

  const userId = session?.user?.id

  /** Push local sandbox to server, update lastSynced */
  const syncNow = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      console.warn("syncNow: No userId available, skipping sync")
      return false
    }

    // If a sync is already in progress, wait for it and return its result.
    // This guarantees callers can force-sync before gated navigation.
    if (inFlightSyncRef.current) {
      return inFlightSyncRef.current
    }

    const runSync = (async (): Promise<boolean> => {
      setIsSyncing(true)

      try {
        const sandbox = loadSandbox() ?? initializeSandbox()
        console.log(
          "syncNow: Syncing sandbox with totalXp:",
          sandbox.userStats.totalXp,
        )

        const result = await syncToServer(userId, sandbox)

        if (result.success && result.lastSynced) {
          saveSandbox({ ...sandbox, lastSynced: result.lastSynced })
          console.log("syncNow: Sync successful, lastSynced:", result.lastSynced)
        } else {
          console.error("syncNow: Sync failed with result:", result)
        }

        return result.success
      } catch (error) {
        console.error("syncNow: Error during sync:", error)
        return false
      } finally {
        setIsSyncing(false)
        inFlightSyncRef.current = null
      }
    })()

    inFlightSyncRef.current = runSync
    return runSync
  }, [userId])

  // Pull remote on mount when authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      setIsInitialSyncComplete(true)
      return
    }

    if (status !== "authenticated" || !userId || hasPulledRef.current) return
    hasPulledRef.current = true
    setIsInitialSyncComplete(false)

    const pullAndMerge = async (): Promise<void> => {
      setIsSyncing(true)

      try {
        const local = loadSandbox() ?? initializeSandbox()
        const remote = await syncFromServer(userId)

        if (remote) {
          const merged = mergeConflicts(local, remote)

          // Validate and decay streak if needed
          const today = new Date().toISOString().split("T")[0]
          const validatedStreakData = validateStreakData(
            merged.streakData,
            today,
          )
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
        setIsSyncing(false)
        setIsInitialSyncComplete(true)
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
          // Update lastSynced timestamp locally BEFORE sending beacon
          // This prevents consecutive merge conflicts on next load
          const now = new Date().toISOString()
          const sandboxWithSync = { ...sandbox, lastSynced: now }
          saveSandbox(sandboxWithSync)

          // Use sendBeacon for reliability on tab close
          const blob = new Blob([JSON.stringify(sandboxWithSync)], {
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

  return {
    syncNow,
    isSyncing,
    isInitialSyncComplete,
  }
}
