import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "../route"

// Set COUPONS_JSON BEFORE the coupons module is imported so the
// module-level COUPONS snapshot (read at import time) has the codes
// the tests exercise. There are no hardcoded defaults in source.
vi.hoisted(() => {
  process.env.COUPONS_JSON = JSON.stringify({
    DBSWORD1000: { xp: 1000, active: true },
    DBSWORD10000: { xp: 10000, active: true },
    DBSWORD15000: { xp: 15000, active: true },
  })
})

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

const mockDb = {
  insert: vi.fn(),
}

vi.mock("@/lib/db/client", () => ({
  getDb: vi.fn(() => mockDb),
}))

describe("Coupon redeem API route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)

    const request = new NextRequest("http://localhost:3000/api/user/coupon/redeem", {
      method: "POST",
      body: JSON.stringify({ code: "DBSWORD1000" }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe("Unauthorized")
  })

  it("applies valid first redemption", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123", email: "test@example.com" },
      expires: "2026-01-01",
    } as any)

    const returning = vi.fn().mockResolvedValue([{ xpAwarded: 1000 }])
    const onConflictDoNothing = vi.fn().mockReturnValue({ returning })
    const values = vi.fn().mockReturnValue({ onConflictDoNothing })
    vi.mocked(mockDb.insert).mockReturnValue({ values } as any)

    const request = new NextRequest("http://localhost:3000/api/user/coupon/redeem", {
      method: "POST",
      body: JSON.stringify({ code: "  dbsword1000 " }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toEqual({ applied: true, xpAwarded: 1000 })
    expect(values).toHaveBeenCalledTimes(1)
    expect(values.mock.calls[0][0]).toMatchObject({
      userId: "user-123",
      code: "DBSWORD1000",
      xpAwarded: 1000,
    })
  })

  it("returns already_redeemed for duplicate redemption", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123", email: "test@example.com" },
      expires: "2026-01-01",
    } as any)

    const returning = vi.fn().mockResolvedValue([])
    const onConflictDoNothing = vi.fn().mockReturnValue({ returning })
    const values = vi.fn().mockReturnValue({ onConflictDoNothing })
    vi.mocked(mockDb.insert).mockReturnValue({ values } as any)

    const request = new NextRequest("http://localhost:3000/api/user/coupon/redeem", {
      method: "POST",
      body: JSON.stringify({ code: "DBSWORD1000" }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toEqual({ applied: false, reason: "already_redeemed" })
  })

  it("applies DBSWORD15000 for 15000 XP", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123", email: "test@example.com" },
      expires: "2026-01-01",
    } as any)

    const returning = vi.fn().mockResolvedValue([{ xpAwarded: 15000 }])
    const onConflictDoNothing = vi.fn().mockReturnValue({ returning })
    const values = vi.fn().mockReturnValue({ onConflictDoNothing })
    vi.mocked(mockDb.insert).mockReturnValue({ values } as any)

    const request = new NextRequest("http://localhost:3000/api/user/coupon/redeem", {
      method: "POST",
      body: JSON.stringify({ code: "dbsword15000" }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toEqual({ applied: true, xpAwarded: 15000 })
    expect(values.mock.calls[0][0]).toMatchObject({
      userId: "user-123",
      code: "DBSWORD15000",
      xpAwarded: 15000,
    })
  })

  it("returns invalid_code for unknown code", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123", email: "test@example.com" },
      expires: "2026-01-01",
    } as any)

    const request = new NextRequest("http://localhost:3000/api/user/coupon/redeem", {
      method: "POST",
      body: JSON.stringify({ code: "NOT_A_REAL_COUPON" }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data).toEqual({ applied: false, reason: "invalid_code" })
    expect(mockDb.insert).not.toHaveBeenCalled()
  })
})
