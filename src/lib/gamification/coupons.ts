export type CouponDefinition = {
  xp: number
  active: boolean
}

/**
 * Coupons are loaded exclusively from the `COUPONS_JSON` environment
 * variable. There are intentionally no hardcoded defaults in source —
 * every coupon code, XP value, and active flag must be configured in
 * the deployment environment. Format:
 *   COUPONS_JSON='{"DBSWORD1000":{"xp":1000,"active":true},...}'
 *
 * When the env var is unset or invalid, the coupon set is empty. The
 * redeem endpoint will reject any code not present in the configured
 * set, so missing config is safe (no surprises) but means coupons won't
 * work until the env var is populated.
 *
 * `envValue` is parameterized for unit tests; production callers use
 * the default `process.env.COUPONS_JSON`.
 */
export function loadCoupons(
  envValue: string | undefined = process.env.COUPONS_JSON,
): Record<string, CouponDefinition> {
  if (!envValue) {
    return {}
  }
  try {
    const parsed = JSON.parse(envValue)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("COUPONS_JSON must be a JSON object")
    }
    return parsed as Record<string, CouponDefinition>
  } catch (err) {
    // Log to server console; never crash the process because of a misconfig
    // — the redeem endpoint will reject unknown codes anyway.
    console.warn("Invalid COUPONS_JSON; coupon set will be empty:", err)
    return {}
  }
}

export const COUPONS = loadCoupons()

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase()
}

export function getCouponByCode(rawCode: string): (CouponDefinition & { code: string }) | null {
  const normalizedCode = normalizeCouponCode(rawCode)
  const coupon = COUPONS[normalizedCode]

  if (!coupon) {
    return null
  }

  return {
    code: normalizedCode,
    xp: coupon.xp,
    active: coupon.active,
  }
}
