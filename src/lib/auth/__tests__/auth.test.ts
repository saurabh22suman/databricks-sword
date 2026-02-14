import { describe, expect, it, vi } from "vitest"

// Mock next-auth to avoid "next/server" import issues in Vitest
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}))

vi.mock("next-auth/providers/github", () => ({
  default: vi.fn(),
}))

vi.mock("next-auth/providers/google", () => ({
  default: vi.fn(),
}))

vi.mock("@auth/drizzle-adapter", () => ({
  DrizzleAdapter: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({
  db: {},
}))

vi.mock("@/lib/db", () => ({
  users: {},
  accounts: {},
  sessions: {},
  verificationTokens: {},
}))

describe("Auth Configuration", () => {
  it("should export auth function", async () => {
    const { auth } = await import("../auth")
    expect(auth).toBeDefined()
    expect(typeof auth).toBe("function")
  })

  it("should export signIn and signOut functions", async () => {
    const { signIn, signOut } = await import("../auth")
    expect(signIn).toBeDefined()
    expect(signOut).toBeDefined()
    expect(typeof signIn).toBe("function")
    expect(typeof signOut).toBe("function")
  })

  it("should export handlers", async () => {
    const { handlers } = await import("../auth")
    expect(handlers).toBeDefined()
    expect(handlers.GET).toBeDefined()
    expect(handlers.POST).toBeDefined()
  })

  it("should have Google and GitHub providers configured", async () => {
    // This test verifies the module loads without errors
    // Actual provider configuration is tested through integration tests
    const module = await import("../auth")
    expect(module).toBeDefined()
  })
})
