import { getServerEnv } from "@/lib/env"
import { createClient } from "@libsql/client"
import type { LibSQLDatabase } from "drizzle-orm/libsql"
import { drizzle } from "drizzle-orm/libsql"

let _db: LibSQLDatabase | undefined
let _dbInitFailed = false

/**
 * Lazy-initialized database instance.
 * Deferred so that `next build` can complete without a live DATABASE_URL.
 * The client is created on first access, not at module load time.
 *
 * @returns The database instance, or throws a clean error if configuration is missing.
 * @throws {Error} If TURSO_DATABASE_URL is not defined when first accessed.
 */
export function getDb(): LibSQLDatabase {
  // Return cached instance if already initialized
  if (_db) {
    return _db
  }

  // Return cached failure to avoid repeated initialization attempts
  if (_dbInitFailed) {
    throw new Error(
      "Database connection unavailable. Please check your environment configuration."
    )
  }

  try {
    const env = getServerEnv()
    const url = env.TURSO_DATABASE_URL
    const authToken = env.TURSO_AUTH_TOKEN

    if (!url) {
      _dbInitFailed = true
      throw new Error(
        "TURSO_DATABASE_URL is not defined. " +
        "Set it in .env.local for local development or as an environment variable in production."
      )
    }

    const client = createClient({ url, authToken })
    _db = drizzle(client)
    return _db
  } catch (error) {
    _dbInitFailed = true
    // Re-throw with clean message, preserving original for logging
    const message = error instanceof Error ? error.message : "Database initialization failed"
    throw new Error(`Database connection failed: ${message}`)
  }
}

/**
 * Checks if database is available and initialized.
 * Useful for checking before making database calls.
 *
 * @returns true if database is ready, false otherwise
 */
export function isDbReady(): boolean {
  try {
    getDb()
    return true
  } catch {
    return false
  }
}

/**
 * Resets the database connection state.
 * Useful for testing or when environment variables change.
 */
export function resetDb(): void {
  _db = undefined
  _dbInitFailed = false
}
