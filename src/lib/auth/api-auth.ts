/**
 * API Route Authentication Helper
 *
 * Provides a consistent way to authenticate API routes
 * by extracting the user from the session rather than
 * trusting client-supplied userId.
 *
 * Includes basic rate limiting to prevent automated attacks.
 */

import { auth } from "@/lib/auth";
import { MOCK_SESSION, isMockAuth } from "@/lib/auth/mockSession";

/**
 * Result of an API authentication check.
 * On success, returns the authenticated userId and optional user info.
 * On failure, returns an error message and HTTP status code.
 */
export type AuthResult =
  | { authenticated: true; userId: string; userName?: string | null; userImage?: string | null }
  | { authenticated: false; error: string; status: number }

/**
 * Simple in-memory rate limiter for API authentication.
 * Uses a Map with userId as key and tracks request counts.
 *
 * Limits: 10 requests per 10 seconds per user.
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10 // max requests
const RATE_WINDOW_MS = 10_000 // 10 seconds

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(userId)

  if (!record || now > record.resetTime) {
    // First request or window expired - reset
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_WINDOW_MS })
    return true
  }

  if (record.count >= RATE_LIMIT) {
    // Rate limit exceeded
    return false
  }

  // Increment count
  record.count++
  return true
}

/**
 * Cleans up expired rate limit entries periodically.
 * Call this from a periodic job or let entries naturally expire.
 */
export function cleanupRateLimits(): void {
  const now = Date.now()
  for (const [userId, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(userId)
    }
  }
}

/**
 * Authenticates the current request using the session.
 * Returns the userId from the session, NOT from request body.
 * This prevents IDOR attacks where a user operates on another user's data.
 *
 * Includes rate limiting to prevent automated attacks.
 *
 * @returns AuthResult with userId on success, error on failure
 */
export async function authenticateApiRequest(): Promise<AuthResult> {
  // Mock auth: return fake user in dev/test
  if (isMockAuth) {
    return {
      authenticated: true,
      userId: MOCK_SESSION.user!.id!,
      userName: MOCK_SESSION.user!.name,
      userImage: MOCK_SESSION.user!.image,
    }
  }

  const session = await auth()

  if (!session?.user?.id) {
    return {
      authenticated: false,
      error: "Unauthorized",
      status: 401,
    }
  }

  const userId = session.user.id

  // Apply rate limiting
  if (!checkRateLimit(userId)) {
    return {
      authenticated: false,
      error: "Too many requests - please slow down",
      status: 429,
    }
  }

  return {
    authenticated: true,
    userId,
    userName: session.user.name,
    userImage: session.user.image,
  }
}
