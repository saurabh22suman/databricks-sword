import { createClient } from "@libsql/client"
import type { LibSQLDatabase } from "drizzle-orm/libsql"
import { drizzle } from "drizzle-orm/libsql"

let _db: LibSQLDatabase | undefined

/**
 * Lazy-initialized database instance.
 * Deferred so that `next build` can complete without a live DATABASE_URL.
 * The client is created on first access, not at module load time.
 *
 * @throws {Error} If TURSO_DATABASE_URL is not defined when first accessed.
 */
export function getDb(): LibSQLDatabase {
  if (!_db) {
    const url = process.env.TURSO_DATABASE_URL
    const authToken = process.env.TURSO_AUTH_TOKEN

    if (!url) {
      throw new Error(
        "TURSO_DATABASE_URL is not defined. " +
        "Set it in .env.local for local development or as an environment variable in production."
      )
    }

    const client = createClient({ url, authToken })
    _db = drizzle(client)
  }
  return _db
}
