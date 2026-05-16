import { describe, expect, it, vi } from "vitest"

async function loadMockSession(mockAuth: string | undefined, nodeEnv: string): Promise<{ isMockAuth: boolean }> {
  vi.resetModules()

  if (mockAuth === undefined) {
    vi.unstubAllEnvs()
  } else {
    vi.stubEnv("MOCK_AUTH", mockAuth)
  }
  vi.stubEnv("NODE_ENV", nodeEnv)

  return import("../mockSession")
}

describe("mockSession env guard", () => {
  it("enables mock auth only in non-production runtime", async () => {
    const mod = await loadMockSession("true", "development")
    expect(mod.isMockAuth).toBe(true)
  })

  it("disables mock auth in production even when MOCK_AUTH=true", async () => {
    const mod = await loadMockSession("true", "production")
    expect(mod.isMockAuth).toBe(false)
  })

  it("disables mock auth when MOCK_AUTH is not true", async () => {
    const mod = await loadMockSession("false", "development")
    expect(mod.isMockAuth).toBe(false)
  })
})
