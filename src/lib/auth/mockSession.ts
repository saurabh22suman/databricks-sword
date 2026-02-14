/**
 * @file mockSession.ts
 * @description Shared mock auth constants for local/dev testing.
 *
 * When MOCK_AUTH=true and NODE_ENV !== "production", the app bypasses
 * real OAuth and uses this fake session everywhere (middleware, layout,
 * API routes, useSession).
 *
 * NEVER enable in production — the env guard prevents it.
 */

import type { Session } from "next-auth"

/**
 * Whether mock auth is active.
 * Only true when MOCK_AUTH=true.
 * WARNING: Never set MOCK_AUTH=true in production deployments.
 */
export const isMockAuth: boolean = process.env.MOCK_AUTH === "true"

/**
 * Fake session injected when mock auth is active.
 */
export const MOCK_SESSION: Session = {
  user: {
    id: "mock-user-001",
    name: "Mock Swordsman",
    email: "mock@dbsword.local",
    image: "https://api.dicebear.com/7.x/bottts/svg?seed=mock",
  },
  expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
}
