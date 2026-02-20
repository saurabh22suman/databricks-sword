import {
    createAdminSessionToken,
    getAdminCookieMaxAge,
    getAdminCookieName,
    isValidAdminPassword,
    verifyAdminSessionToken,
} from "@/lib/auth/admin-auth"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

/**
 * POST /api/admin/auth - Login with admin password
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { password } = await request.json()

    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Admin password not configured" },
        { status: 500 }
      )
    }

    if (!isValidAdminPassword(password)) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      )
    }

    // Set session cookie
    const cookieStore = await cookies()
    const sessionToken = createAdminSessionToken()

    cookieStore.set(getAdminCookieName(), sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: getAdminCookieMaxAge(),
      path: "/",
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    )
  }
}

/**
 * GET /api/admin/auth - Check if logged in
 */
export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies()
  const session = cookieStore.get(getAdminCookieName())

  if (!session?.value || !process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ authenticated: false })
  }

  if (verifyAdminSessionToken(session.value)) {
    return NextResponse.json({ authenticated: true })
  }

  return NextResponse.json({ authenticated: false })
}

/**
 * DELETE /api/admin/auth - Logout
 */
export async function DELETE(): Promise<NextResponse> {
  const cookieStore = await cookies()
  cookieStore.delete(getAdminCookieName())
  return NextResponse.json({ success: true })
}
