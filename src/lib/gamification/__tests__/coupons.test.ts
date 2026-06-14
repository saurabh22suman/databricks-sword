import { describe, expect, it } from "vitest"
import { COUPONS, getCouponByCode, normalizeCouponCode } from "../coupons"

describe("coupon config", () => {
  it("includes starter coupons with required XP values", () => {
    expect(COUPONS.DBSWORD1000).toMatchObject({ xp: 1000, active: true })
    expect(COUPONS.DBSWORD10000).toMatchObject({ xp: 10000, active: true })
    expect(COUPONS.DBSWORD15000).toMatchObject({ xp: 15000, active: true })
  })

  it("normalizes coupon input to trimmed uppercase", () => {
    expect(normalizeCouponCode(" dbsword1000 ")).toBe("DBSWORD1000")
  })

  it("resolves coupon definitions by normalized code", () => {
    expect(getCouponByCode("dbsword10000")).toMatchObject({
      code: "DBSWORD10000",
      xp: 10000,
      active: true,
    })
    expect(getCouponByCode("dbsword15000")).toMatchObject({
      code: "DBSWORD15000",
      xp: 15000,
      active: true,
    })
  })

  it("keeps coupon keys uppercase for canonical lookup", () => {
    for (const key of Object.keys(COUPONS)) {
      expect(key).toBe(key.toUpperCase())
    }
  })
})
