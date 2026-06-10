/**
 * @file retry.ts
 * @description Database retry utilities with exponential backoff.
 *
 * Provides retry logic for transient database failures like
 * connection pool exhaustion or network timeouts.
 */

/**
 * Configuration for retry options.
 */
export type RetryOptions = {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number
  /** Initial delay in milliseconds (default: 200) */
  initialDelayMs?: number
  /** Maximum delay in milliseconds (default: 2000) */
  maxDelayMs?: number
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number
  /** Additional delay jitter factor 0-1 (default: 0.1) */
  jitterFactor?: number
}

/**
 * Default retry options.
 */
const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 200,
  maxDelayMs: 2000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
}

/**
 * Sleeps for the specified milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Executes an async function with exponential backoff retry.
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function
 * @throws The last error if all retries fail
 *
 * @example
 * ```ts
 * const result = await withRetry(async () => {
 *   return await db.insert(users).values({ ... })
 * })
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: Error | unknown

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry on last attempt
      if (attempt === opts.maxAttempts) {
        break
      }

      // Calculate delay with exponential backoff
      const baseDelay = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelayMs,
      )

      // Add jitter to prevent thundering herd
      const jitter = baseDelay * opts.jitterFactor * Math.random()
      const delay = baseDelay + jitter

      console.warn(
        `[retry] Attempt ${attempt}/${opts.maxAttempts} failed: ` +
          `${error instanceof Error ? error.message : String(error)}. ` +
          `Retrying in ${Math.round(delay)}ms...`
      )

      await sleep(delay)
    }
  }

  // All retries exhausted
  throw lastError
}

/**
 * Executes a database operation with retry logic.
 * Shortcut for database-specific retry scenarios.
 *
 * @param fn - The async database operation to execute
 * @returns The result of the database operation
 *
 * @example
 * ```ts
 * await withDbRetry(async () => {
 *   return await db.insert(sandboxSnapshots).values({ ... })
 * })
 * ```
 */
export async function withDbRetry<T>(fn: () => Promise<T>): Promise<T> {
  return withRetry(fn, {
    maxAttempts: 3,
    initialDelayMs: 200,
    maxDelayMs: 2000,
  })
}