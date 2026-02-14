import { accounts, sessions, users, verificationTokens } from "@/lib/db"
import { getDb } from "@/lib/db/client"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"

/**
 * Lazy-initialized NextAuth configuration.
 * Deferred so that `next build` can complete without a live DATABASE_URL.
 */
function createAuth(): ReturnType<typeof NextAuth> {
  return NextAuth({
    adapter: DrizzleAdapter(getDb(), {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }),
    providers: [
      Google({ allowDangerousEmailAccountLinking: true }),
      GitHub({ allowDangerousEmailAccountLinking: true }),
    ],
    session: {
      strategy: "database",
    },
    trustHost: process.env.NODE_ENV !== "production" || !!process.env.AUTH_TRUST_HOST,
    pages: {
      signIn: "/auth/signin",
    },
    callbacks: {
      async session({ session, user }) {
        if (session.user) {
          session.user.id = user.id
        }
        return session
      },
    },
  })
}

let _instance: ReturnType<typeof NextAuth> | undefined

function getInstance(): ReturnType<typeof NextAuth> {
  if (!_instance) {
    _instance = createAuth()
  }
  return _instance
}

type AuthInstance = ReturnType<typeof NextAuth>

export const handlers: AuthInstance["handlers"] = {
  GET: (...args: Parameters<AuthInstance["handlers"]["GET"]>) =>
    getInstance().handlers.GET(...args),
  POST: (...args: Parameters<AuthInstance["handlers"]["POST"]>) =>
    getInstance().handlers.POST(...args),
}
export const auth = ((...args: unknown[]) =>
  // @ts-expect-error -- NextAuth auth has complex overloaded signatures that cannot be preserved through a lazy wrapper
  getInstance().auth(...args)
) as AuthInstance["auth"]
export const signIn: AuthInstance["signIn"] = (...args) =>
  getInstance().signIn(...args)
export const signOut: AuthInstance["signOut"] = (...args) =>
  getInstance().signOut(...args)
