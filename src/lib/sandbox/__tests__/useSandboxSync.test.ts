import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { initializeSandbox } from "../storage"

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
}))

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}))

import { useSession } from "next-auth/react"
import { loadSandbox, saveSandbox } from "../storage"
import { mergeConflicts, shouldSync, syncFromServer, syncToServer } from "../sync"

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
})
