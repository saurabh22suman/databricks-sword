import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fs module
const mockExistsSync = vi.fn();
const mockCpSync = vi.fn();
const mockRmSync = vi.fn();
const mockMkdtempSync = vi.fn();

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    default: {
      ...actual,
      existsSync: (...args: unknown[]) => mockExistsSync(...args),
      cpSync: (...args: unknown[]) => mockCpSync(...args),
      rmSync: (...args: unknown[]) => mockRmSync(...args),
      mkdtempSync: (...args: unknown[]) => mockMkdtempSync(...args),
    },
    ...actual,
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    cpSync: (...args: unknown[]) => mockCpSync(...args),
    rmSync: (...args: unknown[]) => mockRmSync(...args),
    mkdtempSync: (...args: unknown[]) => mockMkdtempSync(...args),
  };
});

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    default: {
      ...actual,
      existsSync: (...args: unknown[]) => mockExistsSync(...args),
      cpSync: (...args: unknown[]) => mockCpSync(...args),
      rmSync: (...args: unknown[]) => mockRmSync(...args),
      mkdtempSync: (...args: unknown[]) => mockMkdtempSync(...args),
    },
    ...actual,
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    cpSync: (...args: unknown[]) => mockCpSync(...args),
    rmSync: (...args: unknown[]) => mockRmSync(...args),
    mkdtempSync: (...args: unknown[]) => mockMkdtempSync(...args),
  };
});

import {
    _resetBundleStatusStore,
    _resetCommandExecutor,
    _setCommandExecutor,
    deployBundle,
    destroyBundle,
    getBundleStatus,
    type CommandExecutor,
} from "../bundleManager";

