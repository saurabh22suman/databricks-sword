import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "../client";
import { evaluateMission } from "../evaluate";
import type { EvaluationQuery } from "../types";

// Mock the client module
vi.mock("../client", () => ({
  executeStatement: vi.fn(),
}));

const mockExecuteStatement = client.executeStatement as ReturnType<typeof vi.fn>;

describe("evaluateMission", () => {
  const workspaceUrl = "https://dbc-abc123.cloud.databricks.com";
  const pat = "dapi_test_token_123";
  const warehouseId = "wh-test-123";

  beforeEach(() => {
    mockExecuteStatement.mockReset();
  });

  describe("all queries pass", () => {
    it("returns all results with passed=true when queries match expected", async () => {
      const queries: EvaluationQuery[] = [
        {
          sql: "SELECT COUNT(*) FROM events",
          description: "Check row count is 1000",
          expectedResult: 1000,
        },
        {
          sql: "SELECT status FROM events LIMIT 1",
          description: "Check status column exists",
          expectedResult: "active",
        },
      ];

      mockExecuteStatement
        .mockResolvedValueOnce({
          statementId: "stmt-1",
          status: "SUCCEEDED",
          result: { dataArray: [[1000]] },
        })
        .mockResolvedValueOnce({
          statementId: "stmt-2",
          status: "SUCCEEDED",
          result: { dataArray: [["active"]] },
        });

      const results = await evaluateMission(workspaceUrl, pat, queries, warehouseId);

      expect(results).toHaveLength(2);
      expect(results[0].passed).toBe(true);
      expect(results[0].expected).toBe(1000);
      expect(results[0].actual).toBe(1000);
      expect(results[1].passed).toBe(true);
      expect(results[1].expected).toBe("active");
      expect(results[1].actual).toBe("active");
    });
  });

  describe("mixed pass/fail", () => {
    it("returns correct per-query results when some fail", async () => {
      const queries: EvaluationQuery[] = [
        {
          sql: "SELECT COUNT(*) FROM events",
          description: "Check row count is 1000",
          expectedResult: 1000,
        },
        {
          sql: "SELECT COUNT(*) FROM users",
          description: "Check user count is 500",
          expectedResult: 500,
        },
      ];

      mockExecuteStatement
        .mockResolvedValueOnce({
          statementId: "stmt-1",
          status: "SUCCEEDED",
          result: { dataArray: [[1000]] },
        })
        .mockResolvedValueOnce({
          statementId: "stmt-2",
          status: "SUCCEEDED",
          result: { dataArray: [[250]] }, // Wrong count
        });

      const results = await evaluateMission(workspaceUrl, pat, queries, warehouseId);

      expect(results[0].passed).toBe(true);
      expect(results[1].passed).toBe(false);
      expect(results[1].expected).toBe(500);
      expect(results[1].actual).toBe(250);
    });
  });

  describe("SQL execution errors", () => {
    it("returns graceful failure with error message when query fails", async () => {
      const queries: EvaluationQuery[] = [
        {
          sql: "SELECT * FROM nonexistent_table",
          description: "Check table exists",
          expectedResult: true,
        },
      ];

      mockExecuteStatement.mockResolvedValueOnce({
        statementId: "stmt-fail",
        status: "FAILED",
        error: { message: "Table not found: nonexistent_table" },
      });

      const results = await evaluateMission(workspaceUrl, pat, queries, warehouseId);

      expect(results).toHaveLength(1);
      expect(results[0].passed).toBe(false);
      expect(results[0].error).toContain("Table not found");
    });

    it("handles query timeout gracefully", async () => {
      const queries: EvaluationQuery[] = [
        {
          sql: "SELECT * FROM huge_table",
          description: "Check large query",
          expectedResult: 1000,
        },
      ];

      mockExecuteStatement.mockResolvedValueOnce({
        statementId: "stmt-timeout",
        status: "CANCELED",
      });

      const results = await evaluateMission(workspaceUrl, pat, queries, warehouseId);

      expect(results[0].passed).toBe(false);
      expect(results[0].error).toContain("CANCELED");
    });
  });

  describe("numeric tolerance comparison", () => {
    it("passes when actual is within tolerance of expected", async () => {
      const queries: EvaluationQuery[] = [
        {
          sql: "SELECT AVG(amount) FROM transactions",
          description: "Check average is approximately 150.5",
          expectedResult: 150.5,
          tolerance: 0.1,
        },
      ];

      mockExecuteStatement.mockResolvedValueOnce({
        statementId: "stmt-avg",
        status: "SUCCEEDED",
        result: { dataArray: [[150.52]] }, // Within 0.1 tolerance
      });

      const results = await evaluateMission(workspaceUrl, pat, queries, warehouseId);

      expect(results[0].passed).toBe(true);
    });

    it("fails when actual is outside tolerance of expected", async () => {
      const queries: EvaluationQuery[] = [
        {
          sql: "SELECT AVG(amount) FROM transactions",
          description: "Check average is approximately 150.5",
          expectedResult: 150.5,
          tolerance: 0.01,
        },
      ];

      mockExecuteStatement.mockResolvedValueOnce({
        statementId: "stmt-avg",
        status: "SUCCEEDED",
        result: { dataArray: [[150.6]] }, // Outside 0.01 tolerance
      });

      const results = await evaluateMission(workspaceUrl, pat, queries, warehouseId);

      expect(results[0].passed).toBe(false);
    });

    it("exact match when no tolerance specified for numbers", async () => {
      const queries: EvaluationQuery[] = [
        {
          sql: "SELECT COUNT(*) FROM events",
          description: "Check exact count",
          expectedResult: 1000,
        },
      ];

      mockExecuteStatement.mockResolvedValueOnce({
        statementId: "stmt-exact",
        status: "SUCCEEDED",
        result: { dataArray: [[1001]] }, // Off by 1
      });

      const results = await evaluateMission(workspaceUrl, pat, queries, warehouseId);

      expect(results[0].passed).toBe(false);
    });
  });

  describe("array result comparison", () => {
    it("compares array results correctly", async () => {
      const queries: EvaluationQuery[] = [
        {
          sql: "SELECT status, COUNT(*) FROM events GROUP BY status ORDER BY status",
          description: "Check status distribution",
          expectedResult: [
            ["active", 500],
            ["inactive", 500],
          ],
        },
      ];

      mockExecuteStatement.mockResolvedValueOnce({
        statementId: "stmt-array",
        status: "SUCCEEDED",
        result: {
          dataArray: [
            ["active", 500],
            ["inactive", 500],
          ],
        },
      });

      const results = await evaluateMission(workspaceUrl, pat, queries, warehouseId);

      expect(results[0].passed).toBe(true);
    });

    it("fails when array results differ", async () => {
      const queries: EvaluationQuery[] = [
        {
          sql: "SELECT status, COUNT(*) FROM events GROUP BY status ORDER BY status",
          description: "Check status distribution",
          expectedResult: [
            ["active", 500],
            ["inactive", 500],
          ],
        },
      ];

      mockExecuteStatement.mockResolvedValueOnce({
        statementId: "stmt-array",
        status: "SUCCEEDED",
        result: {
          dataArray: [
            ["active", 400],
            ["inactive", 600],
          ],
        },
      });

      const results = await evaluateMission(workspaceUrl, pat, queries, warehouseId);

      expect(results[0].passed).toBe(false);
    });
  });

  describe("result structure", () => {
    it("includes queryIndex and description in results", async () => {
      const queries: EvaluationQuery[] = [
        {
          sql: "SELECT 1",
          description: "First query",
          expectedResult: 1,
        },
        {
          sql: "SELECT 2",
          description: "Second query",
          expectedResult: 2,
        },
      ];

      mockExecuteStatement
        .mockResolvedValueOnce({
          statementId: "stmt-1",
          status: "SUCCEEDED",
          result: { dataArray: [[1]] },
        })
        .mockResolvedValueOnce({
          statementId: "stmt-2",
          status: "SUCCEEDED",
          result: { dataArray: [[2]] },
        });

      const results = await evaluateMission(workspaceUrl, pat, queries, warehouseId);

      expect(results[0].queryIndex).toBe(0);
      expect(results[0].description).toBe("First query");
      expect(results[1].queryIndex).toBe(1);
      expect(results[1].description).toBe("Second query");
    });
  });

  describe("boolean expected results", () => {
    it("compares boolean true correctly", async () => {
      const queries: EvaluationQuery[] = [
        {
          sql: "SELECT EXISTS(SELECT 1 FROM events)",
          description: "Check table has data",
          expectedResult: true,
        },
      ];

      mockExecuteStatement.mockResolvedValueOnce({
        statementId: "stmt-bool",
        status: "SUCCEEDED",
        result: { dataArray: [[true]] },
      });

      const results = await evaluateMission(workspaceUrl, pat, queries, warehouseId);

      expect(results[0].passed).toBe(true);
    });
  });

  describe("empty result handling", () => {
    it("handles empty result set when expecting empty", async () => {
      const queries: EvaluationQuery[] = [
        {
          sql: "SELECT * FROM events WHERE 1=0",
          description: "Check empty result",
          expectedResult: [],
        },
      ];

      mockExecuteStatement.mockResolvedValueOnce({
        statementId: "stmt-empty",
        status: "SUCCEEDED",
        result: { dataArray: [] },
      });

      const results = await evaluateMission(workspaceUrl, pat, queries, warehouseId);

      expect(results[0].passed).toBe(true);
    });
  });
});
