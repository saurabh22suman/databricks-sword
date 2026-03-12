import { describe, expect, it } from "vitest"
import { COUPONS, getCouponByCode, normalizeCouponCode } from "../coupons"

describe("coupon config", () => {
  it("includes starter coupons with required XP values", () => {
    expect(COUPONS.INFOBEANS1000).toMatchObject({ xp: 1000, active: true })
    expect(COUPONS.INFOBEANS10000).toMatchObject({ xp: 10000, active: true })
    expect(COUPONS.PREPRABBIT15000).toMatchObject({ xp: 15000, active: true })
  })

  it("normalizes coupon input to trimmed uppercase", () => {
    expect(normalizeCouponCode(" infobeans1000 ")).toBe("INFOBEANS1000")
  })

  it("resolves coupon definitions by normalized code", () => {
    expect(getCouponByCode("infobeans10000")).toMatchObject({
      code: "INFOBEANS10000",
      xp: 10000,
      active: true,
    })
    expect(getCouponByCode("preprabbit15000")).toMatchObject({
      code: "PREPRABBIT15000",
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
