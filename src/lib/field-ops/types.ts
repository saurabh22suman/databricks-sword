/**
 * Field Operations Types
 * Core type definitions for real Databricks deployment missions.
 */

/**
 * Available industries for Field Operations missions.
 * Unlocked progressively based on user XP.
 */
export type Industry =
  | "retail"
  | "gaming"
  | "healthcare"
  | "fintech"
  | "automotive"
  | "manufacturing"
  | "telecom"
  | "agritech"

/**
 * Deployment lifecycle status.
 */
export type DeploymentStatus =
  | "pending"       // Created but not started
  | "deploying"     // Bundle deployment in progress
  | "deployed"      // Successfully deployed
  | "validating"    // Running validation queries
  | "completed"     // All validations passed, XP awarded
  | "failed"        // Deployment or validation failed
  | "cleaning_up"   // Cleanup in progress
  | "cleaned_up"    // Resources destroyed

/**
 * Field Operations mission configuration.
 */
export type FieldOpsMission = {
  id: string
  industry: Industry
  title: string
  subtitle: string
  description: string
  scenario: string
  situation: string
  objectives: string[]
  xpRequired: number
  xpReward: number
  estimatedMinutes: number
  dataFiles: string[]
  notebooks: string[]
  validations: ValidationConfig[]
  hints: string[]
  emoji: string
}

/**
 * Validation configuration for a Field Ops mission.
 */
export type ValidationConfig = {
  checkName: string
  description: string
  query: string
  expectedResult: "exists" | "count" | "value"
  expectedValue?: string | number
}

/**
 * Field Operations deployment record.
 */
export type Deployment = {
  id: string
  userId: string
  industry: Industry
  status: DeploymentStatus
  catalogName: string
  schemaPrefix: string
  warehouseId?: string
  workspaceUrl?: string
  bundlePath?: string
  deployedAt?: Date
  validatedAt?: Date
  completedAt?: Date
  cleanedUpAt?: Date
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Validation result for a single check.
 */
export type ValidationResult = {
  id: string
  deploymentId: string
  checkName: string
  query: string
  passed: boolean
  executedAt: Date
  errorMessage?: string
}

/**
 * Databricks connection configuration.
 */
export type DatabricksConnection = {
  workspaceUrl: string
  token: string
  warehouseId: string
  catalog: string
}

/**
 * Industry configuration metadata.
 */
export type IndustryConfig = {
  industry: Industry
  emoji: string
  title: string
  description: string
  xpRequired: number
  xpReward: number
  estimatedMinutes: number
  schemas: string[] // Schema names created (bronze, silver, gold)
}

/**
 * Bundle deployment result.
 */
export type DeploymentResult = {
  success: boolean
  bundlePath?: string
  errorMessage?: string
}
