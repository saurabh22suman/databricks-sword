import { beforeEach, describe, expect, it, vi } from "vitest"
import type { DatabricksConnection, Industry, ValidationConfig } from "../types"
import { executeValidation, getValidationQueries } from "../validation"
import { executeSQL } from "../../databricks/cli"

vi.mock("../../databricks/cli", () => ({
  executeSQL: vi.fn(),
}))

describe("field-ops validation query coverage", () => {
  const industries: Industry[] = [
    "retail",
    "gaming",
    "healthcare",
    "fintech",
    "automotive",
    "manufacturing",
    "telecom",
    "agritech",
  ]

  it("returns three meaningful validations for each industry", () => {
    for (const industry of industries) {
      const validations = getValidationQueries(industry)

      expect(validations).toHaveLength(3)
      expect(validations.some((v) => v.query.includes("{schema_prefix}_bronze"))).toBe(true)
      expect(validations.some((v) => v.query.includes("{schema_prefix}_silver"))).toBe(true)
      expect(validations.some((v) => v.query.includes("{schema_prefix}_gold"))).toBe(true)

      for (const validation of validations) {
        expect(validation.checkName.trim().length).toBeGreaterThan(0)
        expect(validation.description.trim().length).toBeGreaterThan(0)
        expect(validation.query.trim().length).toBeGreaterThan(0)
        expect(validation.query.toLowerCase()).toContain("select")
        expect(validation.query).toContain("{catalog}")
        expect(validation.query).toContain("{schema_prefix}")
      }
    }
  })

  it("keeps normalized retail and gaming checks aligned to mission outputs", () => {
    const retail = getValidationQueries("retail")
    const gaming = getValidationQueries("gaming")

    expect(retail.map((v) => v.checkName)).toEqual([
      "Bronze sales data exists",
      "Silver inventory cleaned",
      "Gold reorder recommendations exist",
    ])
    expect(retail[2].query).toContain("reorder_recommendations WHERE recommended_qty > 0")

    expect(gaming.map((v) => v.checkName)).toEqual([
      "Bronze events ingested",
      "Silver sessions calculated",
      "Gold retention cohorts exist",
    ])
    expect(gaming[1].query).toContain("sessions WHERE duration_minutes > 0")
    expect(gaming[2].query).toContain("COUNT(DISTINCT cohort_date)")
  })
})

describe("executeValidation placeholder replacement", () => {
  const mockedExecuteSQL = vi.mocked(executeSQL)

  const config: DatabricksConnection = {
    workspaceUrl: "https://dbc-test.cloud.databricks.com",
    token: "dapi_test",
    warehouseId: "warehouse-1",
    catalog: "main",
  }

  beforeEach(() => {
    mockedExecuteSQL.mockReset()
  })

  it("replaces {catalog} and {schema_prefix} before execution", async () => {
    const validation: ValidationConfig = {
      checkName: "placeholder check",
      description: "ensure placeholders are replaced",
      query: "SELECT COUNT(*) FROM {catalog}.{schema_prefix}_bronze.transactions",
      expectedResult: "count",
      expectedValue: 1,
    }

    mockedExecuteSQL.mockResolvedValue([[5]])

    const result = await executeValidation(config, validation, "demo_catalog", "field_ops")

    expect(result.passed).toBe(true)
    expect(mockedExecuteSQL).toHaveBeenCalledWith(
      config,
      "SELECT COUNT(*) FROM demo_catalog.field_ops_bronze.transactions"
    )
  })
})
