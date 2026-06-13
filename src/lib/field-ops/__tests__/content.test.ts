import { describe, expect, it } from "vitest"
import { loadFieldOpsContent } from "../content"
import type { Industry } from "../types"

describe("field-ops content normalization", () => {
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

  it("loads and normalizes all industries", async () => {
    for (const industry of industries) {
      const content = await loadFieldOpsContent(industry)

      expect(content.industry).toBe(industry)
      expect(content.title.length).toBeGreaterThan(0)
      expect(content.description.length).toBeGreaterThan(0)
      expect(content.objectives.length).toBeGreaterThan(0)
      expect(content.validations.length).toBeGreaterThan(0)
      expect(content.dataFiles.length).toBeGreaterThan(0)
      expect(content.notebooks.length).toBeGreaterThan(0)

      for (const validation of content.validations) {
        expect(validation.checkKey.length).toBeGreaterThan(0)
        expect(validation.checkName.length).toBeGreaterThan(0)
        expect(validation.query.length).toBeGreaterThan(0)
      }
    }
  })

  it("normalizes advanced schema validations with stable check keys", async () => {
    const manufacturing = await loadFieldOpsContent("manufacturing")

    const keys = manufacturing.validations.map((validation) => validation.checkKey)
    expect(keys).toContain("sdp_pipeline_running")
    expect(keys).toContain("bronze_sensor_data")
    expect(keys).toContain("silver_spc_metrics")
  })
})

describe("medtech-research content", () => {
  it("has 4 validations", async () => {
    const mission = await loadFieldOpsContent("medtech-research")
    expect(mission.validations).toHaveLength(4)
  })

  it("declares 4 notebooks", async () => {
    const mission = await loadFieldOpsContent("medtech-research")
    expect(mission.notebooks).toHaveLength(4)
  })

  it("declares 1 data file that exists on disk", async () => {
    const mission = await loadFieldOpsContent("medtech-research")
    expect(mission.dataFiles).toEqual(["pubmed_abstracts.json"])
    const path = require("path")
    const fs = require("fs/promises")
    const dataPath = path.join(
      process.cwd(),
      "src/content/field-ops/medtech-research/data",
      "pubmed_abstracts.json"
    )
    await expect(fs.access(dataPath)).resolves.toBeUndefined()
  })
})
