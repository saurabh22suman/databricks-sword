/**
 * Field Operations Deployment Management
 * Orchestrates the deployment lifecycle for Field Ops missions.
 */

import { and, desc, eq, inArray, lt } from "drizzle-orm"
import { deployBundle, destroyBundle, generateBundle } from "../databricks/bundle"
import { fieldOpsDeployments, fieldOpsOperations, fieldOpsValidations, getDb } from "../db"
import { runValidation } from "./validation"
import type {
  CleanupResult,
  DatabricksConnection,
  Deployment,
  DeploymentStatus,
  Industry,
  ValidationResult,
} from "./types"

const ACTIVE_OPERATION_STALE_MS = 10 * 60 * 1000
const DEPLOY_RETRY_DELAYS_MS = [250, 750]
const CLEANUP_RETRY_DELAYS_MS = [250, 750]
const VALIDATION_RETRY_DELAYS_MS = [200, 500]

type OperationType = "deploy" | "validate" | "cleanup"
type OperationState = "started" | "succeeded" | "failed"

type OperationContext = {
  idempotencyKey: string
  requestId: string
  correlationId: string
}

type OperationRecord = {
  id: string
  deploymentId: string
  userId: string
  operationType: string
  state: string
  requestId: string
  idempotencyKey: string
  correlationId: string
  startedAt: Date
  completedAt: Date | null
  durationMs: number | null
  failureClass: string | null
  failureCode: string | null
  failureMessage: string | null
  attemptCount: number
  retryCount: number
  estimatedCostUnits: number
  metadata: string | null
}

export class DeploymentConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DeploymentConflictError"
  }
}

const ALLOWED_STATUS_TRANSITIONS: Record<DeploymentStatus, DeploymentStatus[]> = {
  pending: ["deploying", "failed"],
  deploying: ["pipeline_running", "deployed", "failed", "cleaning_up"],
  pipeline_running: ["deployed", "failed", "cleaning_up"],
  deployed: ["validating", "completed", "cleaning_up", "failed"],
  validating: ["deployed", "failed", "cleaning_up"],
  completed: ["cleaning_up", "failed"],
  failed: ["deploying", "cleaning_up"],
  cleaning_up: ["cleaned_up", "failed"],
  cleaned_up: [],
}

function now(): Date {
  return new Date()
}

function getEstimatedCostUnits(operationType: OperationType): number {
  if (operationType === "deploy") {
    return 12
  }

  if (operationType === "validate") {
    return 4
  }

  return 3
}

