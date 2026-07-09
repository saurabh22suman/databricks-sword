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
  checkSyncStatus,
  mergeConflicts,
  shouldSync,
  syncFromServer,
  syncToServer,
} from "./sync"
import { drainPendingClaims } from "./pendingClaims"

export type UseSandboxSyncResult = {
  /** Push current sandbox to server immediately */
  syncNow: () => Promise<boolean>
  /** Pull and merge remote sandbox with local (for manual refresh) */
  refreshFromServer: () => Promise<boolean>
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

    // Use refreshFromServer for the initial pull
    const doInitialPull = async (): Promise<void> => {
      const success = await refreshFromServerInternal()
      setIsInitialSyncComplete(true)
      if (!success) {
        console.warn("Initial pull failed, continuing with local data")
      }
    }

    void doInitialPull()
  }, [status, userId])

  // Internal refresh function (shared by mount, visibility, and manual refresh)
  const refreshFromServerInternal = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      console.warn("refreshFromServer: No userId available, skipping refresh")
      return false
    }

    // Deduplicate concurrent refresh calls
    if (inFlightSyncRef.current) {
      return inFlightSyncRef.current
    }

    const runRefresh = async (): Promise<boolean> => {
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

          // Drain the offline-claim queue now that the user is online
          await drainPendingClaims()

          return true
        } else if (local.userStats.totalXp > 0) {
          // No remote snapshot exists — push local data to server
          const result = await syncToServer(userId, local)
          if (result.success && result.lastSynced) {
            saveSandbox({ ...local, lastSynced: result.lastSynced })
          }
          return result.success
        }

        return true
      } catch (error) {
        console.error("refreshFromServer: Error during refresh:", error)
        return false
      } finally {
        setIsSyncing(false)
        inFlightSyncRef.current = null
      }
    }

    inFlightSyncRef.current = runRefresh()
    return inFlightSyncRef.current
  }, [userId])

  // Exposed refreshFromServer function for manual/visibility-triggered refresh
  const refreshFromServer = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      return false
    }
    return refreshFromServerInternal()
  }, [userId, refreshFromServerInternal])

  // Auto-push on tab hide / beforeunload, plus since-check on tab focus
  useEffect(() => {
    if (status !== "authenticated" || !userId) return

    const handleVisibilityChange = async (): Promise<void> => {
      if (document.visibilityState === "hidden") {
        // Best-effort drain of the offline-claim queue. If the page is
        // actually unloading, fetch + keepalive gives the browser one
        // more chance to deliver the request. We don't await — the
        // beacon/keepalive pattern is fire-and-forget.
        void drainPendingClaims()
      } else if (document.visibilityState === "visible") {
        // Tab gained focus — check if server has newer data
        const local = loadSandbox() ?? initializeSandbox()
        const status = await checkSyncStatus(local.lastSynced)

        if (status.updated) {
          // Server is newer — pull and merge
          await refreshFromServerInternal()
        }

        // Always drain pending claims after potential refresh
        void drainPendingClaims()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [status, userId])

  // Drain queue when the browser regains connectivity
  useEffect(() => {
    if (status !== "authenticated" || !userId) return

    const handleOnline = (): void => {
      void drainPendingClaims()
    }

    window.addEventListener("online", handleOnline)
    return () => {
      window.removeEventListener("online", handleOnline)
    }
  }, [status, userId])

  return {
    syncNow,
    refreshFromServer,
    isSyncing,
    isInitialSyncComplete,
  }
}
