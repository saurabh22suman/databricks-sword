import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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
  loadSandbox: vi.fn().mockReturnValue({
    userStats: { totalXp: 0, completedMissions: [], completedChallenges: [], streak: 0 },
  }),
  saveSandbox: vi.fn(),
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
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
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

  it("renders all four settings sections", async () => {
    const { default: SettingsPage } = await import("@/app/settings/page")
    render(<SettingsPage />)
    expect(screen.getByText("Account")).toBeInTheDocument()
    expect(screen.getByText("Preferences")).toBeInTheDocument()
    expect(screen.getByText("Databricks Workspace")).toBeInTheDocument()
    expect(screen.getByText("Data Management")).toBeInTheDocument()
    expect(screen.getByText("Danger Zone")).toBeInTheDocument()
  })
})
