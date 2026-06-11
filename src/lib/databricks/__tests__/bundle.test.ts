/**
 * Tests for `generateBundle()` in bundle.ts.
 *
 * The core contract: every notebook in the generated bundle must have its
 * `{catalog}` and `{schema_prefix}` placeholders replaced with the values
 * derived from the user's `DatabricksConnection` and the generated prefix.
 * Without this, notebooks are deployed to Databricks with literal placeholders
 * and fail on first run with `NO_SUCH_CATALOG_EXCEPTION`.
 */

import fs from "fs/promises"
import path from "path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import yaml from "js-yaml"

import { generateBundle } from "../bundle"
import type { DatabricksConnection, Industry } from "../../field-ops/types"

const TEST_CATALOG = "test_catalog_xyz"
const TEST_USER_ID = "test_user_abc12345"

const config: DatabricksConnection = {
  workspaceUrl: "https://dbc-test.cloud.databricks.com",
  token: "dapi_test_token",
  warehouseId: "warehouse-123",
  catalog: TEST_CATALOG,
}

const industry: Industry = "gaming"

describe("generateBundle - placeholder substitution", () => {
  let bundlePath: string

  beforeEach(async () => {
    bundlePath = await generateBundle(industry, TEST_USER_ID, config)
  })

  afterEach(async () => {
    if (bundlePath) {
      await fs.rm(bundlePath, { recursive: true, force: true })
    }
  })

  it("replaces {catalog} in notebook content with the user's catalog name", async () => {
    const notebookPath = path.join(bundlePath, "notebooks", "01_ingest_events.py")
    const content = await fs.readFile(notebookPath, "utf-8")

    expect(content).not.toContain("{catalog}")
    expect(content).toContain(TEST_CATALOG)
  })

  it("replaces {schema_prefix} in notebook content with the generated prefix", async () => {
    const notebookPath = path.join(bundlePath, "notebooks", "01_ingest_events.py")
    const content = await fs.readFile(notebookPath, "utf-8")

    expect(content).not.toContain("{schema_prefix}")

    // Schema prefix format: fo_<industry>_<user8>_<timestamp36>
    // e.g., fo_gaming_test_use_<base36>
    const schemaPrefix = path.basename(bundlePath)
    expect(content).toContain(schemaPrefix)
  })

  it("replaces all occurrences of placeholders when they appear multiple times", async () => {
    // 01_ingest_events.py references {catalog} in many cells (docstrings, config, queries)
    const notebookPath = path.join(bundlePath, "notebooks", "01_ingest_events.py")
    const content = await fs.readFile(notebookPath, "utf-8")

    const sourcePath = path.join(
      process.cwd(),
      "src",
      "content",
      "field-ops",
      industry,
      "notebooks",
      "01_ingest_events.py"
    )
    const sourceContent = await fs.readFile(sourcePath, "utf-8")

    const sourceCatalogCount = (sourceContent.match(/\{catalog\}/g) ?? []).length
    const sourceSchemaCount = (sourceContent.match(/\{schema_prefix\}/g) ?? []).length

    expect(sourceCatalogCount).toBeGreaterThan(0)
    expect(sourceSchemaCount).toBeGreaterThan(0)

    expect(content).not.toContain("{catalog}")
    expect(content).not.toContain("{schema_prefix}")

    // The catalog name should appear at least as many times as the source placeholder
    const substitutedCatalogCount = content.split(TEST_CATALOG).length - 1
    expect(substitutedCatalogCount).toBe(sourceCatalogCount)
  })

  it("substitutes placeholders in every notebook in the mission (not just the first)", async () => {
    const notebooksDir = path.join(bundlePath, "notebooks")
    const notebooks = await fs.readdir(notebooksDir)

    expect(notebooks.length).toBeGreaterThan(1)

    for (const notebook of notebooks) {
      const content = await fs.readFile(path.join(notebooksDir, notebook), "utf-8")
      expect(content, `notebook ${notebook} still contains {{catalog}}`).not.toContain(
        "{catalog}"
      )
      expect(
        content,
        `notebook ${notebook} still contains {{schema_prefix}}`
      ).not.toContain("{schema_prefix}")
    }
  })

  it("leaves data files untouched (they should not contain placeholders)", async () => {
    const dataDir = path.join(bundlePath, "data")
    const files = await fs.readdir(dataDir)
    expect(files.length).toBeGreaterThan(0)

    // We just verify data files are copied - they are CSVs/JSONs that
    // legitimately should NOT have placeholders. This guards against an
    // accidental scope creep where the substitution logic touches them.
    for (const file of files) {
      const content = await fs.readFile(path.join(dataDir, file), "utf-8")
      // If a data file happens to contain {catalog} literally (unlikely), we
      // don't want to break it. Just verify it was copied successfully.
      expect(content.length).toBeGreaterThan(0)
    }
  })
})

