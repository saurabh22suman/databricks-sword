import { sql } from "drizzle-orm"
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

/**
 * Users table for optional authentication.
 */
export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").unique(),
  emailVerified: integer("email_verified", { mode: "timestamp" }),
  name: text("name"),
  image: text("image"),
  leaderboardOptIn: integer("leaderboard_opt_in", { mode: "boolean" })
    .notNull()
    .default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
})

/**
 * Flashcard progress for spaced repetition tracking.
 */
export const flashcardProgress = sqliteTable("flashcard_progress", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  flashcardId: text("flashcard_id").notNull(),
  ease: integer("ease").notNull().default(250),
  interval: integer("interval").notNull().default(0),
  repetitions: integer("repetitions").notNull().default(0),
  nextReviewAt: integer("next_review_at", { mode: "timestamp" }),
  lastReviewedAt: integer("last_reviewed_at", { mode: "timestamp" }),
})

/**
 * Sandbox snapshots for syncing browser progress to server.
 * Stores complete sandbox state as JSON for cross-device continuity.
 */
export const sandboxSnapshots = sqliteTable(
  "sandbox_snapshots",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    snapshotData: text("snapshot_data").notNull(), // JSON string of SandboxData
    totalXp: integer("total_xp").notNull().default(0),
    currentStreak: integer("current_streak").notNull().default(0),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("sandbox_snapshots_user_id_unique").on(table.userId)],
)

/**
 * Auth.js v5 - Provider account linking
 */
export const accounts = sqliteTable("accounts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
})

/**
 * Auth.js v5 - Active sessions
 */
export const sessions = sqliteTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
})

/**
 * Auth.js v5 - Email verification tokens
 */
export const verificationTokens = sqliteTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull().unique(),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
})

/**
 * Databricks workspace connections for real execution mode.
 */
export const databricksConnections = sqliteTable("databricks_connections", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceUrl: text("workspace_url").notNull(),
  encryptedPat: text("encrypted_pat").notNull(),
  warehouseId: text("warehouse_id"), // SQL Warehouse ID for validation queries
  catalogName: text("catalog_name").notNull().default("dev"), // Unity Catalog name
  patExpiresAt: integer("pat_expires_at", { mode: "timestamp" }),
  connectedAt: integer("connected_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  lastValidatedAt: integer("last_validated_at", { mode: "timestamp" }),
})

/**
 * Blog posts table for admin-managed content.
 * Supports draft/published/archived status and external URL imports.
 */
export const blogPosts = sqliteTable("blog_posts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  content: text("content").notNull(), // Markdown content
  author: text("author").notNull().default("Databricks Sword"),
  category: text("category").notNull(), // tutorials, best-practices, architecture, news, deep-dive
  tags: text("tags").notNull().default("[]"), // JSON array of strings
  status: text("status").notNull().default("draft"), // draft, published, archived
  sourceUrl: text("source_url"), // Original URL if imported
  citations: text("citations").default("[]"), // JSON array of citation objects
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  publishedAt: integer("published_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
})

/**
 * FAQ items table for admin-managed FAQ content.
 */
export const faqItems = sqliteTable("faq_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  category: text("category").notNull(), // general, delta-lake, pyspark, sql, mlflow, architecture
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  codeExample: text("code_example"), // Optional code snippet
  keyPoints: text("key_points").default("[]"), // JSON array of strings
  displayOrder: integer("display_order").notNull().default(0),
  status: text("status").notNull().default("published"), // draft, published, archived
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
})

/**
 * Field Operations deployments for real Databricks missions.
 * Tracks deployment lifecycle from pending to cleaned up.
 */
