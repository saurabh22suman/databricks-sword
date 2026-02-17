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
    clearSandbox: vi.fn(),
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
  signOut: vi.fn(),
}))

import { signOut, useSession } from "next-auth/react"
import { clearSandbox, loadSandbox } from "../storage"
import { syncToServer } from "../sync"

// Lazy import to let mocks settle
const importHook = async (): Promise<typeof import("../useDisconnect")> =>
  import("../useDisconnect")

describe("useDisconnect", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: "user-123", name: "Test", email: "a@b.com" },
        expires: "",
      },
      status: "authenticated",
      update: vi.fn(),
    })
    vi.mocked(loadSandbox).mockReturnValue(initializeSandbox())
    vi.mocked(syncToServer).mockResolvedValue({
      success: true,
      lastSynced: new Date().toISOString(),
    })
    vi.mocked(signOut).mockResolvedValue(undefined as never)
  })

  it("should return isSyncing as false initially", async () => {
    const { useDisconnect } = await importHook()
    const { result } = renderHook(() => useDisconnect())

    expect(result.current.isSyncing).toBe(false)
    expect(typeof result.current.disconnect).toBe("function")
  })

  it("should sync sandbox to server on disconnect", async () => {
    const { useDisconnect } = await importHook()
    const { result } = renderHook(() => useDisconnect())

    await act(async () => {
      await result.current.disconnect()
    })

    expect(syncToServer).toHaveBeenCalledWith("user-123", expect.any(Object))
  })

  it("should clear localStorage after syncing", async () => {
    const { useDisconnect } = await importHook()
    const { result } = renderHook(() => useDisconnect())

    await act(async () => {
      await result.current.disconnect()
    })

    expect(clearSandbox).toHaveBeenCalled()
  })

  it("should call signOut after sync and clear", async () => {
    const { useDisconnect } = await importHook()
    const { result } = renderHook(() => useDisconnect())

    await act(async () => {
      await result.current.disconnect()
    })

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" })
  })

  it("should call signOut even if sync fails", async () => {
    vi.mocked(syncToServer).mockRejectedValue(new Error("Network error"))

    const { useDisconnect } = await importHook()
    const { result } = renderHook(() => useDisconnect())

    await act(async () => {
      await result.current.disconnect()
    })

    // Clear should still be called
    expect(clearSandbox).toHaveBeenCalled()
    // SignOut should still proceed
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" })
  })

  it("should skip sync when user has no ID but still sign out", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: "Test" }, expires: "" },
      status: "authenticated",
      update: vi.fn(),
    })

    const { useDisconnect } = await importHook()
    const { result } = renderHook(() => useDisconnect())

    await act(async () => {
      await result.current.disconnect()
    })

    expect(syncToServer).not.toHaveBeenCalled()
    expect(clearSandbox).toHaveBeenCalled()
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" })
  })

  it("should sync before clear (order matters)", async () => {
    const callOrder: string[] = []
    vi.mocked(syncToServer).mockImplementation(async () => {
      callOrder.push("sync")
      return { success: true, lastSynced: new Date().toISOString() }
    })
    vi.mocked(clearSandbox).mockImplementation(() => {
      callOrder.push("clear")
    })
    vi.mocked(signOut).mockImplementation(async () => {
      callOrder.push("signOut")
      return undefined as never
    })

    const { useDisconnect } = await importHook()
    const { result } = renderHook(() => useDisconnect())

    await act(async () => {
      await result.current.disconnect()
    })

    expect(callOrder).toEqual(["sync", "clear", "signOut"])
  })
})
