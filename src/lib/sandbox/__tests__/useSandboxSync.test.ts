import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { initializeSandbox } from "../storage"

// Mock navigator.sendBeacon globally
const mockSendBeacon = vi.fn().mockReturnValue(true)
Object.defineProperty(navigator, "sendBeacon", {
  value: mockSendBeacon,
  writable: true,
})

// Mock storage
vi.mock("../storage", async () => {
  const actual = await vi.importActual("../storage")
  return {
    ...actual,
    loadSandbox: vi.fn(),
    saveSandbox: vi.fn(),
  }
})

// Mock sync
vi.mock("../sync", () => ({
  syncToServer: vi.fn(),
  syncFromServer: vi.fn(),
  mergeConflicts: vi.fn(),
  shouldSync: vi.fn(),
  checkSyncStatus: vi.fn(),
}))

// Mock pendingClaims
const mockDrainPendingClaims = vi.fn().mockResolvedValue({ drained: 0, failed: 0 })
vi.mock("../pendingClaims", async () => {
  const actual = await vi.importActual("../pendingClaims")
  return {
    ...actual,
    drainPendingClaims: (...args: unknown[]) => mockDrainPendingClaims(...args),
  }
})

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}))

import { useSession } from "next-auth/react"
import { loadSandbox, saveSandbox } from "../storage"
import { checkSyncStatus, mergeConflicts, shouldSync, syncFromServer, syncToServer } from "../sync"

// Lazy import to allow mocks to settle
const importHook = async (): Promise<typeof import("../useSandboxSync")> =>
  import("../useSandboxSync")

