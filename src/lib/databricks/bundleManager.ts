/**
 * DAB Bundle Manager
 * Manages deployment and destruction of Databricks Asset Bundles (DABs) for missions
 */

import { execFile as nodeExecFile } from "child_process";
import { cpSync, existsSync, mkdtempSync, rmSync } from "fs";
import os from "os";
import path from "path";
import type { BundleStatusResult } from "./types";

/**
 * Strict slug pattern — only lowercase alphanumeric and hyphens.
 * Prevents path traversal and command injection.
 */
const SAFE_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

/**
 * Validates a mission slug is safe for use in file paths and commands.
 * @throws Error if the slug is invalid
 */
function validateSlug(slug: string): void {
  if (!SAFE_SLUG_PATTERN.test(slug)) {
    throw new Error(
      `Invalid mission slug: "${slug}". Must be lowercase alphanumeric with hyphens only.`
    );
  }
  // Extra guard: reject any path traversal attempts
  if (slug.includes("..") || slug.includes("/") || slug.includes("\\")) {
    throw new Error(`Invalid mission slug: "${slug}" contains path traversal characters.`);
  }
}

/**
 * In-memory store for bundle status
 * Key: `${userId}:${missionSlug}`
 */
const bundleStatusStore = new Map<string, BundleStatusResult>();

/**
 * In-memory store for temp directories
 * Key: `${userId}:${missionSlug}`
 */
const tempDirStore = new Map<string, string>();

/**
 * Type for command executor function.
 * Uses execFile pattern (command + args) to prevent shell injection.
 */
export type CommandExecutor = (
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv }
) => Promise<{ stdout: string; stderr: string }>;

/**
 * Default command executor using Node.js execFile (no shell — prevents injection)
 */
const defaultExecutor: CommandExecutor = (command, args, options) =>
  new Promise((resolve, reject) => {
    nodeExecFile(command, args, options, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${error.message}\n${stderr}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });

/**
 * Configurable command executor for testing
 */
let commandExecutor: CommandExecutor = defaultExecutor;

/**
 * Sets a custom command executor (for testing)
 * @internal
 */
export function _setCommandExecutor(executor: CommandExecutor): void {
  commandExecutor = executor;
}

/**
 * Resets to the default command executor
 * @internal
 */
export function _resetCommandExecutor(): void {
  commandExecutor = defaultExecutor;
}

/**
 * Gets the key for the status store
 */
function getStoreKey(userId: string, missionSlug: string): string {
  return `${userId}:${missionSlug}`;
}

/**
 * Gets the mission bundle directory path
 */
function getMissionBundlePath(missionSlug: string): string {
  return path.join(
    process.cwd(),
    "src",
    "content",
    "missions",
    missionSlug,
    "bundle"
  );
}

/**
 * Creates a temp directory for the bundle deployment
 */
function createTempDir(missionSlug: string): string {
  const prefix = `dbsword-${missionSlug}-`;
  return mkdtempSync(path.join(os.tmpdir(), prefix));
}

/**
 * Deploys a mission's DAB bundle to a Databricks workspace
 *
 * @param userId - The user's ID
 * @param missionSlug - The mission slug (e.g., "lakehouse-fundamentals")
 * @param workspaceUrl - The Databricks workspace URL
 * @param pat - Personal Access Token
 * @returns The deployment status
 */
export async function deployBundle(
  userId: string,
  missionSlug: string,
  workspaceUrl: string,
  pat: string
): Promise<BundleStatusResult> {
  // Validate slug before any file system or command operations
  validateSlug(missionSlug);

  const storeKey = getStoreKey(userId, missionSlug);
  const bundlePath = getMissionBundlePath(missionSlug);

  // Check if bundle directory exists
  if (!existsSync(bundlePath)) {
    throw new Error(
      `Bundle directory not found for mission: ${missionSlug}. ` +
        `Expected at: ${bundlePath}`
    );
  }

  // Update status to deploying
  bundleStatusStore.set(storeKey, { status: "deploying" });

  try {
    // Create temp directory and copy bundle
    const tempDir = createTempDir(missionSlug);
    tempDirStore.set(storeKey, tempDir);

    cpSync(bundlePath, tempDir, { recursive: true });

    // Set up environment for Databricks CLI
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      DATABRICKS_HOST: workspaceUrl,
      DATABRICKS_TOKEN: pat,
    };

    // Run databricks bundle deploy (execFile — no shell)
    await commandExecutor("databricks", ["bundle", "deploy"], { cwd: tempDir, env });

    // Update status to deployed
    const result: BundleStatusResult = { 
      status: "deployed", 
      deployedAt: new Date().toISOString() 
    };
    bundleStatusStore.set(storeKey, result);
    return result;
  } catch (error) {
    const result: BundleStatusResult = { 
      status: "error", 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
    bundleStatusStore.set(storeKey, result);
    return result;
  }
}

/**
 * Destroys a deployed mission bundle from a Databricks workspace
 *
 * @param userId - The user's ID
 * @param missionSlug - The mission slug
 * @param workspaceUrl - The Databricks workspace URL
 * @param pat - Personal Access Token
 * @returns The status after destruction
 */
export async function destroyBundle(
  userId: string,
  missionSlug: string,
  workspaceUrl: string,
  pat: string
): Promise<BundleStatusResult> {
  // Validate slug before any file system or command operations
  validateSlug(missionSlug);

  const storeKey = getStoreKey(userId, missionSlug);
  const bundlePath = getMissionBundlePath(missionSlug);

  // Update status to destroying
  bundleStatusStore.set(storeKey, { status: "destroying" });

  try {
    // Get or create temp directory
    let tempDir = tempDirStore.get(storeKey);

    if (!tempDir || !existsSync(tempDir)) {
      // Need to recreate temp dir with bundle for destroy command
      if (!existsSync(bundlePath)) {
        throw new Error(`Bundle directory not found for mission: ${missionSlug}`);
      }
      tempDir = createTempDir(missionSlug);
      tempDirStore.set(storeKey, tempDir);
      cpSync(bundlePath, tempDir, { recursive: true });
    }

    // Set up environment for Databricks CLI
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      DATABRICKS_HOST: workspaceUrl,
      DATABRICKS_TOKEN: pat,
    };

    // Run databricks bundle destroy with auto-approve (execFile — no shell)
    await commandExecutor("databricks", ["bundle", "destroy", "--auto-approve"], { cwd: tempDir, env });

    // Clean up temp directory
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDirStore.delete(storeKey);
    }

    // Update status to not-deployed
    const result: BundleStatusResult = { status: "not-deployed" };
    bundleStatusStore.set(storeKey, result);
    return result;
  } catch (error) {
    const result: BundleStatusResult = { 
      status: "error", 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
    bundleStatusStore.set(storeKey, result);
    return result;
  }
}

/**
 * Gets the current deployment status for a user's mission bundle
 *
 * @param userId - The user's ID
 * @param missionSlug - The mission slug
 * @returns The current bundle status
 */
export function getBundleStatus(userId: string, missionSlug: string): BundleStatusResult {
  const storeKey = getStoreKey(userId, missionSlug);
  return bundleStatusStore.get(storeKey) ?? { status: "not-deployed" };
}

/**
 * Resets the bundle status store (useful for testing)
 * @internal
 */
export function _resetBundleStatusStore(): void {
  bundleStatusStore.clear();
  tempDirStore.clear();
}
