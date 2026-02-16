import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

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
export const sandboxSnapshots = sqliteTable("sandbox_snapshots", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  snapshotData: text("snapshot_data").notNull(), // JSON string of SandboxData
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex("sandbox_snapshots_user_id_unique").on(table.userId),
])

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
export const fieldOpsValidations = sqliteTable("field_ops_validations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  deploymentId: text("deployment_id")
    .notNull()
    .references(() => fieldOpsDeployments.id, { onDelete: "cascade" }),
  checkName: text("check_name").notNull(),
  query: text("query").notNull(),
  passed: integer("passed", { mode: "boolean" }).notNull(),
  executedAt: integer("executed_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  errorMessage: text("error_message"),
})