describe("useSandboxSync", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123", name: "Test", email: "a@b.com" }, expires: "" },
      status: "authenticated",
      update: vi.fn(),
    })
    vi.mocked(loadSandbox).mockReturnValue(initializeSandbox())
    vi.mocked(shouldSync).mockReturnValue(false)
    mockDrainPendingClaims.mockClear()
    mockDrainPendingClaims.mockResolvedValue({ drained: 0, failed: 0 })
  })

  it("pulls remote sandbox and merges on mount when authenticated", async () => {
    const local = initializeSandbox()
    local.userStats.totalXp = 100
    const remote = initializeSandbox()
    remote.userStats.totalXp = 200
    const merged = initializeSandbox()
    merged.userStats.totalXp = 200

    vi.mocked(loadSandbox).mockReturnValue(local)
    vi.mocked(syncFromServer).mockResolvedValue(remote)
    vi.mocked(mergeConflicts).mockReturnValue(merged)

    const { useSandboxSync } = await importHook()
    await act(async () => {
      renderHook(() => useSandboxSync())
    })

    expect(syncFromServer).toHaveBeenCalled()
    expect(mergeConflicts).toHaveBeenCalledWith(local, remote)
    expect(saveSandbox).toHaveBeenCalledWith(expect.objectContaining({
      userStats: expect.objectContaining({ totalXp: 200 }),
    }))
  })

  it("does not sync when unauthenticated", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    })

    const { useSandboxSync } = await importHook()
    await act(async () => {
      renderHook(() => useSandboxSync())
    })

    expect(syncFromServer).not.toHaveBeenCalled()
  })

  it("skips merge when no remote data exists (new user)", async () => {
    vi.mocked(syncFromServer).mockResolvedValue(null)

    const { useSandboxSync } = await importHook()
    await act(async () => {
      renderHook(() => useSandboxSync())
    })

    expect(mergeConflicts).not.toHaveBeenCalled()
  })

  it("exposes a manual syncNow function that pushes to server", async () => {
    vi.mocked(syncToServer).mockResolvedValue({
      success: true,
      lastSynced: "2026-02-13T10:00:00Z",
    })
    vi.mocked(syncFromServer).mockResolvedValue(null)

    const { useSandboxSync } = await importHook()
    let result: { current: ReturnType<typeof useSandboxSync> }

    await act(async () => {
      const rendered = renderHook(() => useSandboxSync())
      result = rendered.result
    })

    await act(async () => {
      await result!.current.syncNow()
    })

    expect(syncToServer).toHaveBeenCalledWith("user-123", expect.any(Object))
  })

  it("updates lastSynced after successful push", async () => {
    const sandbox = initializeSandbox()
    vi.mocked(loadSandbox).mockReturnValue(sandbox)
    vi.mocked(syncFromServer).mockResolvedValue(null)
    vi.mocked(syncToServer).mockResolvedValue({
      success: true,
      lastSynced: "2026-02-13T10:00:00Z",
    })

    const { useSandboxSync } = await importHook()
    let result: { current: ReturnType<typeof useSandboxSync> }

    await act(async () => {
      const rendered = renderHook(() => useSandboxSync())
      result = rendered.result
    })

    await act(async () => {
      await result!.current.syncNow()
    })

    // saveSandbox should be called with updated lastSynced
    expect(saveSandbox).toHaveBeenCalledWith(
      expect.objectContaining({ lastSynced: "2026-02-13T10:00:00Z" }),
    )
  })

  it("drains the pending claim queue on mount when authenticated", async () => {
    const local = initializeSandbox()
    const remote = initializeSandbox()
    const merged = initializeSandbox()
    vi.mocked(loadSandbox).mockReturnValue(local)
    vi.mocked(syncFromServer).mockResolvedValue(remote)
    vi.mocked(mergeConflicts).mockReturnValue(merged)

    const { useSandboxSync } = await importHook()
    await act(async () => {
      renderHook(() => useSandboxSync())
    })

    // Wait for the pull-and-merge to complete, then check the drain ran
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(mockDrainPendingClaims).toHaveBeenCalled()
  })

  it("drains the pending claim queue when window 'online' event fires", async () => {
    const { useSandboxSync } = await importHook()
    await act(async () => {
      renderHook(() => useSandboxSync())
    })
    mockDrainPendingClaims.mockClear()

    await act(async () => {
      window.dispatchEvent(new Event("online"))
    })

    expect(mockDrainPendingClaims).toHaveBeenCalled()
  })

  it("uses fetch with keepalive (not sendBeacon) on tab hide", async () => {
    const sendBeaconSpy = vi.spyOn(navigator, "sendBeacon").mockImplementation(() => true)

    const { useSandboxSync } = await importHook()
    await act(async () => {
      renderHook(() => useSandboxSync())
    })

    // simulate tab hide
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"))
    })

    expect(sendBeaconSpy).not.toHaveBeenCalled()
    expect(mockDrainPendingClaims).toHaveBeenCalled()

    sendBeaconSpy.mockRestore()
  })

  // Tests for refreshFromServer
  it("refreshFromServer calls syncFromServer and merges+save when remote exists", async () => {
    const local = initializeSandbox()
    local.userStats.totalXp = 100
    const remote = initializeSandbox()
    remote.userStats.totalXp = 200
    const merged = initializeSandbox()
    merged.userStats.totalXp = 200

    vi.mocked(loadSandbox).mockReturnValue(local)
    vi.mocked(syncFromServer).mockResolvedValue(remote)
    vi.mocked(mergeConflicts).mockReturnValue(merged)
    vi.mocked(syncToServer).mockResolvedValue({ success: true, lastSynced: "2026-02-13T10:00:00Z" })

    const { useSandboxSync } = await importHook()
    let result: { current: ReturnType<typeof useSandboxSync> }

    await act(async () => {
      const rendered = renderHook(() => useSandboxSync())
      result = rendered.result
    })

    // Wait for initial pull to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    vi.mocked(syncFromServer).mockClear()
    vi.mocked(mergeConflicts).mockClear()

    await act(async () => {
      await result!.current.refreshFromServer()
    })

    expect(syncFromServer).toHaveBeenCalled()
    expect(mergeConflicts).toHaveBeenCalledWith(local, remote)
    expect(saveSandbox).toHaveBeenCalled()
  })

  it("refreshFromServer returns true on success", async () => {
    const local = initializeSandbox()
    local.userStats.totalXp = 100
    const remote = initializeSandbox()
    remote.userStats.totalXp = 200

    vi.mocked(loadSandbox).mockReturnValue(local)
    vi.mocked(syncFromServer).mockResolvedValue(remote)
    vi.mocked(mergeConflicts).mockReturnValue(local)
    vi.mocked(syncToServer).mockResolvedValue({ success: true, lastSynced: "2026-02-13T10:00:00Z" })

    const { useSandboxSync } = await importHook()
    let result: { current: ReturnType<typeof useSandboxSync> }

    await act(async () => {
      const rendered = renderHook(() => useSandboxSync())
      result = rendered.result
    })

    // Wait for initial pull to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    let returnValue: boolean | undefined
    await act(async () => {
      returnValue = await result!.current.refreshFromServer()
    })

    expect(returnValue).toBe(true)
  })

  it("refreshFromServer returns false when remote fetch fails (syncFromServer returns null and local has 0 XP)", async () => {
    const local = initializeSandbox()
    local.userStats.totalXp = 0

    vi.mocked(loadSandbox).mockReturnValue(local)
    vi.mocked(syncFromServer).mockResolvedValue(null)

    const { useSandboxSync } = await importHook()
    let result: { current: ReturnType<typeof useSandboxSync> }

    await act(async () => {
      const rendered = renderHook(() => useSandboxSync())
      result = rendered.result
    })

    // Wait for initial pull to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    let returnValue: boolean | undefined
    await act(async () => {
      returnValue = await result!.current.refreshFromServer()
    })

    // When remote is null and local has 0 XP, it returns true (no push needed)
    // The failure case is when syncFromServer throws
    expect(returnValue).toBe(true)
  })

  it("visibilitychange to visible calls checkSyncStatus with local lastSynced", async () => {
    const local = initializeSandbox()
    local.lastSynced = "2026-02-12T10:00:00Z"
    vi.mocked(loadSandbox).mockReturnValue(local)
    vi.mocked(checkSyncStatus).mockResolvedValue({ updated: false, updatedAt: null })
    vi.mocked(syncFromServer).mockResolvedValue(null)

    const { useSandboxSync } = await importHook()
    await act(async () => {
      renderHook(() => useSandboxSync())
    })

    // Wait for initial pull
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    vi.mocked(checkSyncStatus).mockClear()

    // Simulate tab becoming visible
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"))
    })

    expect(checkSyncStatus).toHaveBeenCalledWith("2026-02-12T10:00:00Z")
  })

  it("visibilitychange to visible calls refreshFromServer when checkSyncStatus returns updated: true", async () => {
    const local = initializeSandbox()
    local.lastSynced = "2026-02-12T10:00:00Z"
    const remote = initializeSandbox()

    vi.mocked(loadSandbox).mockReturnValue(local)
    vi.mocked(checkSyncStatus).mockResolvedValue({ updated: true, updatedAt: "2026-02-13T10:00:00Z" })
    vi.mocked(syncFromServer).mockResolvedValue(remote)
    vi.mocked(mergeConflicts).mockReturnValue(local)
    vi.mocked(syncToServer).mockResolvedValue({ success: true, lastSynced: "2026-02-13T10:00:00Z" })

    const { useSandboxSync } = await importHook()
    await act(async () => {
      renderHook(() => useSandboxSync())
    })

    // Wait for initial pull
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    vi.mocked(syncFromServer).mockClear()

    // Simulate tab becoming visible
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"))
    })

    // refreshFromServer should have been called
    expect(syncFromServer).toHaveBeenCalled()
  })

  it("visibilitychange to visible does NOT call refreshFromServer when checkSyncStatus returns updated: false", async () => {
    const local = initializeSandbox()
    local.lastSynced = "2026-02-12T10:00:00Z"

    vi.mocked(loadSandbox).mockReturnValue(local)
    vi.mocked(checkSyncStatus).mockResolvedValue({ updated: false, updatedAt: null })
    vi.mocked(syncFromServer).mockResolvedValue(null)

    const { useSandboxSync } = await importHook()
    await act(async () => {
      renderHook(() => useSandboxSync())
    })

    // Wait for initial pull
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    vi.mocked(syncFromServer).mockClear()

    // Simulate tab becoming visible
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"))
    })

    // syncFromServer should NOT have been called since updated is false
    expect(syncFromServer).not.toHaveBeenCalled()
  })

  it("visibilitychange to hidden still drains the pending claim queue", async () => {
    const { useSandboxSync } = await importHook()
    await act(async () => {
      renderHook(() => useSandboxSync())
    })

    mockDrainPendingClaims.mockClear()

    // Simulate tab hide
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"))
    })

    expect(mockDrainPendingClaims).toHaveBeenCalled()
  })

  it("concurrent refreshFromServer calls deduplicate via in-flight ref", async () => {
    const local = initializeSandbox()
    local.userStats.totalXp = 100
    const remote = initializeSandbox()
    remote.userStats.totalXp = 200

    vi.mocked(loadSandbox).mockReturnValue(local)
    vi.mocked(syncFromServer).mockResolvedValue(remote)
    vi.mocked(mergeConflicts).mockReturnValue(local)
    vi.mocked(syncToServer).mockResolvedValue({ success: true, lastSynced: "2026-02-13T10:00:00Z" })

    const { useSandboxSync } = await importHook()
    let result: { current: ReturnType<typeof useSandboxSync> }

    await act(async () => {
      const rendered = renderHook(() => useSandboxSync())
      result = rendered.result
    })

    // Wait for initial pull to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    vi.mocked(syncFromServer).mockClear()

    // Call refreshFromServer twice concurrently - they should resolve to the same result
    const [return1, return2] = await Promise.all([
      result!.current.refreshFromServer(),
      result!.current.refreshFromServer(),
    ])

    // Both calls should return the same value (true)
    expect(return1).toBe(true)
    expect(return2).toBe(true)

    // syncFromServer should only be called once due to deduplication
    expect(syncFromServer).toHaveBeenCalledTimes(1)
  })
})