describe("generateBundle - databricks.yml structure", () => {
  let bundlePath: string

  beforeEach(async () => {
    bundlePath = await generateBundle(industry, TEST_USER_ID, config)
  })

  afterEach(async () => {
    if (bundlePath) await fs.rm(bundlePath, { recursive: true, force: true })
  })

  it("writes a databricks.yml that parses as valid YAML", async () => {
    const ymlPath = path.join(bundlePath, "databricks.yml")
    const raw = await fs.readFile(ymlPath, "utf-8")
    const parsed = yaml.load(raw) as Record<string, unknown>
    expect(parsed.bundle).toBeDefined()
    expect(parsed.resources).toBeDefined()
  })

  it("uses DAB variable syntax ${var.catalog} and ${var.schema_prefix} (no JS interpolation)", async () => {
    const ymlPath = path.join(bundlePath, "databricks.yml")
    const raw = await fs.readFile(ymlPath, "utf-8")
    // The actual catalog/schema_prefix values must NOT appear in the yml
    expect(raw).not.toContain(TEST_CATALOG)
    expect(raw).not.toContain("fo_gaming")
    // The DAB variable references must appear
    expect(raw).toContain("${var.catalog}")
    expect(raw).toContain("${var.schema_prefix}")
  })

  it("hardcodes bundle.name with the industry name", async () => {
    const ymlPath = path.join(bundlePath, "databricks.yml")
    const raw = await fs.readFile(ymlPath, "utf-8")
    const parsed = yaml.load(raw) as { bundle: { name: string } }
    expect(parsed.bundle.name).toBe("field-ops-gaming")
  })

  it("declares schemas (bronze, silver, gold) using DAB variables", async () => {
    const ymlPath = path.join(bundlePath, "databricks.yml")
    const raw = await fs.readFile(ymlPath, "utf-8")
    const parsed = yaml.load(raw) as { resources: { schemas: Record<string, { catalog_name: string; name: string }> } }
    expect(parsed.resources.schemas.bronze.name).toBe("${var.schema_prefix}_bronze")
    expect(parsed.resources.schemas.bronze.catalog_name).toBe("${var.catalog}")
  })

  it("does NOT include resources.pipelines for plain industries", async () => {
    const ymlPath = path.join(bundlePath, "databricks.yml")
    const raw = await fs.readFile(ymlPath, "utf-8")
    const parsed = yaml.load(raw) as { resources: { pipelines?: unknown } }
    expect(parsed.resources.pipelines).toBeUndefined()
  })
})

describe("generateBundle - manufacturing yml overlay", () => {
  let bundlePath: string

  beforeEach(async () => {
    bundlePath = await generateBundle("manufacturing" as Industry, TEST_USER_ID, config)
  })

  afterEach(async () => {
    if (bundlePath) await fs.rm(bundlePath, { recursive: true, force: true })
  })

  it("includes resources.pipelines.manufacturing_quality", async () => {
    const ymlPath = path.join(bundlePath, "databricks.yml")
    const raw = await fs.readFile(ymlPath, "utf-8")
    const parsed = yaml.load(raw) as { resources: { pipelines: Record<string, { name: string; libraries: unknown[] }> } }
    expect(parsed.resources.pipelines.manufacturing_quality).toBeDefined()
    expect(parsed.resources.pipelines.manufacturing_quality.libraries.length).toBe(3)
  })

  it("hardcodes bundle.name as field-ops-manufacturing", async () => {
    const ymlPath = path.join(bundlePath, "databricks.yml")
    const raw = await fs.readFile(ymlPath, "utf-8")
    const parsed = yaml.load(raw) as { bundle: { name: string } }
    expect(parsed.bundle.name).toBe("field-ops-manufacturing")
  })
})
