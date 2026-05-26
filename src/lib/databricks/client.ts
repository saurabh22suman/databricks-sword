/**
 * Databricks SQL Statements API Client
 * Provides functions to interact with Databricks workspaces via the SQL Statements API
 */

import type { StatementResponse, Warehouse } from "./types";

const POLL_INTERVAL_MS = Number(process.env.DATABRICKS_POLL_INTERVAL_MS ?? 1000);
const DEFAULT_MAX_POLL_ATTEMPTS = 30; // 30 attempts × 1s = 30 seconds default

/** Extended options for query execution */
export type ExecuteOptions = {
  /** Timeout in seconds (5-300, default 30) */
  timeoutSeconds?: number;
  /** Maximum row limit (default 10000) */
  rowLimit?: number;
}

/** Default timeout of 30 seconds - suitable for most queries */
const DEFAULT_TIMEOUT_SECONDS = 30;
const DEFAULT_ROW_LIMIT = 10000;

/**
 * Makes an authenticated request to the Databricks API
 */
async function apiRequest<T>(
  workspaceUrl: string,
  pat: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${workspaceUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${pat}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Authentication failed: Unauthorized access to Databricks workspace`);
    }
    const errorData = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(`Databricks API error: ${errorData.message || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Internal type for raw Databricks API statement response
 */
type DatabricksStatementApiResponse = {
  statement_id: string;
  status: {
    state: string;
    error?: { message: string };
  };
  result?: {
    data_array?: unknown[][];
  };
};

/**
 * Internal type for warehouse list response
 */
type DatabricksWarehouseListResponse = {
  warehouses: Array<{
    id: string;
    name: string;
    state: string;
    size?: string;
  }>;
};

/**
 * Transforms raw API response to our typed StatementResponse
 */
function transformStatementResponse(raw: DatabricksStatementApiResponse): StatementResponse {
  return {
    statementId: raw.statement_id,
    status: raw.status.state as StatementResponse["status"],
    result: raw.result?.data_array ? { dataArray: raw.result.data_array } : undefined,
    error: raw.status.error ? { message: raw.status.error.message } : undefined,
  };
}

/**
 * Validation result type
 */
export type ValidationResult = {
  valid: boolean;
  error?: string;
  /** Specific error category for UI guidance */
  errorType?: "invalid_token" | "no_warehouse" | "warehouse_stopped" | "permission_denied" | "network_error" | "unknown";
};

/**
 * Categorizes validation errors for better user feedback
 */
function categorizeValidationError(error: Error, hasWarehouse: boolean): ValidationResult {
  const message = error.message.toLowerCase();

  // Authentication errors
  if (message.includes("unauthorized") || message.includes("403") || message.includes("401")) {
    return {
      valid: false,
      error: "Invalid or expired Personal Access Token",
      errorType: "invalid_token",
    };
  }

  // Permission errors
  if (message.includes("permission") || message.includes("permission_denied")) {
    return {
      valid: false,
      error: "PAT lacks required scopes (sql, jobs, workspace)",
      errorType: "permission_denied",
    };
  }

  // Network errors
  if (message.includes("ECONNREFUSED") || message.includes("timeout") || message.includes("network")) {
    return {
      valid: false,
      error: "Cannot reach Databricks workspace - check URL and network",
      errorType: "network_error",
    };
  }

  // Warehouse errors - no warehouses found at all
  if (message.includes("no warehouses") || message.includes("empty") || !hasWarehouse) {
    return {
      valid: false,
      error: "No SQL Warehouse found. Create a SQL Warehouse in your Databricks workspace first.",
      errorType: "no_warehouse",
    };
  }

  // Warehouse stopped
  if (message.includes("not running") || message.includes("stopped")) {
    return {
      valid: false,
      error: "SQL Warehouse is stopped. Start it in Databricks console to run queries.",
      errorType: "warehouse_stopped",
    };
  }

  // Unknown
  return {
    valid: false,
    error: error.message,
    errorType: "unknown",
  };
}

/**
 * Validates a Databricks connection by executing a simple SELECT 1 query
 *
 * @param workspaceUrl - The Databricks workspace URL (e.g., https://dbc-abc123.cloud.databricks.com)
 * @param pat - Personal Access Token for authentication
 * @returns ValidationResult indicating if connection is valid
 */
export async function validateConnection(workspaceUrl: string, pat: string): Promise<ValidationResult> {
  try {
    // First check if we have any warehouses
    const warehouses = await getWarehouses(workspaceUrl, pat);

    if (warehouses.length === 0) {
      return categorizeValidationError(new Error("No warehouses found"), false);
    }

    const runningWarehouse = warehouses.find((w) => w.state === "RUNNING");

    if (!runningWarehouse) {
      // No running warehouse - return specific error
      const stoppedWarehouses = warehouses.filter((w) => w.state === "STOPPED");
      if (stoppedWarehouses.length > 0) {
        return categorizeValidationError(new Error("Warehouse stopped"), true);
      }
      return categorizeValidationError(new Error("No running warehouse found"), false);
    }

    // Execute a simple query to validate full connectivity
    const result = await executeStatement(workspaceUrl, pat, "SELECT 1", runningWarehouse.id);

    if (result.error) {
      return {
        valid: false,
        error: result.error.message,
        errorType: "unknown",
      };
    }

    return { valid: result.status === "SUCCEEDED" };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return categorizeValidationError(err, false);
  }
}

/**
 * Executes a SQL statement on a Databricks SQL Warehouse
 *
 * @param workspaceUrl - The Databricks workspace URL
 * @param pat - Personal Access Token
 * @param sql - SQL statement to execute
 * @param warehouseId - Optional warehouse ID. If not provided, auto-discovers a running warehouse.
 * @returns StatementResponse with execution results
 * @throws Error if authentication fails, no warehouse available, or warehouse not running
 */
export async function executeStatement(
  workspaceUrl: string,
  pat: string,
  sql: string,
  warehouseId?: string,
  options?: ExecuteOptions
): Promise<StatementResponse> {
  // Apply options with sensible defaults
  const timeout = options?.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS;
  const rowLimit = options?.rowLimit ?? DEFAULT_ROW_LIMIT;

  // Clamp timeout to valid range (5-300 seconds per API limits)
  const clampedTimeout = Math.max(5, Math.min(300, timeout));

  // Auto-discover warehouse if not provided
  const effectiveWarehouseId = warehouseId ?? (await discoverRunningWarehouse(workspaceUrl, pat));

  // Execute the statement
  const requestBody = {
    warehouse_id: effectiveWarehouseId,
    statement: sql,
    wait_timeout: `${clampedTimeout}s`,
    on_wait_timeout: "CONTINUE",
    row_limit: rowLimit,
  };

  // Calculate max poll attempts based on timeout
  const maxPollAttempts = Math.ceil(clampedTimeout * 1000 / POLL_INTERVAL_MS);

  const initialResponse = await apiRequest<DatabricksStatementApiResponse>(
    workspaceUrl,
    pat,
    "/api/2.0/sql/statements",
    {
      method: "POST",
      body: JSON.stringify(requestBody),
    }
  );

  // If the statement completed immediately, return the result
  if (
    initialResponse.status.state === "SUCCEEDED" ||
    initialResponse.status.state === "FAILED" ||
    initialResponse.status.state === "CANCELED" ||
    initialResponse.status.state === "CLOSED"
  ) {
    return transformStatementResponse(initialResponse);
  }

  // Poll for completion with configurable timeout
  return pollForResult(workspaceUrl, pat, initialResponse.statement_id, maxPollAttempts);
}

/**
 * Polls the statement status until completion or timeout
 */
async function pollForResult(
  workspaceUrl: string,
  pat: string,
  statementId: string,
  maxAttempts: number = DEFAULT_MAX_POLL_ATTEMPTS
): Promise<StatementResponse> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(POLL_INTERVAL_MS);

    const response = await apiRequest<DatabricksStatementApiResponse>(
      workspaceUrl,
      pat,
      `/api/2.0/sql/statements/${statementId}`,
      { method: "GET" }
    );

    if (
      response.status.state === "SUCCEEDED" ||
      response.status.state === "FAILED" ||
      response.status.state === "CANCELED" ||
      response.status.state === "CLOSED"
    ) {
      return transformStatementResponse(response);
    }
  }

  throw new Error(`Statement ${statementId} timed out after ${DEFAULT_MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS}ms`);
}

/**
 * Discovers a running SQL warehouse in the workspace
 */
async function discoverRunningWarehouse(workspaceUrl: string, pat: string): Promise<string> {
  const warehouses = await getWarehouses(workspaceUrl, pat);

  if (warehouses.length === 0) {
    throw new Error(
      "No SQL warehouses found in this workspace. " +
        "Please create a SQL warehouse in your Databricks workspace."
    );
  }

  const runningWarehouse = warehouses.find((w) => w.state === "RUNNING");

  if (!runningWarehouse) {
    throw new Error(
      `No running SQL warehouse found. Available warehouses: ${warehouses.map((w) => `${w.name} (${w.state})`).join(", ")}. ` +
        "Please start a warehouse or specify a warehouse ID."
    );
  }

  return runningWarehouse.id;
}

/**
 * Gets the list of SQL warehouses in the workspace
 *
 * @param workspaceUrl - The Databricks workspace URL
 * @param pat - Personal Access Token
 * @returns Array of Warehouse objects
 * @throws Error if authentication fails
 */
export async function getWarehouses(workspaceUrl: string, pat: string): Promise<Warehouse[]> {
  const response = await apiRequest<DatabricksWarehouseListResponse>(
    workspaceUrl,
    pat,
    "/api/2.0/sql/warehouses",
    { method: "GET" }
  );

  return (response.warehouses ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    state: w.state as Warehouse["state"],
    size: w.size,
  }));
}

/**
 * Simple sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
