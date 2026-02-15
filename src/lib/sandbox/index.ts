/**
 * Browser Sandbox
 * 
 * localStorage-based progress storage with server sync for cross-device continuity.
 * All progress stored in browser, syncs to DB on login to enable seamless access
 * across multiple devices.
 */

// Types and schemas
export type {
    ChallengeResult, FlashcardProgress, MissionProgress, SandboxData, StageProgress, SyncResult, UserStats
} from "./types"

export {
    ChallengeResultSchema, FlashcardProgressSchema, MAX_CHALLENGE_XP_COMPLETIONS, MissionProgressSchema, SandboxDataSchema, StageProgressSchema, SyncResultSchema, UserStatsSchema
} from "./types"

// Storage functions
export {
    SANDBOX_KEY, clearSandbox,
    getSandboxSize, initializeSandbox, loadSandbox, recalculateStats, saveSandbox, updateSandbox
} from "./storage"

// Sync functions
export { mergeConflicts, shouldSync, syncFromServer, syncToServer } from "./sync"

// Sync hook (client-only)
export { useSandboxSync } from "./useSandboxSync"
export type { UseSandboxSyncResult } from "./useSandboxSync"

// DAB lifecycle functions
export {
    closeMission, initMission, resetMission, updateBundleStatus
} from "./dabLifecycle"

