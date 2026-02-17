import { afterEach, describe, expect, it, vi } from "vitest"

describe("admin auth token helpers", () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it("creates and verifies a valid admin session token", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "super-secret-password")
    const { createAdminSessionToken, verifyAdminSessionToken } = await import("@/lib/auth/admin-auth")

    const token = createAdminSessionToken()
    expect(token).toBeTruthy()
    expect(verifyAdminSessionToken(token)).toBe(true)
  })

  it("rejects token when ADMIN_PASSWORD changes", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "old-secret")
    const { createAdminSessionToken, verifyAdminSessionToken } = await import("@/lib/auth/admin-auth")

    const token = createAdminSessionToken()
    vi.stubEnv("ADMIN_PASSWORD", "new-secret")

    expect(verifyAdminSessionToken(token)).toBe(false)
  })

  it("rejects malformed tokens", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "secret")
    const { verifyAdminSessionToken } = await import("@/lib/auth/admin-auth")

    expect(verifyAdminSessionToken("bad-token")).toBe(false)
    expect(verifyAdminSessionToken("header.payload.signature")).toBe(false)
  })
})