import { describe, expect, it, vi } from "vitest"

type MiddlewareRequest = {
  nextUrl: { pathname: string }
  url: string
  auth?: unknown
}

function makeRequest(pathname: string, auth?: unknown): MiddlewareRequest {
  return {
    nextUrl: { pathname },
    url: `https://databricks-sword.test${pathname}`,
    auth,
  }
}

async function loadMiddleware(mockAuth: string, nodeEnv: string): Promise<(req: MiddlewareRequest) => Response> {
  vi.resetModules()
  vi.stubEnv("MOCK_AUTH", mockAuth)
  vi.stubEnv("NODE_ENV", nodeEnv)

  vi.doMock("@/lib/auth", () => ({
    auth: (handler: (req: MiddlewareRequest) => Response) => handler,
  }))

  const mod = await import("../middleware")
  return mod.default as (req: MiddlewareRequest) => Response
}

describe("Middleware Route Protection", () => {
  it("allows public routes without authentication", async () => {
    const middleware = await loadMiddleware("false", "test")
    const response = middleware(makeRequest("/blog/some-post"))

    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
  })

  it("redirects unauthenticated users from protected pages", async () => {
    const middleware = await loadMiddleware("false", "test")
    const response = middleware(makeRequest("/missions"))

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/auth/signin")
    expect(response.headers.get("location")).toContain("callbackUrl=%2Fmissions")
  })

  it("returns 401 for unauthenticated protected API routes", async () => {
    const middleware = await loadMiddleware("false", "test")
    const response = middleware(makeRequest("/api/user/sync"))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" })
  })

  it("always allows auth routes", async () => {
    const middleware = await loadMiddleware("false", "test")

    const authPageResponse = middleware(makeRequest("/auth/signin"))
    const authApiResponse = middleware(makeRequest("/api/auth/signin"))

    expect(authPageResponse.status).toBe(200)
    expect(authApiResponse.status).toBe(200)
  })

  it("skips middleware for static asset paths", async () => {
    const middleware = await loadMiddleware("false", "test")
    const response = middleware(makeRequest("/_next/static/chunks/main.js"))

    expect(response.status).toBe(200)
  })

  it("allows protected routes for authenticated users", async () => {
    const middleware = await loadMiddleware("false", "test")
    const response = middleware(makeRequest("/missions", { user: { id: "u-1" } }))

    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
  })

  it("does not allow production mock-auth bypass", async () => {
    await expect(loadMiddleware("true", "production")).rejects.toThrow(
      "CRITICAL SECURITY ERROR: MOCK_AUTH is not allowed in production"
    )
  })

  it("allows mock-auth bypass outside production", async () => {
    const middleware = await loadMiddleware("true", "development")
    const response = middleware(makeRequest("/missions"))

    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
  })
})
