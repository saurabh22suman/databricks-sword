/**
 * @file errors.ts
 * @description Centralized error message formatting for user-friendly errors
 */

/**
 * Converts technical errors to user-friendly messages.
 * Used across the app for consistent UX.
 */
export function toUserFriendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()

  // Databricks-specific errors
  if (
    lower.includes("table_or_view_not_found") ||
    lower.includes("42p01") ||
    lower.includes("cannot be found") ||
    lower.includes("doesn't exist")
  ) {
    return "Object not found. Have you run the required notebooks?"
  }

  if (lower.includes("table_or_view_already_exists") || lower.includes("42p07")) {
    return "Already exists from a previous run."
  }

  // Authentication errors
  if (
    lower.includes("unauthorized") ||
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("authentication") ||
    lower.includes("invalid token")
  ) {
    return "Authentication failed. Please reconnect your Databricks workspace in Settings."
  }

  // Permission errors
  if (lower.includes("permission") || lower.includes("permission_denied")) {
    return "Permission denied. Check your PAT has required scopes (sql, workspace, catalogs)."
  }

  // Network errors
  if (
    lower.includes("econnrefused") ||
    lower.includes("timeout") ||
    lower.includes("network") ||
    lower.includes("connect")
  ) {
    return "Cannot reach Databricks. Check your workspace URL and network."
  }

  // Warehouse errors
  if (lower.includes("no warehouses") || lower.includes("empty")) {
    return "No SQL Warehouse found. Create one in your Databricks workspace."
  }

  if (lower.includes("not running") || lower.includes("stopped")) {
    return "SQL Warehouse is stopped. Start it in Databricks console."
  }

  // Resource limits
  if (lower.includes("quota") || lower.includes("limit") || lower.includes("rate limit")) {
    return "Rate limit exceeded. Wait a moment and try again."
  }

  // Database errors
  if (lower.includes("database") || lower.includes("turso")) {
    return "Database error. Please try again later."
  }

  // Generic fallback - truncate long messages
  if (message.length > 100) {
    return message.slice(0, 100) + "..."
  }

  return message
}

/**
 * Checks if error indicates a retry-able situation
 */
export function isRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return (
    message.includes("timeout") ||
    message.includes("rate limit") ||
    message.includes("quota") ||
    message.includes("temporary")
  )
}