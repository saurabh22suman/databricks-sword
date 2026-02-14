/**
 * API Route Authentication Helper
 *
 * Provides a consistent way to authenticate API routes
 * by extracting the user from the session rather than
 * trusting client-supplied userId.
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
 * Authenticates the current request using the session.
 * Returns the userId from the session, NOT from request body.
 * This prevents IDOR attacks where a user operates on another user's data.
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

  return {
    authenticated: true,
    userId: session.user.id,
    userName: session.user.name,
    userImage: session.user.image,
  }
}
