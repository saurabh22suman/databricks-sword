export type CouponDefinition = {
  xp: number
  active: boolean
}

export const COUPONS = {
  INFOBEANS1000: {
    xp: 1000,
    active: true,
  },
  INFOBEANS10000: {
    xp: 10000,
    active: true,
  },
  PREPRABBIT15000: {
    xp: 15000,
    active: true,
  },
} as const satisfies Record<string, CouponDefinition>

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase()
}

export function getCouponByCode(rawCode: string): (CouponDefinition & { code: string }) | null {
  const normalizedCode = normalizeCouponCode(rawCode)
  const coupon = COUPONS[normalizedCode as keyof typeof COUPONS]

  if (!coupon) {
    return null
  }

  return {
    code: normalizedCode,
    xp: coupon.xp,
    active: coupon.active,
  }
}
