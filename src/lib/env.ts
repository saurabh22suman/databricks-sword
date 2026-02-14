import { z } from "zod"

/**
 * Server-side environment variable validation.
 *
 * Validates all required environment variables at first access.
 * Call `serverEnv` in server-only code paths (API routes, server components)
 * to get type-safe access to environment variables.
 *
 * Variables read by Auth.js (AUTH_SECRET, AUTH_GOOGLE_ID, etc.) are validated
 * internally by Auth.js and not duplicated here.
 */

const serverEnvSchema = z.object({
  // Database
  TURSO_DATABASE_URL: z.string().min(1, "TURSO_DATABASE_URL is required"),
  TURSO_AUTH_TOKEN: z.string().optional(),

  // Admin
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD must be at least 8 characters").optional(),

  // Encryption
  AES_ENCRYPTION_KEY: z.string().optional(),

  // Auth behaviour
  MOCK_AUTH: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  AUTH_TRUST_HOST: z.string().optional(),

  // Runtime
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
})

/**
 * Client-side (public) environment variable validation.
 * Only variables prefixed with NEXT_PUBLIC_ are available in the browser.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_URL: z.string().url().optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>
export type ClientEnv = z.infer<typeof clientEnvSchema>

let _serverEnv: ServerEnv | undefined
let _clientEnv: ClientEnv | undefined

/**
 * Returns validated server environment variables.
 * Throws a descriptive error if any required variable is missing.
 *
 * @throws {z.ZodError} When required variables are missing or malformed
 */
export function getServerEnv(): ServerEnv {
  if (!_serverEnv) {
    const result = serverEnvSchema.safeParse(process.env)
    if (!result.success) {
      const formatted = result.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n")
      throw new Error(
        `Missing or invalid environment variables:\n${formatted}\n\n` +
        "See .env.example for required variables."
      )
    }
    _serverEnv = result.data
  }
  return _serverEnv
}

/**
 * Returns validated client (NEXT_PUBLIC_*) environment variables.
 */
export function getClientEnv(): ClientEnv {
  if (!_clientEnv) {
    const result = clientEnvSchema.safeParse({
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
    })
    if (!result.success) {
      // Client env vars are optional — fall back gracefully
      _clientEnv = { NEXT_PUBLIC_SITE_URL: undefined, NEXT_PUBLIC_URL: undefined }
    } else {
      _clientEnv = result.data
    }
  }
  return _clientEnv
}
