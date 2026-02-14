import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executeStatement, getWarehouses, validateConnection } from "../client";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Databricks client", () => {
  const workspaceUrl = "https://dbc-abc123.cloud.databricks.com";
  const pat = "dapi_test_token_123";

  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("validateConnection", () => {
    it("returns true for successful SELECT 1 query", async () => {
      // First call: get warehouses
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          warehouses: [
            { id: "wh-running", name: "Test Warehouse", state: "RUNNING" },
          ],
        }),
      });

      // Second call: execute SELECT 1
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statement_id: "stmt-123",
          status: { state: "SUCCEEDED" },
          result: { data_array: [[1]] },
        }),
      });

      const result = await validateConnection(workspaceUrl, pat);

      expect(result.valid).toBe(true);
    });

    it("returns false on authentication error (401)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: "Invalid access token" }),
      });

      const result = await validateConnection(workspaceUrl, pat);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Authentication failed");
    });

    it("returns false on forbidden error (403)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: "Access denied" }),
      });

      const result = await validateConnection(workspaceUrl, pat);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Authentication failed");
    });

    it("returns false on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await validateConnection(workspaceUrl, pat);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Network error");
    });

    it("returns false on invalid workspace URL", async () => {
      mockFetch.mockRejectedValueOnce(new Error("fetch failed"));

      const result = await validateConnection("not-a-valid-url", pat);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("executeStatement", () => {
    const warehouseId = "wh-abc123";
    const sql = "SELECT * FROM main.test.events LIMIT 10";

    it("executes statement and returns SUCCEEDED response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statement_id: "stmt-456",
          status: { state: "SUCCEEDED" },
          result: {
            data_array: [
              ["event1", "2025-01-01"],
              ["event2", "2025-01-02"],
            ],
          },
        }),
      });

      const result = await executeStatement(workspaceUrl, pat, sql, warehouseId);

      expect(result.statementId).toBe("stmt-456");
      expect(result.status).toBe("SUCCEEDED");
      expect(result.result?.dataArray).toHaveLength(2);
    });

    it("returns FAILED response with error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statement_id: "stmt-789",
          status: {
            state: "FAILED",
            error: {
              message: "Table not found: main.test.events",
            },
          },
        }),
      });

      const result = await executeStatement(workspaceUrl, pat, sql, warehouseId);

      expect(result.status).toBe("FAILED");
      expect(result.error?.message).toContain("Table not found");
    });

    it("polls for result when status is PENDING", async () => {
      // First call returns PENDING
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statement_id: "stmt-poll",
          status: { state: "PENDING" },
        }),
      });

      // Second call (poll) returns RUNNING
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statement_id: "stmt-poll",
          status: { state: "RUNNING" },
        }),
      });

      // Third call (poll) returns SUCCEEDED
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statement_id: "stmt-poll",
          status: { state: "SUCCEEDED" },
          result: { data_array: [["done"]] },
        }),
      });

      const result = await executeStatement(workspaceUrl, pat, sql, warehouseId);

      expect(result.status).toBe("SUCCEEDED");
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("auto-discovers warehouse ID if not provided", async () => {
      // First call: get warehouses
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          warehouses: [
            { id: "wh-auto", name: "Starter Warehouse", state: "RUNNING" },
          ],
        }),
      });

      // Second call: execute statement
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statement_id: "stmt-auto",
          status: { state: "SUCCEEDED" },
          result: { data_array: [[1]] },
        }),
      });

      const result = await executeStatement(workspaceUrl, pat, sql);

      expect(result.status).toBe("SUCCEEDED");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("throws error when no warehouse is available and none provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          warehouses: [],
        }),
      });

      await expect(executeStatement(workspaceUrl, pat, sql)).rejects.toThrow(
        /no.*warehouse/i
      );
    });

    it("throws error on auth failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: "Unauthorized" }),
      });

      await expect(
        executeStatement(workspaceUrl, pat, sql, warehouseId)
      ).rejects.toThrow(/auth|unauthorized/i);
    });

    it("throws error when warehouse is not running", async () => {
      // Get warehouses returns a stopped warehouse
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          warehouses: [
            { id: "wh-stopped", name: "Test Warehouse", state: "STOPPED" },
          ],
        }),
      });

      await expect(executeStatement(workspaceUrl, pat, sql)).rejects.toThrow(
        /no running/i
      );
    });
  });

  describe("getWarehouses", () => {
    it("returns list of available warehouses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          warehouses: [
            { id: "wh-1", name: "Production", state: "RUNNING", size: "2X-Small" },
            { id: "wh-2", name: "Development", state: "STOPPED", size: "Small" },
          ],
        }),
      });

      const warehouses = await getWarehouses(workspaceUrl, pat);

      expect(warehouses).toHaveLength(2);
      expect(warehouses[0]).toMatchObject({
        id: "wh-1",
        name: "Production",
        state: "RUNNING",
      });
    });

    it("returns empty array when no warehouses exist", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          warehouses: [],
        }),
      });

      const warehouses = await getWarehouses(workspaceUrl, pat);

      expect(warehouses).toEqual([]);
    });

    it("throws error on auth failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: "Invalid token" }),
      });

      await expect(getWarehouses(workspaceUrl, pat)).rejects.toThrow(
        /auth|unauthorized/i
      );
    });

    it("calls correct API endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ warehouses: [] }),
      });

      await getWarehouses(workspaceUrl, pat);

      expect(mockFetch).toHaveBeenCalledWith(
        `${workspaceUrl}/api/2.0/sql/warehouses`,
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: `Bearer ${pat}`,
          }),
        })
      );
    });
  });

  describe("request configuration", () => {
    it("sets correct content-type header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statement_id: "stmt-test",
          status: { state: "SUCCEEDED" },
          result: { data_array: [[1]] },
        }),
      });

      await executeStatement(workspaceUrl, pat, "SELECT 1", "wh-123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("includes statement in request body", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statement_id: "stmt-test",
          status: { state: "SUCCEEDED" },
          result: { data_array: [[1]] },
        }),
      });

      const testSql = "SELECT COUNT(*) FROM events";
      await executeStatement(workspaceUrl, pat, testSql, "wh-123");

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body as string);

      expect(body.statement).toBe(testSql);
      expect(body.warehouse_id).toBe("wh-123");
    });
  });
});
