"use client"

import type { SandboxData } from "./types"

/**
 * Lightweight pub-sub bus for sandbox mutations.
 *
 * Lets components (e.g. the Header XP bar) react when the sandbox
 * changes — without re-mounting on every save. This is the read-side
 * companion to `saveSandbox` / `updateSandbox`: every persist path
 * notifies here, and subscribers re-read `loadSandbox()` to pick up
 * the new XP / streak / achievement values.
 *
 * This bus is intentionally separate from `xpEventBus`:
 * - `xpEventBus` fires for *delta* XP events (mission completed, etc.)
 *   and uses cumulative addition in subscribers.
 * - `sandboxChangeBus` fires for *absolute* state changes (refresh from
 *   server, migration, recalc heal) and subscribers should re-read the
 *   authoritative value from localStorage.
 *
 * Mixing the two would double-count XP on every refresh from server.
 */

export type SandboxChangeListener = () => void

const listeners = new Set<SandboxChangeListener>()

/**
 * Subscribe to sandbox change notifications.
 * Returns an unsubscribe function.
 *
 * @example
 * ```ts
 * const unsubscribe = subscribeSandboxChange(() => {
 *   const sandbox = loadSandbox()
 *   setUserXp(sandbox?.userStats.totalXp ?? 0)
 * })
 * ```
 */
export function subscribeSandboxChange(
  listener: SandboxChangeListener,
): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Notify all subscribers that the sandbox has changed.
 * Called by `saveSandbox` after every write.
 *
 * @internal — should not be called directly outside of the sandbox
 * storage layer.
 */
export function notifySandboxChange(_sandbox?: SandboxData): void {
  // Snapshot listeners first so a listener that unsubscribes itself
  // during dispatch doesn't disturb iteration of the remaining set.
  for (const listener of [...listeners]) {
    try {
      listener()
    } catch (error) {
      // One listener's exception must not block delivery to the
      // remaining subscribers — otherwise a single buggy component
      // can silently freeze the UI when the sandbox updates.
      console.error("[sandboxChangeBus] listener threw:", error)
    }
  }
}