"use client"

import type { Session } from "next-auth"
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"

type SessionProviderProps = {
  children: React.ReactNode
  session: Session | null
}

/**
 * Client-side SessionProvider wrapper for next-auth.
 * Enables useSession() hook in client components.
 */
export function SessionProvider({
  children,
  session,
}: SessionProviderProps): React.ReactElement {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  )
}
