"use client"

import { loadSandbox } from "@/lib/sandbox"

/**
 * Returns true if the user has completed at least one mission in their
 * local sandbox. Reads synchronously from localStorage on first render.
 *
 * The root layout has `suppressHydrationWarning` to handle the brief
 * server-vs-client difference (server has no localStorage).
 *
 * If we later need reactivity, subscribe to a `sandbox:updated` event.
 */
export function useHasCompletedMission(): boolean {
  const sandbox = loadSandbox()
  if (!sandbox) return false
  return Object.values(sandbox.missionProgress).some((mp) => mp.completed)
}
