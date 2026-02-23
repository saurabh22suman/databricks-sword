import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

/**
 * When MOCK_AUTH=true, skip all auth checks.
 * This allows local/dev testing of protected routes without real OAuth.
 * WARNING: Never set MOCK_AUTH=true in production deployments.
 */
const isMockAuth = process.env.MOCK_AUTH === "true"

// Public routes accessible without authentication.
// Everything NOT listed here requires login.
const publicRoutes = [
  "/",
  "/blog",
  "/intel",
  "/leaderboard",
  "/map",
  "/u",
  "/faq", // Legacy redirect for backwards compatibility
  "/api/health",
  "/api/leaderboard",
]

// Static assets and Next.js internals (skip middleware entirely)
const staticPatterns = [
  "/_next",
  "/badges",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/icons",
  "/logo",
  "/illustrations",
  "/animations",
  "/achievements",
]

/**
 * Returns true when the pathname matches a public (no-auth) route.
 * `/blog` and `/blog/*` are both public.
 */
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

function isStaticAsset(pathname: string): boolean {
  return staticPatterns.some((pattern) => pathname.startsWith(pattern))
}

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Skip middleware for static assets
  if (isStaticAsset(pathname)) {
    return NextResponse.next()
  }

  // Mock auth: allow all routes in dev/test
  if (isMockAuth) {
    return NextResponse.next()
  }

  // Always allow auth routes (prevent redirect loops)
  if (pathname.startsWith("/auth/") || pathname.startsWith("/api/auth/")) {
    return NextResponse.next()
  }

  // Allow public routes without authentication
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Everything else requires authentication
  if (!req.auth) {
    // For API routes, return 401 JSON instead of redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // For pages, redirect to sign-in
    const signInUrl = new URL("/auth/signin", req.url)
    signInUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Authenticated — allow access
  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