function parseOperationMetadata(metadataRaw: string | null): Record<string, unknown> {
  if (!metadataRaw) {
    return {}
  }

  try {
    const parsed = JSON.parse(metadataRaw) as Record<string, unknown>
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function classifyFailure(error: unknown): {
  failureClass: string
  failureCode: string
  failureMessage: string
} {
  const message = error instanceof Error ? error.message : "Unknown error"
  const lower = message.toLowerCase()

  if (lower.includes("timeout") || lower.includes("timed out")) {
    return {
      failureClass: "timeout",
      failureCode: "TIMEOUT",
      failureMessage: message,
    }
  }

  if (lower.includes("forbidden") || lower.includes("permission") || lower.includes("unauthorized")) {
    return {
      failureClass: "auth",
      failureCode: "AUTHORIZATION_FAILED",
      failureMessage: message,
    }
  }

  if (lower.includes("network") || lower.includes("econn") || lower.includes("socket")) {
    return {
      failureClass: "network",
      failureCode: "NETWORK_FAILURE",
      failureMessage: message,
    }
  }

  if (lower.includes("validation") || lower.includes("invalid") || lower.includes("missing")) {
    return {
      failureClass: "validation",
      failureCode: "VALIDATION_FAILURE",
      failureMessage: message,
    }
  }

  return {
    failureClass: "internal",
    failureCode: "INTERNAL_FAILURE",
    failureMessage: message,
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function withRetry<T>(
  maxAttempts: number,
  delaysMs: number[],
  fn: () => Promise<T>
): Promise<{ result: T; retries: number }> {
  let attempt = 0
  let lastError: unknown = null

  while (attempt < maxAttempts) {
    try {
      const result = await fn()
      return { result, retries: attempt }
    } catch (error) {
      lastError = error
      if (attempt >= maxAttempts - 1) {
        break
      }

      const delay = delaysMs[attempt] ?? delaysMs[delaysMs.length - 1] ?? 200
      await sleep(delay)
      attempt += 1
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Operation retries exhausted")
}

function assertValidStatusTransition(current: DeploymentStatus, next: DeploymentStatus): void {
  if (current === next) {
    return
  }

  const allowed = ALLOWED_STATUS_TRANSITIONS[current] ?? []
  if (!allowed.includes(next)) {
    throw new DeploymentConflictError(
      `Invalid deployment status transition: ${current} -> ${next}`
    )
  }
}

async function createOrReuseOperation(params: {
  deploymentId: string
  userId: string
  operationType: OperationType
  context: OperationContext
}): Promise<{ operation: OperationRecord; replayed: boolean }> {
  const db = getDb()
  const staleBefore = new Date(Date.now() - ACTIVE_OPERATION_STALE_MS)

  const existingForIdempotency = (await db
    .select()
    .from(fieldOpsOperations)
    .where(
      and(
        eq(fieldOpsOperations.deploymentId, params.deploymentId),
        eq(fieldOpsOperations.operationType, params.operationType),
        eq(fieldOpsOperations.idempotencyKey, params.context.idempotencyKey)
      )
    )
    .orderBy(desc(fieldOpsOperations.createdAt))
    .limit(1)) as OperationRecord[]

  if (existingForIdempotency[0]) {
    const existing = existingForIdempotency[0]
    const existingStartedAt = new Date(existing.startedAt)
    const isStale = existing.state === "started" && existingStartedAt < staleBefore

    if (existing.state === "started" && !isStale) {
      throw new DeploymentConflictError(
        `${params.operationType} operation already in progress for this deployment`
      )
    }

    if (existing.state !== "started") {
      return { operation: existing, replayed: true }
    }

    await db
      .update(fieldOpsOperations)
      .set({
        state: "failed",
        failureClass: "stale",
        failureCode: "STALE_OPERATION",
        failureMessage: "Previous operation marked stale by guardrail",
        completedAt: now(),
        durationMs: Math.max(0, Date.now() - existingStartedAt.getTime()),
        updatedAt: now(),
      })
      .where(eq(fieldOpsOperations.id, existing.id))
  }

  const activeConflicts = (await db
    .select()
    .from(fieldOpsOperations)
    .where(
      and(
        eq(fieldOpsOperations.deploymentId, params.deploymentId),
        eq(fieldOpsOperations.state, "started")
      )
    )) as OperationRecord[]

  const nonStaleConflicts = activeConflicts.filter(
    (operation) => new Date(operation.startedAt) >= staleBefore
  )

  if (nonStaleConflicts.length > 0) {
    throw new DeploymentConflictError("Another operation is already running for this deployment")
  }

  const staleConflictIds = activeConflicts
    .filter((operation) => new Date(operation.startedAt) < staleBefore)
    .map((operation) => operation.id)

  if (staleConflictIds.length > 0) {
    await db
      .update(fieldOpsOperations)
      .set({
        state: "failed",
        failureClass: "stale",
        failureCode: "STALE_OPERATION",
        failureMessage: "Stale operation timed out before completion",
        completedAt: now(),
        updatedAt: now(),
      })
      .where(inArray(fieldOpsOperations.id, staleConflictIds))
  }

  const [operation] = await db
    .insert(fieldOpsOperations)
    .values({
      deploymentId: params.deploymentId,
      userId: params.userId,
      operationType: params.operationType,
      state: "started",
      requestId: params.context.requestId,
      idempotencyKey: params.context.idempotencyKey,
      correlationId: params.context.correlationId,
      attemptCount: 1,
      retryCount: 0,
      estimatedCostUnits: getEstimatedCostUnits(params.operationType),
      metadata: JSON.stringify({
        requestId: params.context.requestId,
        correlationId: params.context.correlationId,
      }),
    })
    .returning()

  return { operation: operation as OperationRecord, replayed: false }
}

async function finalizeOperationSuccess(
  operationId: string,
  startedAt: Date,
  retries: number,
  metadata: Record<string, unknown>
): Promise<void> {
  const db = getDb()
  const completedAt = now()
  await db
    .update(fieldOpsOperations)
    .set({
      state: "succeeded",
      completedAt,
      durationMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
      retryCount: retries,
      metadata: JSON.stringify(metadata),
      updatedAt: completedAt,
    })
    .where(eq(fieldOpsOperations.id, operationId))
}

async function finalizeOperationFailure(
  operationId: string,
  startedAt: Date,
  retries: number,
  error: unknown,
  metadata: Record<string, unknown>
): Promise<void> {
  const db = getDb()
  const completedAt = now()
  const classified = classifyFailure(error)

  await db
    .update(fieldOpsOperations)
    .set({
      state: "failed",
      completedAt,
      durationMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
      retryCount: retries,
      failureClass: classified.failureClass,
      failureCode: classified.failureCode,
      failureMessage: classified.failureMessage,
      metadata: JSON.stringify(metadata),
      updatedAt: completedAt,
    })
    .where(eq(fieldOpsOperations.id, operationId))
}

/**
 * Start a new Field Ops deployment.
 */
export async function startDeployment(
  userId: string,
  industry: Industry,
  config: DatabricksConnection,
  context: OperationContext
): Promise<{
  deployment: Deployment
  operationId: string
  requestId: string
  correlationId: string
  replayed: boolean
}> {
  const db = getDb()

  const existingForIdempotency = (await db
    .select()
    .from(fieldOpsOperations)
    .where(
      and(
        eq(fieldOpsOperations.userId, userId),
        eq(fieldOpsOperations.operationType, "deploy"),
        eq(fieldOpsOperations.idempotencyKey, context.idempotencyKey)
      )
    )
    .orderBy(desc(fieldOpsOperations.createdAt))
    .limit(1)) as OperationRecord[]

  if (existingForIdempotency[0]) {
    const existingOperation = existingForIdempotency[0]
    const deployment = await getDeploymentStatus(existingOperation.deploymentId)

    if (!deployment) {
      throw new Error("Deployment not found for idempotent deploy operation")
    }

    if (existingOperation.state === "started") {
      throw new DeploymentConflictError("Deploy operation already in progress for this idempotency key")
    }

    return {
      deployment,
      operationId: existingOperation.id,
      requestId: existingOperation.requestId,
      correlationId: existingOperation.correlationId,
      replayed: true,
    }
  }

  const bundlePath = await generateBundle(industry, userId, config)
  const schemaPrefix = bundlePath.split("/").pop()!

  const [deployment] = await db
    .insert(fieldOpsDeployments)
    .values({
      userId,
      industry,
      status: "deploying",
      catalogName: config.catalog,
      schemaPrefix,
      warehouseId: config.warehouseId,
      workspaceUrl: config.workspaceUrl,
      bundlePath,
    })
    .returning()

  const { operation, replayed } = await createOrReuseOperation({
    deploymentId: deployment.id,
    userId,
    operationType: "deploy",
    context,
  })

  if (replayed) {
    return {
      deployment: deployment as Deployment,
      operationId: operation.id,
      requestId: operation.requestId,
      correlationId: operation.correlationId,
      replayed: true,
    }
  }

  const startedAt = now()

  try {
    const { result, retries } = await withRetry(3, DEPLOY_RETRY_DELAYS_MS, async () => {
      const deployResult = await deployBundle(bundlePath, config)
      if (!deployResult.success) {
        throw new Error(deployResult.errorMessage || "Deployment failed")
      }
      return deployResult
    })

    const [updated] = await db
      .update(fieldOpsDeployments)
      .set({
        status: "deployed",
        deployedAt: now(),
        errorMessage: null,
        updatedAt: now(),
      })
      .where(eq(fieldOpsDeployments.id, deployment.id))
      .returning()

    await finalizeOperationSuccess(operation.id, startedAt, retries, {
      requestId: context.requestId,
      correlationId: context.correlationId,
      deploymentId: deployment.id,
      schemaPrefix,
      costProxy: {
        estimatedCostUnits: getEstimatedCostUnits("deploy"),
        retryCount: retries,
      },
      bundlePath: result.bundlePath,
    })

    return {
      deployment: updated as Deployment,
      operationId: operation.id,
      requestId: context.requestId,
      correlationId: context.correlationId,
      replayed: false,
    }
  } catch (error) {
    await db
      .update(fieldOpsDeployments)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown deployment error",
        updatedAt: now(),
      })
      .where(eq(fieldOpsDeployments.id, deployment.id))

    await finalizeOperationFailure(operation.id, startedAt, 2, error, {
      requestId: context.requestId,
      correlationId: context.correlationId,
      deploymentId: deployment.id,
      schemaPrefix,
      costProxy: {
        estimatedCostUnits: getEstimatedCostUnits("deploy"),
      },
    })

    throw error
  }
}

/**
 * Get deployment status and details.
 */
export async function getDeploymentStatus(
  deploymentId: string
): Promise<Deployment | null> {
  const db = getDb()
  const [deployment] = await db
    .select()
    .from(fieldOpsDeployments)
    .where(eq(fieldOpsDeployments.id, deploymentId))
    .limit(1)

  return (deployment as Deployment) || null
}

/**
 * Get active deployment for a user and industry.
 */
export async function getActiveDeployment(
  userId: string,
  industry: Industry
): Promise<Deployment | null> {
  const db = getDb()
  const [deployment] = await db
    .select()
    .from(fieldOpsDeployments)
    .where(
      and(
        eq(fieldOpsDeployments.userId, userId),
        eq(fieldOpsDeployments.industry, industry),
        eq(fieldOpsDeployments.status, "deployed")
      )
    )
    .limit(1)

  return (deployment as Deployment) || null
}

/**
 * Update deployment status with explicit transition guards.
 */
export async function updateDeploymentStatus(
  deploymentId: string,
  status: DeploymentStatus,
  errorMessage?: string
): Promise<void> {
  const db = getDb()
  const [current] = await db
    .select()
    .from(fieldOpsDeployments)
    .where(eq(fieldOpsDeployments.id, deploymentId))
    .limit(1)

  if (!current) {
    throw new Error("Deployment not found")
  }

  assertValidStatusTransition(current.status as DeploymentStatus, status)

  await db
    .update(fieldOpsDeployments)
    .set({
      status,
      errorMessage,
      updatedAt: now(),
      validatedAt: status === "deployed" && current.status === "validating" ? now() : current.validatedAt,
    })
    .where(eq(fieldOpsDeployments.id, deploymentId))
}

/**
 * Mark deployment as completed.
 */
export async function completeDeployment(
  deploymentId: string
): Promise<Deployment> {
  const db = getDb()
  const [current] = await db
    .select()
    .from(fieldOpsDeployments)
    .where(eq(fieldOpsDeployments.id, deploymentId))
    .limit(1)

  if (!current) {
    throw new Error("Deployment not found")
  }

  assertValidStatusTransition(current.status as DeploymentStatus, "completed")

  const [updated] = await db
    .update(fieldOpsDeployments)
    .set({
      status: "completed",
      completedAt: now(),
      updatedAt: now(),
    })
    .where(eq(fieldOpsDeployments.id, deploymentId))
    .returning()

  return updated as Deployment
}

/**
 * Clean up a deployment (drop schemas, remove bundle).
 */
export async function cleanupDeployment(
  deploymentId: string,
  userId: string,
  config: DatabricksConnection,
  context: OperationContext
): Promise<{
  result: CleanupResult
  operationId: string
  requestId: string
  correlationId: string
  replayed: boolean
}> {
  const deployment = await getDeploymentStatus(deploymentId)
  if (!deployment) {
    throw new Error("Deployment not found")
  }

  // Log cleanup details for debugging
  console.log("[Cleanup] Deployment:", {
    deploymentId,
    schemaPrefix: deployment.schemaPrefix,
    catalogName: deployment.catalogName,
    bundlePath: deployment.bundlePath,
    workspaceUrl: deployment.workspaceUrl,
  })

  // Older rows may not have a persisted bundlePath. Derive it from schemaPrefix so
  // remote Databricks assets can still be cleaned up from Settings bulk cleanup.
  const bundlePath = deployment.bundlePath ?? `/tmp/dbsword-bundles/${deployment.schemaPrefix}`
  console.log("[Cleanup] Using bundlePath:", bundlePath)

  const { operation, replayed } = await createOrReuseOperation({
    deploymentId,
    userId,
    operationType: "cleanup",
    context,
  })

  if (replayed) {
    const prior = parseOperationMetadata(operation.metadata)
    return {
      result: {
        success: operation.state === "succeeded",
        failures: Array.isArray(prior.failures) ? (prior.failures as CleanupResult["failures"]) : [],
      },
      operationId: operation.id,
      requestId: operation.requestId,
      correlationId: operation.correlationId,
      replayed: true,
    }
  }

  const startedAt = now()

  await updateDeploymentStatus(deploymentId, "cleaning_up")

  try {
    const { result: cleanupResult, retries } = await withRetry(3, CLEANUP_RETRY_DELAYS_MS, async () => {
      return destroyBundle(bundlePath, config)
    })

    if (cleanupResult.success) {
      await updateDeploymentStatus(deploymentId, "cleaned_up")

      await getDb()
        .update(fieldOpsDeployments)
        .set({
          cleanedUpAt: now(),
          updatedAt: now(),
        })
        .where(eq(fieldOpsDeployments.id, deploymentId))

      await finalizeOperationSuccess(operation.id, startedAt, retries, {
        requestId: context.requestId,
        correlationId: context.correlationId,
        deploymentId,
        failures: cleanupResult.failures,
        costProxy: {
          estimatedCostUnits: getEstimatedCostUnits("cleanup"),
          retryCount: retries,
        },
      })

      return {
        result: cleanupResult,
        operationId: operation.id,
        requestId: context.requestId,
        correlationId: context.correlationId,
        replayed: false,
      }
    }

    const partialError = new Error(
      `Cleanup partially failed: ${cleanupResult.failures
        .map((failure) => `${failure.resourceType}:${failure.resourceName}`)
        .join(", ")}`
    )

    await updateDeploymentStatus(deploymentId, "failed", partialError.message)
    await finalizeOperationFailure(operation.id, startedAt, retries, partialError, {
      requestId: context.requestId,
      correlationId: context.correlationId,
      deploymentId,
      failures: cleanupResult.failures,
      costProxy: {
        estimatedCostUnits: getEstimatedCostUnits("cleanup"),
        retryCount: retries,
      },
    })

    return {
      result: cleanupResult,
      operationId: operation.id,
      requestId: context.requestId,
      correlationId: context.correlationId,
      replayed: false,
    }
  } catch (error) {
    const classified = classifyFailure(error)
    await updateDeploymentStatus(deploymentId, "failed", classified.failureMessage)

    await finalizeOperationFailure(operation.id, startedAt, 2, error, {
      requestId: context.requestId,
      correlationId: context.correlationId,
      deploymentId,
      costProxy: {
        estimatedCostUnits: getEstimatedCostUnits("cleanup"),
      },
    })

    throw error
  }
}

/**
 * Run validation for a deployment with orchestration tracking.
 */
export async function validateDeployment(
  deploymentId: string,
  userId: string,
  config: DatabricksConnection,
  context: OperationContext
): Promise<{
  runId: string
  results: ValidationResult[]
  allPassed: boolean
  operationId: string
  requestId: string
  correlationId: string
  replayed: boolean
}> {
  const deployment = await getDeploymentStatus(deploymentId)
  if (!deployment) {
    throw new Error("Deployment not found")
  }

  if (deployment.status !== "deployed") {
    throw new DeploymentConflictError("Deployment must be in 'deployed' state")
  }

  const { operation, replayed } = await createOrReuseOperation({
    deploymentId,
    userId,
    operationType: "validate",
    context,
  })

  if (replayed) {
    const metadata = parseOperationMetadata(operation.metadata)
    return {
      runId: typeof metadata.runId === "string" ? metadata.runId : "",
      results: [],
      allPassed: Boolean(metadata.allPassed),
      operationId: operation.id,
      requestId: operation.requestId,
      correlationId: operation.correlationId,
      replayed: true,
    }
  }

  const startedAt = now()
  await updateDeploymentStatus(deploymentId, "validating")

  try {
    const { result: validationRun, retries } = await withRetry(3, VALIDATION_RETRY_DELAYS_MS, async () => {
      return runValidation(
        deploymentId,
        deployment.industry,
        deployment.catalogName,
        deployment.schemaPrefix,
        config
      )
    })

    const allPassed =
      validationRun.results.length > 0 && validationRun.results.every((result) => result.passed)

    await updateDeploymentStatus(deploymentId, "deployed")

    await finalizeOperationSuccess(operation.id, startedAt, retries, {
      requestId: context.requestId,
      correlationId: context.correlationId,
      deploymentId,
      runId: validationRun.runId,
      allPassed,
      resultCount: validationRun.results.length,
      costProxy: {
        estimatedCostUnits: getEstimatedCostUnits("validate"),
        retryCount: retries,
      },
    })

    return {
      runId: validationRun.runId,
      results: validationRun.results,
      allPassed,
      operationId: operation.id,
      requestId: context.requestId,
      correlationId: context.correlationId,
      replayed: false,
    }
  } catch (error) {
    try {
      await updateDeploymentStatus(deploymentId, "deployed")
    } catch {
      await updateDeploymentStatus(deploymentId, "failed", "Validation status recovery failed")
    }

    await finalizeOperationFailure(operation.id, startedAt, 2, error, {
      requestId: context.requestId,
      correlationId: context.correlationId,
      deploymentId,
      costProxy: {
        estimatedCostUnits: getEstimatedCostUnits("validate"),
      },
    })

    throw error
  }
}

/**
 * Get latest operations for deployment status views.
 */
export async function getDeploymentOperations(
  deploymentId: string,
  limit: number = 5
): Promise<OperationRecord[]> {
  const db = getDb()
  return (await db
    .select()
    .from(fieldOpsOperations)
    .where(eq(fieldOpsOperations.deploymentId, deploymentId))
    .orderBy(desc(fieldOpsOperations.startedAt))
    .limit(limit)) as OperationRecord[]
}

/**
 * Mark stale started operations as failed for a deployment.
 */
export async function markStaleDeploymentOperations(
  deploymentId: string,
  staleBefore: Date = new Date(Date.now() - ACTIVE_OPERATION_STALE_MS)
): Promise<number> {
  const db = getDb()
  const stale = (await db
    .select()
    .from(fieldOpsOperations)
    .where(
      and(
        eq(fieldOpsOperations.deploymentId, deploymentId),
        eq(fieldOpsOperations.state, "started"),
        lt(fieldOpsOperations.startedAt, staleBefore)
      )
    )) as OperationRecord[]

  if (stale.length === 0) {
    return 0
  }

  await db
    .update(fieldOpsOperations)
    .set({
      state: "failed",
      failureClass: "stale",
      failureCode: "STALE_OPERATION",
      failureMessage: "Operation timed out without completion",
      completedAt: now(),
      updatedAt: now(),
    })
    .where(
      and(
        eq(fieldOpsOperations.deploymentId, deploymentId),
        eq(fieldOpsOperations.state, "started"),
        lt(fieldOpsOperations.startedAt, staleBefore)
      )
    )

  return stale.length
}

/**
 * Get validation results for a deployment.
 */
export async function getValidationResults(deploymentId: string): Promise<ValidationResult[]> {
  const db = getDb()
  return (await db
    .select()
    .from(fieldOpsValidations)
    .where(eq(fieldOpsValidations.deploymentId, deploymentId))) as ValidationResult[]
}

/**
 * Get latest validation run for a deployment.
 */
export async function getLatestValidationRun(
  deploymentId: string
): Promise<{ runId: string; results: ValidationResult[] } | null> {
  const db = getDb()
  const latest = (await db
    .select()
    .from(fieldOpsValidations)
    .where(eq(fieldOpsValidations.deploymentId, deploymentId))
    .orderBy(desc(fieldOpsValidations.executedAt))
    .limit(1)) as ValidationResult[]

  if (latest.length === 0) {
    return null
  }

  const latestRunId = latest[0].runId
  const runResults = (await db
    .select()
    .from(fieldOpsValidations)
    .where(
      and(
        eq(fieldOpsValidations.deploymentId, deploymentId),
        eq(fieldOpsValidations.runId, latestRunId)
      )
    )) as ValidationResult[]

  return {
    runId: latestRunId,
    results: runResults,
  }
}

/**
 * Check if all validations have passed on latest validation run.
 */
export async function allValidationsPassed(deploymentId: string): Promise<boolean> {
  const latestRun = await getLatestValidationRun(deploymentId)
  if (!latestRun || latestRun.results.length === 0) {
    return false
  }

  return latestRun.results.every((result) => result.passed)
}
