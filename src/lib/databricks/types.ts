/**
 * Databricks Integration Types
 * Zod schemas and TypeScript types for Databricks API interactions
 */

import { z } from "zod";

/**
 * Bundle deployment status values
 */
export const bundleStatusSchema = z.enum([
  "not-deployed",
  "deploying",
  "deployed",
  "destroying",
  "error",
]);
export type BundleStatus = z.infer<typeof bundleStatusSchema>;

/**
 * Bundle operation result with status and metadata
 */
export const bundleStatusResultSchema = z.object({
  status: bundleStatusSchema,
  deployedAt: z.string().optional(),
  error: z.string().optional(),
});
export type BundleStatusResult = z.infer<typeof bundleStatusResultSchema>;

/**
 * Databricks workspace connection stored in database
 */
export const databricksConnectionSchema = z.object({
  userId: z.string().min(1),
  workspaceUrl: z.string().url(),
  encryptedPat: z.string().min(1),
  patExpiresAt: z.date().nullable(),
  connectedAt: z.date(),
  lastValidatedAt: z.date().nullable(),
});
export type DatabricksConnection = z.infer<typeof databricksConnectionSchema>;

/**
 * Statement execution response from Databricks SQL Statements API
 */
export const statementResponseSchema = z.object({
  statementId: z.string().min(1),
  status: z.enum(["PENDING", "RUNNING", "SUCCEEDED", "FAILED", "CANCELED", "CLOSED"]),
  result: z
    .object({
      dataArray: z.array(z.array(z.unknown())),
    })
    .optional(),
  error: z
    .object({
      message: z.string(),
    })
    .optional(),
});
export type StatementResponse = z.infer<typeof statementResponseSchema>;

/**
 * Result of evaluating a single mission query
 */
export const evaluationResultSchema = z.object({
  queryIndex: z.number().int().nonnegative(),
  description: z.string(),
  passed: z.boolean(),
  expected: z.unknown(),
  actual: z.unknown(),
  error: z.string().optional(),
});
export type EvaluationResult = z.infer<typeof evaluationResultSchema>;

/**
 * Mission evaluation query definition (stored in stage configs)
 */
export const evaluationQuerySchema = z.object({
  sql: z.string().min(1),
  description: z.string(),
  expectedResult: z.unknown(),
  tolerance: z.number().optional(),
});
export type EvaluationQuery = z.infer<typeof evaluationQuerySchema>;

/**
 * SQL warehouse info from Databricks API
 */
export const warehouseSchema = z.object({
  id: z.string(),
  name: z.string(),
  state: z.enum(["STARTING", "RUNNING", "STOPPING", "STOPPED", "DELETED"]),
  size: z.string().optional(),
});
export type Warehouse = z.infer<typeof warehouseSchema>;

/**
 * Databricks API execute statement request body
 */
export const executeStatementRequestSchema = z.object({
  warehouse_id: z.string(),
  statement: z.string(),
  wait_timeout: z.string().optional(),
  on_wait_timeout: z.enum(["CONTINUE", "CANCEL"]).optional(),
  catalog: z.string().optional(),
  schema: z.string().optional(),
});
export type ExecuteStatementRequest = z.infer<typeof executeStatementRequestSchema>;

/**
 * Mission bundle configuration (stored in mission.json)
 */
export const bundleConfigSchema = z.object({
  bundleName: z.string(),
  schemaName: z.string(),
  volumeName: z.string().optional(),
  notebookPath: z.string(),
  dataFiles: z.array(z.string()).optional(),
});
export type BundleConfig = z.infer<typeof bundleConfigSchema>;
