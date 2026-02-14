import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const ADMIN_COOKIE_NAME = "admin_session"
const COOKIE_MAX_AGE = 60 * 60 * 24 // 24 hours

/**
 * POST /api/admin/auth - Login with admin password
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { password } = await request.json()
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      return NextResponse.json(
        { error: "Admin password not configured" },
        { status: 500 }
      )
    }

    if (password !== adminPassword) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      )
    }

    // Set session cookie
    const cookieStore = await cookies()
    const sessionToken = Buffer.from(
      `${adminPassword}:${Date.now()}`
    ).toString("base64")

    cookieStore.set(ADMIN_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE,
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
  const session = cookieStore.get(ADMIN_COOKIE_NAME)
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!session || !adminPassword) {
    return NextResponse.json({ authenticated: false })
  }

  try {
    const decoded = Buffer.from(session.value, "base64").toString("utf8")
    const [storedPassword] = decoded.split(":")

    if (storedPassword === adminPassword) {
      return NextResponse.json({ authenticated: true })
    }
  } catch {
    // Invalid token format
  }

  return NextResponse.json({ authenticated: false })
}

/**
 * DELETE /api/admin/auth - Logout
 */
export async function DELETE(): Promise<NextResponse> {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE_NAME)
  return NextResponse.json({ success: true })
}
