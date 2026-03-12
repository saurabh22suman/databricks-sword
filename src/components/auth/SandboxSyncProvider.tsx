/**
 * @file SandboxSyncProvider.tsx
 * @description Client wrapper that activates sandbox sync for authenticated users
 * and exposes `syncNow` via React context so any child component can trigger
 * an immediate server push after earning XP.
 * Mount inside the root layout below SessionProvider.
 */

"use client"

import { useSandboxSync } from "@/lib/sandbox/useSandboxSync"
import React, { createContext, useContext } from "react"

type SandboxSyncContextValue = {
  /** Push current sandbox to server immediately */
  syncNow: () => Promise<void>
  /** Whether initial pull/merge sync completed for current auth session */
  isInitialSyncComplete: boolean
}

const SandboxSyncContext = createContext<SandboxSyncContextValue>({
  syncNow: async () => {},
  isInitialSyncComplete: false,
})

/**
 * Hook to access `syncNow` from any child component.
 * Call after every XP award to guarantee data is on the server.
 *
 * @returns Object with `syncNow` function
 */
export function useSyncNow(): SandboxSyncContextValue {
  return useContext(SandboxSyncContext)
}

/**
 * Activates background sandbox sync (pull on mount, push on tab hide).
 * Exposes `syncNow` via context for child components to call after XP events.
 */
export function SandboxSyncProvider({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  const { syncNow, isInitialSyncComplete } = useSandboxSync()
  return (
    <SandboxSyncContext.Provider value={{ syncNow, isInitialSyncComplete }}>
      {children}
    </SandboxSyncContext.Provider>
  )
}
