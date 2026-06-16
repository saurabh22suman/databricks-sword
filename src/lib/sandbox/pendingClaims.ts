/**
 * @file pendingClaims.ts
 * @description Persistent queue for offline XP claims.
 *
 * When the client cannot reach the server (network error), the claim
 * request is pushed here instead of being silently lost. The queue lives
 * in the sandbox (localStorage) so it survives tab close / reload.
 *
 * Drained on:
 *  - `useSandboxSync` mount (after the initial pull)
 *  - `navigator.online` / `online` event
 *  - After every successful claim
 */

import type { PendingClaim } from "./types"
import { loadSandbox, updateSandbox } from "./storage"

type DrainResult = { drained: number; failed: number }

const CLAIM_ENDPOINTS: Record<PendingClaim["type"], string> = {
  stage: "/api/progress/stage",
  mission: "/api/progress/mission",
  challenge: "/api/progress/challenge",
  achievement: "/api/progress/achievement",
}

function bodyFor(claim: PendingClaim): Record<string, unknown> {
  switch (claim.type) {
    case "stage":
      return {
        missionId: claim.missionId,
        stageId: claim.stageId,
        attempts: claim.attempts,
        hintsUsed: claim.hintsUsed,
      }
    case "mission":
      return { missionId: claim.missionId }
    case "challenge":
      return { challengeId: claim.challengeId }
    case "achievement":
      return { achievementId: claim.achievementId }
  }
}

/** Append a claim to the queue. No-op if `loadSandbox` returns null. */
export function enqueuePendingClaim(claim: PendingClaim): void {
  updateSandbox((data) => ({
    ...data,
    pendingClaims: [...(data.pendingClaims ?? []), claim],
  }))
}

/** Read the current queue (returns [] if no sandbox). */
export function getPendingClaims(): PendingClaim[] {
  return loadSandbox()?.pendingClaims ?? []
}

/**
 * Attempt to drain the queue by replaying each claim through its endpoint.
 * Returns counts of drained and failed claims. On failure, the claim
 * stays in the queue for the next drain attempt.
 */
export async function drainPendingClaims(): Promise<DrainResult> {
  const sandbox = loadSandbox()
  if (!sandbox) return { drained: 0, failed: 0 }
  const queue = sandbox.pendingClaims ?? []
  if (queue.length === 0) return { drained: 0, failed: 0 }

  let drained = 0
  let failed = 0

  for (const claim of queue) {
    try {
      const response = await fetch(CLAIM_ENDPOINTS[claim.type], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyFor(claim)),
      })
      if (response.ok) {
        // Success — remove from queue
        updateSandbox((data) => ({
          ...data,
          pendingClaims: (data.pendingClaims ?? []).filter(
            (c) => c.queuedAt !== claim.queuedAt,
          ),
        }))
        drained += 1
      } else {
        failed += 1
      }
    } catch {
      // Network error — keep in queue
      failed += 1
    }
  }

  return { drained, failed }
}