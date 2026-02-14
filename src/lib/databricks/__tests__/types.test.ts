import { describe, expect, it } from "vitest";
import {
    bundleStatusSchema,
    databricksConnectionSchema,
    evaluationQuerySchema,
    evaluationResultSchema,
    statementResponseSchema,
    type BundleStatus,
    type DatabricksConnection,
    type EvaluationQuery,
    type EvaluationResult,
    type StatementResponse,
} from "../types";

describe("databricksConnectionSchema", () => {
  it("validates a correct DatabricksConnection shape", () => {
    const validConnection: DatabricksConnection = {
      userId: "user-123",
      workspaceUrl: "https://dbc-abc123.cloud.databricks.com",
      encryptedPat: "encrypted:abc123xyz",
      patExpiresAt: new Date("2025-12-31"),
      connectedAt: new Date("2025-01-01"),
      lastValidatedAt: new Date("2025-01-15"),
    };

    const result = databricksConnectionSchema.safeParse(validConnection);
    expect(result.success).toBe(true);
  });

  it("accepts null for optional patExpiresAt and lastValidatedAt", () => {
    const connectionWithNulls = {
      userId: "user-456",
      workspaceUrl: "https://workspace.databricks.com",
      encryptedPat: "encrypted:xyz789",
      patExpiresAt: null,
      connectedAt: new Date(),
      lastValidatedAt: null,
    };

    const result = databricksConnectionSchema.safeParse(connectionWithNulls);
    expect(result.success).toBe(true);
  });

  it("rejects connection with missing required fields", () => {
    const invalidConnection = {
      userId: "user-123",
      // missing workspaceUrl, encryptedPat, connectedAt
    };

    const result = databricksConnectionSchema.safeParse(invalidConnection);
    expect(result.success).toBe(false);
  });

  it("rejects connection with invalid workspaceUrl format", () => {
    const invalidUrl = {
      userId: "user-123",
      workspaceUrl: "not-a-valid-url",
      encryptedPat: "encrypted:abc",
      patExpiresAt: null,
      connectedAt: new Date(),
      lastValidatedAt: null,
    };

    const result = databricksConnectionSchema.safeParse(invalidUrl);
    expect(result.success).toBe(false);
  });
});

describe("statementResponseSchema", () => {
  it("validates a SUCCEEDED response with result", () => {
    const successResponse: StatementResponse = {
      statementId: "stmt-abc123",
      status: "SUCCEEDED",
      result: {
        dataArray: [
          ["col1", "col2"],
          ["val1", "val2"],
        ],
      },
    };

    const result = statementResponseSchema.safeParse(successResponse);
    expect(result.success).toBe(true);
  });

  it("validates a FAILED response with error", () => {
    const failedResponse: StatementResponse = {
      statementId: "stmt-xyz789",
      status: "FAILED",
      error: {
        message: "Syntax error in SQL query",
      },
    };

    const result = statementResponseSchema.safeParse(failedResponse);
    expect(result.success).toBe(true);
  });

  it("enforces status enum values", () => {
    const invalidStatus = {
      statementId: "stmt-123",
      status: "INVALID_STATUS",
    };

    const result = statementResponseSchema.safeParse(invalidStatus);
    expect(result.success).toBe(false);
  });

  it("accepts PENDING status without result or error", () => {
    const pendingResponse = {
      statementId: "stmt-pending",
      status: "PENDING",
    };

    const result = statementResponseSchema.safeParse(pendingResponse);
    expect(result.success).toBe(true);
  });

  it("accepts all valid status values", () => {
    const statuses = ["PENDING", "RUNNING", "SUCCEEDED", "FAILED", "CANCELED", "CLOSED"] as const;

    statuses.forEach((status) => {
      const response = { statementId: `stmt-${status}`, status };
      const result = statementResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });
});

describe("evaluationResultSchema", () => {
  it("validates a passed evaluation result", () => {
    const passedResult: EvaluationResult = {
      queryIndex: 0,
      description: "Check row count equals 1000",
      passed: true,
      expected: 1000,
      actual: 1000,
    };

    const result = evaluationResultSchema.safeParse(passedResult);
    expect(result.success).toBe(true);
  });

  it("validates a failed evaluation result with error", () => {
    const failedResult: EvaluationResult = {
      queryIndex: 1,
      description: "Check Delta table exists",
      passed: false,
      expected: true,
      actual: false,
      error: "Table not found: main.test_schema.events",
    };

    const result = evaluationResultSchema.safeParse(failedResult);
    expect(result.success).toBe(true);
  });

  it("rejects result with negative queryIndex", () => {
    const invalidResult = {
      queryIndex: -1,
      description: "Invalid test",
      passed: false,
      expected: null,
      actual: null,
    };

    const result = evaluationResultSchema.safeParse(invalidResult);
    expect(result.success).toBe(false);
  });
});

describe("bundleStatusSchema", () => {
  it("accepts all valid bundle status values", () => {
    const validStatuses: BundleStatus[] = [
      "not-deployed",
      "deploying",
      "deployed",
      "destroying",
      "error",
    ];

    validStatuses.forEach((status) => {
      const result = bundleStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    });
  });

  it("rejects invalid bundle status values", () => {
    const invalidStatuses = ["pending", "active", "deleted", "unknown", ""];

    invalidStatuses.forEach((status) => {
      const result = bundleStatusSchema.safeParse(status);
      expect(result.success).toBe(false);
    });
  });
});

describe("evaluationQuerySchema", () => {
  it("validates an evaluation query with expected result", () => {
    const query: EvaluationQuery = {
      sql: "SELECT COUNT(*) FROM main.test_schema.events",
      description: "Verify event count is 1000",
      expectedResult: 1000,
    };

    const result = evaluationQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
  });

  it("validates an evaluation query with tolerance", () => {
    const queryWithTolerance: EvaluationQuery = {
      sql: "SELECT AVG(amount) FROM main.test_schema.transactions",
      description: "Verify average is approximately 150.5",
      expectedResult: 150.5,
      tolerance: 0.1,
    };

    const result = evaluationQuerySchema.safeParse(queryWithTolerance);
    expect(result.success).toBe(true);
  });

  it("accepts array as expected result", () => {
    const queryWithArrayResult: EvaluationQuery = {
      sql: "SELECT status, COUNT(*) FROM events GROUP BY status",
      description: "Verify status distribution",
      expectedResult: [
        ["active", 500],
        ["inactive", 500],
      ],
    };

    const result = evaluationQuerySchema.safeParse(queryWithArrayResult);
    expect(result.success).toBe(true);
  });

  it("rejects query with empty SQL", () => {
    const invalidQuery = {
      sql: "",
      description: "Invalid query",
      expectedResult: null,
    };

    const result = evaluationQuerySchema.safeParse(invalidQuery);
    expect(result.success).toBe(false);
  });
});
