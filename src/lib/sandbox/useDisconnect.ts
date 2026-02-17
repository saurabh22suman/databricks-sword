/**
 * @file useDisconnect.ts
 * @description Hook that handles the full disconnect (sign-out) flow:
 *
 * 1. Shows the SyncProgressDialog (via returned `isSyncing` state)
 * 2. Syncs localStorage sandbox data to Turso DB
 * 3. Clears localStorage sandbox
 * 4. Calls NextAuth signOut
 *
 * Used by ProfileSidebar and Settings page "Disconnect" / "Sign Out" buttons.
 */

"use client"

import { clearSandbox, initializeSandbox, loadSandbox, syncToServer } from "@/lib/sandbox"
import { signOut, useSession } from "next-auth/react"
import { useCallback, useState } from "react"

export type UseDisconnectResult = {
  /** Initiate the disconnect flow (sync → clear → sign out) */
  disconnect: () => Promise<void>
  /** Whether the sync/disconnect is in progress */
  isSyncing: boolean
}

/**
 * Hook that orchestrates the full disconnect sequence.
 *
 * When `disconnect()` is called:
 * 1. Sets `isSyncing = true` (caller should show SyncProgressDialog)
 * 2. Loads sandbox from localStorage
 * 3. Pushes sandbox to server via `POST /api/user/sync`
 * 4. Clears sandbox from localStorage
 * 5. Calls `signOut({ callbackUrl: "/" })` to redirect
 *
 * If sync fails (network error, unauthenticated), sign-out still proceeds
 * to avoid trapping the user. The data remains in localStorage as fallback
 * only if the sync itself threw before clearing.
 *
 * @returns Object with `disconnect` function and `isSyncing` state
 */
export function useDisconnect(): UseDisconnectResult {
  const { data: session } = useSession()
  const [isSyncing, setIsSyncing] = useState(false)

  const disconnect = useCallback(async (): Promise<void> => {
    setIsSyncing(true)

    try {
      const userId = session?.user?.id
      const sandbox = loadSandbox() ?? initializeSandbox()

      if (userId) {
        // Attempt to sync — best-effort, don't block sign-out on failure
        try {
          await syncToServer(userId, sandbox)
        } catch (syncError) {
          console.error("[useDisconnect] Sync failed, proceeding with sign-out:", syncError)
        }
      }

      // Clear localStorage after successful sync (or best-effort attempt)
      clearSandbox()
    } catch (error) {
      console.error("[useDisconnect] Error during disconnect:", error)
    } finally {
      // Always sign out, even if sync or clear failed
      await signOut({ callbackUrl: "/" })
    }
  }, [session?.user?.id])

  return { disconnect, isSyncing }
}
