import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { getDb } from "@/lib/db/client"
import { couponRedemptions } from "@/lib/db/schema"
import { getCouponByCode } from "@/lib/gamification/coupons"
import { nanoid } from "nanoid"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const RedeemCouponSchema = z.object({
  code: z.string().min(1),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateApiRequest()
  if (!authResult.authenticated) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const parsed = RedeemCouponSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const coupon = getCouponByCode(parsed.data.code)
    if (!coupon || !coupon.active) {
      return NextResponse.json(
        { applied: false, reason: "invalid_code" },
        { status: 400 },
      )
    }

    const insertedRows = await getDb()
      .insert(couponRedemptions)
      .values({
        id: nanoid(),
        userId: authResult.userId,
        code: coupon.code,
        xpAwarded: coupon.xp,
        redeemedAt: new Date(),
      })
      .onConflictDoNothing({
        target: [couponRedemptions.userId, couponRedemptions.code],
      })
      .returning({
        xpAwarded: couponRedemptions.xpAwarded,
      })

    if (insertedRows.length === 0) {
      return NextResponse.json({
        applied: false,
        reason: "already_redeemed",
      })
    }

    return NextResponse.json({
      applied: true,
      xpAwarded: insertedRows[0].xpAwarded,
    })
  } catch (error) {
    console.error("Error redeeming coupon:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
