import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mockSyncNow = vi.fn().mockResolvedValue(true)
const mockLoadSandbox = vi.fn().mockReturnValue({
  userStats: {
    totalXp: 0,
  },
})
const mockUpdateSandbox = vi.fn()

vi.mock("@/components/auth", () => ({
  useSyncNow: () => ({
    syncNow: mockSyncNow,
    isInitialSyncComplete: true,
  }),
}))

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn().mockReturnValue({
    data: { user: { id: "u1", name: "Test", email: "test@test.com", image: null } },
    status: "authenticated",
  }),
  signOut: vi.fn(),
}))

// Mock gamification
vi.mock("@/lib/gamification", () => ({
  getRankForXp: vi.fn().mockReturnValue({ title: "Cadet", icon: "🎖️", threshold: 0 }),
}))

// Mock sandbox
vi.mock("@/lib/sandbox", () => ({
  loadSandbox: () => mockLoadSandbox(),
  saveSandbox: vi.fn(),
  updateSandbox: (...args: unknown[]) => mockUpdateSandbox(...args),
}))

// Mock RankBadge
vi.mock("@/components/gamification/RankBadge", () => ({
  RankBadge: ({ rank }: { rank: { title: string } }) => (
    <span data-testid="rank-badge">{rank.title}</span>
  ),
}))

