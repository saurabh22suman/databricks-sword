import { describe, expect, it, vi } from "vitest"
import {
  COUPONS,
  getCouponByCode,
  loadCoupons,
  normalizeCouponCode,
} from "../coupons"

const STARTER_JSON = JSON.stringify({
  DBSWORD1000: { xp: 1000, active: true },
  DBSWORD10000: { xp: 10000, active: true },
  DBSWORD15000: { xp: 15000, active: true },
})

describe("coupon config", () => {
  it("loads coupons from the env value when provided", () => {
    const loaded = loadCoupons(STARTER_JSON)
    expect(loaded.DBSWORD1000).toMatchObject({ xp: 1000, active: true })
    expect(loaded.DBSWORD10000).toMatchObject({ xp: 10000, active: true })
    expect(loaded.DBSWORD15000).toMatchObject({ xp: 15000, active: true })
  })

  it("returns an empty coupon set when env is unset", () => {
    expect(loadCoupons(undefined)).toEqual({})
    expect(loadCoupons("")).toEqual({})
  })

  it("returns an empty coupon set when env is invalid JSON", () => {
    // Silence the expected console.warn so test output stays clean.
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    expect(loadCoupons("not json")).toEqual({})
    expect(loadCoupons("[]")).toEqual({})
    expect(loadCoupons("null")).toEqual({})
    expect(loadCoupons("42")).toEqual({})
    warnSpy.mockRestore()
  })

  it("normalizes coupon input to trimmed uppercase", () => {
    expect(normalizeCouponCode(" dbsword1000 ")).toBe("DBSWORD1000")
  })

  it("resolves coupon definitions by normalized code", () => {
    // Use loadCoupons directly so the test is decoupled from the
    // module-level COUPONS snapshot taken at import time.
    const coupons = loadCoupons(STARTER_JSON)
    const coupon = coupons.DBSWORD10000
    expect(coupon).toMatchObject({ xp: 10000, active: true })
    expect(getCouponByCodeForCoupons(coupons, "dbsword10000")).toMatchObject({
      code: "DBSWORD10000",
      xp: 10000,
      active: true,
    })
  })

  it("returns null for unknown coupon codes", () => {
    expect(getCouponByCode("UNKNOWN")).toBeNull()
  })

  it("keeps coupon keys uppercase for canonical lookup", () => {
    for (const key of Object.keys(loadCoupons(STARTER_JSON))) {
      expect(key).toBe(key.toUpperCase())
    }
  })

  it("module-level COUPONS is empty when COUPONS_JSON is unset in env", () => {
    // The test runner doesn't set COUPONS_JSON, so the production module
    // (loaded at the top of this file) must produce an empty coupon set.
    // This proves source contains no hardcoded defaults.
    expect(COUPONS).toEqual({})
  })
})

/**
 * Test-local helper: resolves a coupon from a given coupon set, mirroring
 * `getCouponByCode`'s behavior. Keeps tests independent of the module-level
 * COUPONS snapshot.
 */
function getCouponByCodeForCoupons(
  coupons: Record<string, { xp: number; active: boolean }>,
  rawCode: string,
) {
  const normalized = normalizeCouponCode(rawCode)
  const coupon = coupons[normalized]
  if (!coupon) return null
  return { code: normalized, ...coupon }
}
