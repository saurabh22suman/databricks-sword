import { describe, expect, it } from "vitest"
import { buildFieldOpsLinks } from "../links"

describe("buildFieldOpsLinks", () => {
  it("returns a notebooks URL under /Shared/field-ops/<schemaPrefix> (matching bundle.ts deploy path)", () => {
    const result = buildFieldOpsLinks({
      workspaceUrl: "https://dbc-test.cloud.databricks.com",
      catalogName: "main",
      schemaPrefix: "fo_gaming_user_abc",
    })

    // The UI link must match where the DAB bundle deploys (see bundle.ts root_path)
    expect(result.notebooks).toBe(
      "https://dbc-test.cloud.databricks.com/#workspace/Shared/field-ops/fo_gaming_user_abc"
    )
  })

  it("does NOT use the ~/field-ops/... path (would mismatch the DAB deploy location)", () => {
    const result = buildFieldOpsLinks({
      workspaceUrl: "https://dbc-test.cloud.databricks.com",
      schemaPrefix: "fo_gaming_user_abc",
    })
    expect(result.notebooks).not.toContain("~/field-ops/")
  })
})