// Mock Databricks components
vi.mock("@/components/databricks", () => ({
  ConnectionForm: ({ onConnect }: { onConnect: (url: string) => void; userId: string }) => (
    <div data-testid="connection-form">
      <button onClick={() => onConnect("https://test.cloud.databricks.com")}>Connect</button>
    </div>
  ),
  ConnectionStatus: ({ userId, onDisconnect }: { userId: string; onDisconnect?: () => void }) => (
    <div data-testid="connection-status">
      <span>Status for {userId}</span>
      {onDisconnect && <button onClick={onDisconnect}>Disconnect</button>}
    </div>
  ),
}))

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })

    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true))

    mockLoadSandbox.mockReturnValue({
      userStats: {
        totalXp: 100,
      },
    })

    mockUpdateSandbox.mockImplementation((updater: (data: any) => any) => {
      const current = mockLoadSandbox()
      const updated = updater(current)
      mockLoadSandbox.mockReturnValue(updated)
    })

    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString()

        if (url === "/api/databricks/status") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ connected: false }),
          })
        }

        if (url === "/api/user/profile" && (!init || init.method === "GET")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ leaderboardOptIn: true }),
          })
        }

        if (url === "/api/user/profile" && init?.method === "PATCH") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ leaderboardOptIn: false }),
          })
        }

        if (url === "/api/user/coupon/redeem") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ applied: true, xpAwarded: 1000 }),
          })
        }

        if (url === "/api/field-ops/cleanup" && init?.method === "POST") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ cleaned: 2, message: "Cleaned up 2 deployments." }),
          })
        }

        return Promise.resolve({ ok: false, json: async () => ({ error: "Not found" }) })
      }),
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("renders the Databricks Workspace section header", async () => {
    const { default: SettingsPage } = await import("@/app/settings/page")
    render(<SettingsPage />)
    expect(screen.getByText("Databricks Workspace")).toBeInTheDocument()
  })

  it("renders ConnectionForm when user is authenticated and not connected", async () => {
    const { default: SettingsPage } = await import("@/app/settings/page")
    render(<SettingsPage />)
    expect(screen.getByTestId("connection-form")).toBeInTheDocument()
  })

  it("renders all settings sections including coupons", async () => {
    const { default: SettingsPage } = await import("@/app/settings/page")
    render(<SettingsPage />)
    expect(screen.getByText("Account")).toBeInTheDocument()
    expect(screen.getByText("Preferences")).toBeInTheDocument()
    expect(screen.getByText("Databricks Workspace")).toBeInTheDocument()
    expect(screen.getByText("Coupons")).toBeInTheDocument()
    expect(screen.getByText("Data Management")).toBeInTheDocument()
    expect(screen.getByText("Danger Zone")).toBeInTheDocument()
  })

  it("renders coupon redemption UI in settings", async () => {
    const { default: SettingsPage } = await import("@/app/settings/page")
    render(<SettingsPage />)

    expect(screen.getByPlaceholderText("Enter code")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Redeem" })).toBeInTheDocument()
  })

  it("redeems coupon and updates XP in settings", async () => {
    const { default: SettingsPage } = await import("@/app/settings/page")
    render(<SettingsPage />)

    fireEvent.change(screen.getByPlaceholderText("Enter code"), {
      target: { value: "infobeans1000" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Redeem" }))

    await waitFor(() => {
      expect(screen.getByText("Coupon applied! +1,000 XP")).toBeInTheDocument()
    })

    expect(mockSyncNow).toHaveBeenCalled()
  })

  it("renders leaderboard toggle and updates preference", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString()

      if (url === "/api/databricks/status") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ connected: false }),
        })
      }

      if (url === "/api/user/profile" && (!init || init.method === "GET")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ leaderboardOptIn: true }),
        })
      }

      if (url === "/api/user/profile" && init?.method === "PATCH") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ leaderboardOptIn: false }),
        })
      }

      if (url === "/api/user/coupon/redeem") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ applied: true, xpAwarded: 1000 }),
        })
      }

      if (url === "/api/field-ops/cleanup" && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ cleaned: 2, message: "Cleaned up 2 deployments." }),
        })
      }

      return Promise.resolve({ ok: false, json: async () => ({ error: "Not found" }) })
    })

    vi.stubGlobal("fetch", fetchMock)

    const { default: SettingsPage } = await import("@/app/settings/page")
    render(<SettingsPage />)

    const toggle = await screen.findByLabelText("Toggle Participate in Leaderboard")
    fireEvent.click(toggle)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/user/profile",
        expect.objectContaining({ method: "PATCH" }),
      )
    })

    expect(await screen.findByText("Leaderboard setting updated.")).toBeInTheDocument()
  })

  it("renders clean up assets button", async () => {
    const { default: SettingsPage } = await import("@/app/settings/page")
    render(<SettingsPage />)

    expect(screen.getByRole("button", { name: "Clean up assets" })).toBeInTheDocument()
  })

  it("does not call cleanup API when confirmation is cancelled", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false))
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString()

      if (url === "/api/databricks/status") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ connected: false }),
        })
      }

      if (url === "/api/user/profile" && (!init || init.method === "GET")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ leaderboardOptIn: true }),
        })
      }

      if (url === "/api/user/coupon/redeem") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ applied: true, xpAwarded: 1000 }),
        })
      }

      return Promise.resolve({ ok: false, json: async () => ({ error: "Not found" }) })
    })
    vi.stubGlobal("fetch", fetchMock)

    const { default: SettingsPage } = await import("@/app/settings/page")
    render(<SettingsPage />)

    fireEvent.click(screen.getByRole("button", { name: "Clean up assets" }))

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled()
    })

    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/field-ops/cleanup",
      expect.objectContaining({ method: "POST" })
    )
  })

  it("shows loading and disables cleanup button during request", async () => {
    const cleanupDeferred: {
      resolve?: (value: { ok: boolean; json: () => Promise<{ cleaned: number; message: string }> }) => void
    } = {}

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString()

      if (url === "/api/databricks/status") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ connected: false }),
        })
      }

      if (url === "/api/user/profile" && (!init || init.method === "GET")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ leaderboardOptIn: true }),
        })
      }

      if (url === "/api/user/coupon/redeem") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ applied: true, xpAwarded: 1000 }),
        })
      }

      if (url === "/api/field-ops/cleanup" && init?.method === "POST") {
        return new Promise((resolve) => {
          cleanupDeferred.resolve = resolve as typeof cleanupDeferred.resolve
        })
      }

      return Promise.resolve({ ok: false, json: async () => ({ error: "Not found" }) })
    })

    vi.stubGlobal("fetch", fetchMock)

    const { default: SettingsPage } = await import("@/app/settings/page")
    render(<SettingsPage />)

    fireEvent.click(screen.getByRole("button", { name: "Clean up assets" }))

    expect(await screen.findByRole("button", { name: "Cleaning up..." })).toBeDisabled()

    cleanupDeferred.resolve?.({
      ok: true,
      json: async () => ({ cleaned: 1, message: "Cleaned up 1 deployment." }),
    })

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Clean up assets" })).toBeEnabled()
    })
  })

  it("renders success feedback after cleanup succeeds", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString()

      if (url === "/api/databricks/status") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ connected: false }),
        })
      }

      if (url === "/api/user/profile" && (!init || init.method === "GET")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ leaderboardOptIn: true }),
        })
      }

      if (url === "/api/user/coupon/redeem") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ applied: true, xpAwarded: 1000 }),
        })
      }

      if (url === "/api/field-ops/cleanup" && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ cleaned: 2, message: "Cleaned up 2 deployments." }),
        })
      }

      return Promise.resolve({ ok: false, json: async () => ({ error: "Not found" }) })
    })

    vi.stubGlobal("fetch", fetchMock)

    const { default: SettingsPage } = await import("@/app/settings/page")
    render(<SettingsPage />)

    fireEvent.click(screen.getByRole("button", { name: "Clean up assets" }))

    expect(await screen.findByText("Cleanup finished. 2 deployments cleaned.")).toBeInTheDocument()
  })

  it("renders partial failure feedback after cleanup returns 409", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString()

      if (url === "/api/databricks/status") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ connected: false }),
        })
      }

      if (url === "/api/user/profile" && (!init || init.method === "GET")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ leaderboardOptIn: true }),
        })
      }

      if (url === "/api/user/coupon/redeem") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ applied: true, xpAwarded: 1000 }),
        })
      }

      if (url === "/api/field-ops/cleanup" && init?.method === "POST") {
        return Promise.resolve({
          ok: false,
          status: 409,
          json: async () => ({ failed: 1, failures: [{ deploymentId: "dep-2" }] }),
        })
      }

      return Promise.resolve({ ok: false, json: async () => ({ error: "Not found" }) })
    })

    vi.stubGlobal("fetch", fetchMock)

    const { default: SettingsPage } = await import("@/app/settings/page")
    render(<SettingsPage />)

    fireEvent.click(screen.getByRole("button", { name: "Clean up assets" }))

    expect(await screen.findByText("Cleanup completed with 1 failure.")).toBeInTheDocument()
  })
})
