#!/usr/bin/env node
/**
 * One-off migration: replace /mnt/... paths in content with Unity Catalog volumes.
 * Run from repo root: node scripts/migrate-mnt-paths.mjs
 *
 * Pattern: /mnt/<bucket>/<path> → /Volumes/main/default/<bucket>/<path>
 *
 * SAFETY: dry-run by default. Pass --apply to actually write files.
 */
import { readdir, readFile, writeFile, stat } from "node:fs/promises"
import { join } from "node:path"

const CONTENT_ROOT = "src/content"
const DRY_RUN = !process.argv.includes("--apply")

const FILES_TO_MIGRATE = [
  "src/content/missions/pyspark-essentials/stages/03-drag-drop.json",
  "src/content/missions/advanced-transformations/stages/03-drag-drop.json",
  "src/content/missions/data-ingestion-pipeline/stages/03-drag-drop.json",
  "src/content/field-ops/telecom/notebooks/02_network_kpis_silver.py",
  "src/content/field-ops/retail/notebooks/01_ingest_sales.py",
]

// Pattern handles both regular quotes and JSON-escaped quotes (\")
const PATTERN = /(\\?["'])(\/mnt\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_./-]+)?)\1/g
const REPLACEMENT = (_, quote, path) => {
  const remainder = path.replace(/^\/mnt\//, "")
  // Preserve the quote character(s) - including JSON escape backslash if present
  return `${quote}/Volumes/main/default/${remainder}${quote}`
}

async function migrate(file) {
  try {
    await stat(file)
  } catch {
    console.log(`SKIP (not found): ${file}`)
    return
  }
  const before = await readFile(file, "utf8")
  const after = before.replace(PATTERN, REPLACEMENT)
  if (before === after) {
    console.log(`NO CHANGE: ${file}`)
    return
  }
  const matches = before.match(PATTERN) || []
  console.log(`${DRY_RUN ? "[DRY-RUN] " : ""}${file}: ${matches.length} replacements`)
  matches.forEach((m) => console.log(`  ${m}`))
  if (!DRY_RUN) {
    await writeFile(file, after, "utf8")
  }
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? "DRY-RUN" : "APPLY"}\n`)
  for (const f of FILES_TO_MIGRATE) {
    await migrate(f)
  }
  if (DRY_RUN) {
    console.log("\nRun with --apply to actually write changes.")
  }
}

main().catch(console.error)