describe("DAB Bundle Manager", () => {
  const userId = "user-123";
  const missionSlug = "lakehouse-fundamentals";
  const workspaceUrl = "https://dbc-abc123.cloud.databricks.com";
  const pat = "dapi_test_token_123";

  let mockCommandExecutor: ReturnType<typeof vi.fn<CommandExecutor>>;

  beforeEach(() => {
    vi.clearAllMocks();
    _resetBundleStatusStore();

    // Setup command executor mock
    mockCommandExecutor = vi.fn<CommandExecutor>();
    _setCommandExecutor(mockCommandExecutor);

    // Setup fs mocks defaults
    mockExistsSync.mockReturnValue(true);
    mockMkdtempSync.mockReturnValue("/tmp/dbsword-test-123");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    _resetCommandExecutor();
  });

  describe("deployBundle", () => {
    it("copies mission bundle to temp directory", async () => {
      mockCommandExecutor.mockResolvedValue({ stdout: "Success", stderr: "" });

      await deployBundle(userId, missionSlug, workspaceUrl, pat);

      expect(mockCpSync).toHaveBeenCalledWith(
        expect.stringContaining(missionSlug),
        expect.stringContaining("/tmp/"),
        expect.objectContaining({ recursive: true })
      );
    });

    it("sets DATABRICKS_HOST and DATABRICKS_TOKEN env vars for CLI", async () => {
      mockCommandExecutor.mockResolvedValue({ stdout: "Success", stderr: "" });

      await deployBundle(userId, missionSlug, workspaceUrl, pat);

      expect(mockCommandExecutor).toHaveBeenCalledWith(
        "databricks",
        ["bundle", "deploy"],
        expect.objectContaining({
          env: expect.objectContaining({
            DATABRICKS_HOST: workspaceUrl,
            DATABRICKS_TOKEN: pat,
          }),
        })
      );
    });

    it("runs databricks bundle deploy command", async () => {
      mockCommandExecutor.mockResolvedValue({ stdout: "Success", stderr: "" });

      await deployBundle(userId, missionSlug, workspaceUrl, pat);

      expect(mockCommandExecutor).toHaveBeenCalledWith(
        "databricks",
        ["bundle", "deploy"],
        expect.any(Object)
      );
    });

    it("returns deployed status on success", async () => {
      mockCommandExecutor.mockResolvedValue({ stdout: "Success", stderr: "" });

      const result = await deployBundle(userId, missionSlug, workspaceUrl, pat);

      expect(result.status).toBe("deployed");
      expect(result.deployedAt).toBeDefined();
    });

    it("returns error status when deploy fails", async () => {
      mockCommandExecutor.mockRejectedValue(new Error("Deploy failed: authentication error"));

      const result = await deployBundle(userId, missionSlug, workspaceUrl, pat);

      expect(result.status).toBe("error");
      expect(result.error).toContain("authentication error");
    });

    it("throws error when mission bundle directory does not exist", async () => {
      mockExistsSync.mockReturnValue(false);

      await expect(deployBundle(userId, missionSlug, workspaceUrl, pat)).rejects.toThrow(
        /bundle.*not found|does not exist/i
      );
    });

    it("returns error status when databricks CLI fails", async () => {
      mockCommandExecutor.mockRejectedValue(new Error("databricks: command not found"));

      const result = await deployBundle(userId, missionSlug, workspaceUrl, pat);

      expect(result.status).toBe("error");
      expect(result.error).toContain("command not found");
    });
  });

  describe("destroyBundle", () => {
    it("runs databricks bundle destroy command with auto-approve", async () => {
      mockCommandExecutor.mockResolvedValue({ stdout: "Success", stderr: "" });

      await destroyBundle(userId, missionSlug, workspaceUrl, pat);

      expect(mockCommandExecutor).toHaveBeenCalledWith(
        "databricks",
        ["bundle", "destroy", "--auto-approve"],
        expect.any(Object)
      );
    });

    it("cleans up temp directory after destroy", async () => {
      mockCommandExecutor.mockResolvedValue({ stdout: "Success", stderr: "" });

      await destroyBundle(userId, missionSlug, workspaceUrl, pat);

      expect(mockRmSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ recursive: true, force: true })
      );
    });

    it("returns not-deployed status on success", async () => {
      mockCommandExecutor.mockResolvedValue({ stdout: "Success", stderr: "" });

      const result = await destroyBundle(userId, missionSlug, workspaceUrl, pat);

      expect(result.status).toBe("not-deployed");
    });

    it("returns error status when destroy fails", async () => {
      mockCommandExecutor.mockRejectedValue(new Error("Destroy failed"));

      const result = await destroyBundle(userId, missionSlug, workspaceUrl, pat);

      expect(result.status).toBe("error");
      expect(result.error).toContain("Destroy failed");
    });
  });

  describe("getBundleStatus", () => {
    it("returns not-deployed when no deploy has occurred", () => {
      const result = getBundleStatus(userId, missionSlug);

      expect(result.status).toBe("not-deployed");
    });

    it("returns deployed when bundle was successfully deployed", async () => {
      mockCommandExecutor.mockResolvedValue({ stdout: "Success", stderr: "" });

      await deployBundle(userId, missionSlug, workspaceUrl, pat);

      const result = getBundleStatus(userId, missionSlug);

      expect(result.status).toBe("deployed");
      expect(result.deployedAt).toBeDefined();
    });

    it("returns not-deployed after bundle is destroyed", async () => {
      mockCommandExecutor.mockResolvedValue({ stdout: "Success", stderr: "" });

      // Deploy then destroy
      await deployBundle(userId, missionSlug, workspaceUrl, pat);
      await destroyBundle(userId, missionSlug, workspaceUrl, pat);

      const result = getBundleStatus(userId, missionSlug);

      expect(result.status).toBe("not-deployed");
    });

    it("tracks status per user and mission", async () => {
      mockCommandExecutor.mockResolvedValue({ stdout: "Success", stderr: "" });

      // Deploy for user-123
      await deployBundle("user-123", missionSlug, workspaceUrl, pat);

      // Check different user
      const otherUserResult = getBundleStatus("user-456", missionSlug);
      const deployedUserResult = getBundleStatus("user-123", missionSlug);

      expect(otherUserResult.status).toBe("not-deployed");
      expect(deployedUserResult.status).toBe("deployed");
    });
  });

  describe("error handling", () => {
    it("handles authentication errors gracefully", async () => {
      mockCommandExecutor.mockRejectedValue(new Error("401 Unauthorized"));

      const result = await deployBundle(userId, missionSlug, workspaceUrl, pat);

      expect(result.status).toBe("error");
      expect(result.error).toContain("401 Unauthorized");
    });

    it("handles network errors gracefully", async () => {
      mockCommandExecutor.mockRejectedValue(new Error("Network error: Connection refused"));

      const result = await deployBundle(userId, missionSlug, workspaceUrl, pat);

      expect(result.status).toBe("error");
      expect(result.error).toContain("Connection refused");
    });
  });
});
