import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MissionProgress } from "../types";

// Mock fetch for DAB API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(global, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

describe("Sandbox DAB Lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("initMission", () => {
    it("initializes mission in simulated mode without DAB call", async () => {
      const { initMission } = await import("../dabLifecycle");
      
      const result = await initMission("test-mission", "simulated");

      expect(result.executionMode).toBe("simulated");
      expect(result.bundleStatus).toBeUndefined();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("initializes mission in databricks mode and triggers deploy", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "deployed", deployedAt: "2024-01-15T10:30:00Z" }),
      });

      const { initMission } = await import("../dabLifecycle");
      
      const result = await initMission("test-mission", "databricks");

      expect(result.executionMode).toBe("databricks");
      expect(result.bundleStatus).toBe("deployed");
      expect(result.deployedAt).toBe("2024-01-15T10:30:00Z");
      expect(mockFetch).toHaveBeenCalledWith("/api/databricks/deploy", expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("test-mission"),
      }));
    });

    it("sets bundleStatus to error on deploy failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Workspace not connected" }),
      });

      const { initMission } = await import("../dabLifecycle");
      
      const result = await initMission("test-mission", "databricks");

      expect(result.executionMode).toBe("databricks");
      expect(result.bundleStatus).toBe("error");
    });
  });

  describe("closeMission", () => {
    it("archives simulated mission without destroy call", async () => {
      const { closeMission } = await import("../dabLifecycle");
      
      const progress: MissionProgress = {
        started: true,
        completed: true,
        stageProgress: {},
        sideQuestsCompleted: [],
        totalXpEarned: 100,
        executionMode: "simulated",
      };
      
      const result = await closeMission("test-mission", progress);

      expect(result.completed).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("destroys bundle when closing databricks mission with deployed bundle", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "not-deployed" }),
      });

      const { closeMission } = await import("../dabLifecycle");
      
      const progress: MissionProgress = {
        started: true,
        completed: true,
        stageProgress: {},
        sideQuestsCompleted: [],
        totalXpEarned: 100,
        executionMode: "databricks",
        bundleStatus: "deployed",
      };
      
      const result = await closeMission("test-mission", progress);

      expect(result.bundleStatus).toBe("not-deployed");
      expect(mockFetch).toHaveBeenCalledWith("/api/databricks/destroy", expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("test-mission"),
      }));
    });

    it("skips destroy for databricks mission with not-deployed bundle", async () => {
      const { closeMission } = await import("../dabLifecycle");
      
      const progress: MissionProgress = {
        started: true,
        completed: true,
        stageProgress: {},
        sideQuestsCompleted: [],
        totalXpEarned: 100,
        executionMode: "databricks",
        bundleStatus: "not-deployed",
      };
      
      const result = await closeMission("test-mission", progress);

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("resetMission", () => {
    it("resets simulated mission progress without destroy call", async () => {
      const { resetMission } = await import("../dabLifecycle");
      
      const progress: MissionProgress = {
        started: true,
        completed: false,
        stageProgress: { "01": { completed: true, xpEarned: 50, codeAttempts: [], hintsUsed: 0 } },
        sideQuestsCompleted: [],
        totalXpEarned: 50,
        executionMode: "simulated",
      };
      
      const result = await resetMission("test-mission", progress);

      expect(result.started).toBe(false);
      expect(result.stageProgress).toEqual({});
      expect(result.totalXpEarned).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("destroys bundle and resets when resetting databricks mission", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "not-deployed" }),
      });

      const { resetMission } = await import("../dabLifecycle");
      
      const progress: MissionProgress = {
        started: true,
        completed: false,
        stageProgress: {},
        sideQuestsCompleted: [],
        totalXpEarned: 50,
        executionMode: "databricks",
        bundleStatus: "deployed",
      };
      
      const result = await resetMission("test-mission", progress);

      expect(result.started).toBe(false);
      expect(result.bundleStatus).toBe("not-deployed");
      expect(mockFetch).toHaveBeenCalledWith("/api/databricks/destroy", expect.objectContaining({
        method: "POST",
      }));
    });
  });

  describe("updateBundleStatus", () => {
    it("updates bundle status in mission progress", async () => {
      const { updateBundleStatus } = await import("../dabLifecycle");
      
      const progress: MissionProgress = {
        started: true,
        completed: false,
        stageProgress: {},
        sideQuestsCompleted: [],
        totalXpEarned: 0,
        executionMode: "databricks",
        bundleStatus: "deploying",
      };
      
      const result = updateBundleStatus(progress, "deployed", "2024-01-15T10:30:00Z");

      expect(result.bundleStatus).toBe("deployed");
      expect(result.deployedAt).toBe("2024-01-15T10:30:00Z");
    });
  });
});