export const fieldOpsDeployments = sqliteTable("field_ops_deployments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  industry: text("industry").notNull(), // retail, gaming, healthcare, fintech, automotive, manufacturing, telecom, agritech
  status: text("status").notNull().default("pending"), // pending, deploying, deployed, validating, completed, failed, cleaning_up, cleaned_up
  catalogName: text("catalog_name").notNull().default("default"),
  schemaPrefix: text("schema_prefix").notNull(), // e.g., "fo_retail_abc123"
  warehouseId: text("warehouse_id"),
  workspaceUrl: text("workspace_url"),
  bundlePath: text("bundle_path"), // Local path to generated bundle
  deployedAt: integer("deployed_at", { mode: "timestamp" }),
  validatedAt: integer("validated_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  cleanedUpAt: integer("cleaned_up_at", { mode: "timestamp" }),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
})

/**
 * Field Operations validation results.
 * Stores results from running validation queries against deployed resources.
 */
export const fieldOpsValidations = sqliteTable(
  "field_ops_validations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    deploymentId: text("deployment_id")
      .notNull()
      .references(() => fieldOpsDeployments.id, { onDelete: "cascade" }),
    runId: text("run_id").notNull(),
    checkKey: text("check_key").notNull(),
    checkName: text("check_name").notNull(),
    query: text("query").notNull(),
    passed: integer("passed", { mode: "boolean" }).notNull(),
    executedAt: integer("executed_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    errorMessage: text("error_message"),
  },
  (table) => [
    index("field_ops_validations_deployment_run_idx").on(
      table.deploymentId,
      table.runId,
    ),
    index("field_ops_validations_deployment_run_check_idx").on(
      table.deploymentId,
      table.runId,
      table.checkKey,
    ),
  ],
)

/**
 * Field Operations completion ledger.
 * Canonical server-side source of truth for one-time Field Ops XP awards.
 */
export const fieldOpsCompletions = sqliteTable(
  "field_ops_completions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deploymentId: text("deployment_id")
      .notNull()
      .references(() => fieldOpsDeployments.id, { onDelete: "cascade" }),
    industry: text("industry").notNull(),
    xpAwarded: integer("xp_awarded").notNull(),
    completedAt: integer("completed_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("field_ops_completions_user_industry_unique").on(
      table.userId,
      table.industry,
    ),
  ],
)

/**
 * Field Operations operation metadata.
 * Records idempotency, lifecycle, timing, and failure classification for orchestration.
 */
export const fieldOpsOperations = sqliteTable(
  "field_ops_operations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    deploymentId: text("deployment_id")
      .notNull()
      .references(() => fieldOpsDeployments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    operationType: text("operation_type").notNull(), // deploy | validate | cleanup
    state: text("state").notNull().default("started"), // started | succeeded | failed
    requestId: text("request_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    correlationId: text("correlation_id").notNull(),
    startedAt: integer("started_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    durationMs: integer("duration_ms"),
    failureClass: text("failure_class"),
    failureCode: text("failure_code"),
    failureMessage: text("failure_message"),
    attemptCount: integer("attempt_count").notNull().default(1),
    retryCount: integer("retry_count").notNull().default(0),
    estimatedCostUnits: integer("estimated_cost_units").notNull().default(0),
    metadata: text("metadata"), // JSON object
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("field_ops_operations_operation_idempotency_unique").on(
      table.deploymentId,
      table.operationType,
      table.idempotencyKey,
    ),
    index("field_ops_operations_deployment_type_state_idx").on(
      table.deploymentId,
      table.operationType,
      table.state,
      table.startedAt,
    ),
    index("field_ops_operations_user_started_idx").on(
      table.userId,
      table.startedAt,
    ),
    index("field_ops_operations_started_at_idx").on(table.startedAt),
    index("field_ops_operations_active_operation_lock_idx")
      .on(table.deploymentId)
      .where(sql`${table.state} = 'started'`),
  ],
)

/**
 * Coupon redemption records.
 * Canonical server-side source of truth for one-time XP coupon awards.
 */
export const couponRedemptions = sqliteTable(
  "coupon_redemptions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    xpAwarded: integer("xp_awarded").notNull(),
    redeemedAt: integer("redeemed_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("coupon_redemptions_user_code_unique").on(
      table.userId,
      table.code,
    ),
  ],
)
