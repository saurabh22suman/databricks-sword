#!/usr/bin/env tsx
/**
 * @file validate-content.ts
 * @description CLI script to validate all mission and challenge content
 * against their Zod schemas. Checks JSON structure, file references,
 * and XP consistency.
 *
 * Usage: pnpm validate:content
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";

// Schemas
import {
  ChallengeCategorySchema,
  ChallengeCodeBlockSchema,
  ChallengeDifficultySchema,
  ChallengeFormatSchema,
  FillBlankChallengeDataSchema,
  FreeTextChallengeDataSchema,
} from "../src/lib/challenges/types";
import {
    BriefingConfigSchema,
    CompareConfigSchema,
    DebriefConfigSchema,
    DiagramConfigSchema,
    DragDropConfigSchema,
    FillBlankConfigSchema,
    FreeTextConfigSchema,
    MissionSchema,
} from "../src/lib/missions/types";

const CONTENT_DIR = path.resolve(__dirname, "../src/content");
const MISSIONS_DIR = path.join(CONTENT_DIR, "missions");
const CHALLENGES_DIR = path.join(CONTENT_DIR, "challenges");

let errors = 0;
let warnings = 0;
let missionsChecked = 0;
let challengesChecked = 0;
let stagesChecked = 0;

function logError(context: string, message: string): void {
  console.error(`  ❌ [${context}] ${message}`);
  errors++;
}

function logWarn(context: string, message: string): void {
  console.warn(`  ⚠️  [${context}] ${message}`);
  warnings++;
}

function logOk(message: string): void {
  console.log(`  ✅ ${message}`);
}

const MdxRefSchema = z.object({
  mdxContent: z.string().min(1),
});

const QuizQuestionForValidationSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()).min(2),
  correctAnswer: z.union([z.number().nonnegative().int(), z.string()]),
  explanation: z.string(),
});

const QuizConfigForValidationSchema = z.object({
  questions: z.array(QuizQuestionForValidationSchema).min(1),
  passingScore: z.number().min(0).max(100),
  learnings: z.array(z.string()).optional(),
});

// Challenge content has two JSON dialects in this repo.
// Current runtime expects `code`/`starterCode`/`expectedPattern`/`simulatedOutput`,
// but legacy content still uses `content` and `validationRegex`/`sampleAnswer`.
const LegacyChallengeCodeBlockSchema = z.object({
  id: z.string(),
  content: z.string(),
  label: z.string().optional(),
});

const ChallengeDragDropDataForValidationSchema = z.object({
  blocks: z.array(z.union([ChallengeCodeBlockSchema, LegacyChallengeCodeBlockSchema])).min(2),
  correctOrder: z.array(z.string()),
});

const ChallengeFreeTextDataForValidationSchema = z.union([
  FreeTextChallengeDataSchema,
  z.object({
    validationRegex: z.string(),
    sampleAnswer: z.string(),
  }),
]);

const ChallengeSchemaForValidation = z
  .object({
    id: z.string(),
    title: z.string(),
    category: ChallengeCategorySchema,
    difficulty: ChallengeDifficultySchema,
    format: ChallengeFormatSchema,
    description: z.string(),
    hints: z.array(z.string()),
    xpReward: z.number().nonnegative(),
    optimalSolution: z.string(),
    explanation: z.string(),
    dragDrop: ChallengeDragDropDataForValidationSchema.optional(),
    fillBlank: FillBlankChallengeDataSchema.optional(),
    freeText: ChallengeFreeTextDataForValidationSchema.optional(),
  })
  .refine(
    (data) => {
      switch (data.format) {
        case "drag-drop":
          return data.dragDrop !== undefined
        case "fill-blank":
          return data.fillBlank !== undefined
        case "free-text":
          return data.freeText !== undefined
        default:
          return false
      }
    },
    {
      message:
        "Challenge must include format-specific data matching the format field (dragDrop, fillBlank, or freeText)",
    }
  );

// Stage type → Schema mapping
type ZodSchema = z.ZodType<unknown>
const STAGE_SCHEMAS: Record<string, ZodSchema> = {
  briefing: z.union([BriefingConfigSchema, MdxRefSchema]),
  diagram: DiagramConfigSchema,
  "drag-drop": DragDropConfigSchema,
  "fill-blank": FillBlankConfigSchema,
  "free-text": FreeTextConfigSchema,
  "fix-bug": FreeTextConfigSchema,
  quiz: QuizConfigForValidationSchema,
  debrief: z.union([DebriefConfigSchema, MdxRefSchema]),
  compare: CompareConfigSchema,
};

/**
 * Validates a single mission directory.
 */
function validateMission(missionDir: string): void {
  const slug = path.basename(missionDir);
  const manifestPath = path.join(missionDir, "mission.json");

  if (!fs.existsSync(manifestPath)) {
    logError(slug, "Missing mission.json");
    return;
  }

  // Parse and validate manifest
  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as Record<string, unknown>;
  } catch {
    logError(slug, "Invalid JSON in mission.json");
    return;
  }

  const result = MissionSchema.safeParse(manifest);
  if (!result.success) {
    for (const issue of result.error.issues) {
      logError(slug, `mission.json: ${issue.path.join(".")} — ${issue.message}`);
    }
    return;
  }

  const mission = result.data;
  missionsChecked++;

  // Check MDX files (optional)
  for (const mdx of ["briefing.mdx", "debrief.mdx"]) {
    const mdxPath = path.join(missionDir, mdx);
    if (fs.existsSync(mdxPath)) {
      const content = fs.readFileSync(mdxPath, "utf-8");
      if (content.trim().length === 0) {
        logWarn(slug, `${mdx} exists but is empty`);
      }
    }
  }

  // Validate each stage config
  const stagesDir = path.join(missionDir, "stages");
  if (!fs.existsSync(stagesDir)) {
    logWarn(slug, "No stages/ directory found");
    return;
  }

  for (const stage of mission.stages) {
    // configFile may be a relative path like "stages/01-briefing.json" or empty
    // When empty, fallback to "stages/{id}.json"
    const stageFileName = stage.configFile || `stages/${stage.id}.json`;
    const stageFile = path.join(missionDir, stageFileName);
    if (!fs.existsSync(stageFile)) {
      logError(slug, `Stage "${stage.id}" references missing file: ${stageFileName}`);
      continue;
    }

    let stageData: unknown;
    try {
      stageData = JSON.parse(fs.readFileSync(stageFile, "utf-8"));
    } catch {
      logError(slug, `Invalid JSON in ${stageFileName}`);
      continue;
    }

    const schema = STAGE_SCHEMAS[stage.type];
    if (!schema) {
      logWarn(slug, `No schema validator for stage type "${stage.type}" (${stage.configFile})`);
      continue;
    }

    const stageResult = schema.safeParse(stageData);
    if (!stageResult.success && stageResult.error) {
      for (const issue of stageResult.error.issues) {
        logError(
          slug,
          `${stageFileName}: ${String(issue.path.join("."))} — ${issue.message}`,
        );
      }
    }
    stagesChecked++;
  }

  // XP consistency check
  if (mission.xpReward <= 0) {
    logWarn(slug, `xpReward is ${mission.xpReward} (should be positive)`);
  }
}

/**
 * Validates a single challenge JSON file.
 */
function validateChallenge(filePath: string): void {
  const relative = path.relative(CHALLENGES_DIR, filePath);

  let data: unknown;
  try {
    data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    logError(relative, "Invalid JSON");
    return;
  }

  const result = ChallengeSchemaForValidation.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      logError(relative, `${issue.path.join(".")} — ${issue.message}`);
    }
    return;
  }

  challengesChecked++;

  const challenge = result.data;
  if (challenge.xpReward <= 0) {
    logWarn(relative, `xpReward is ${challenge.xpReward} (should be positive)`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────

console.log("\n🔍 Databricks Sword — Content Validation\n");

// Validate missions
console.log("📦 Missions:");
if (fs.existsSync(MISSIONS_DIR)) {
  const missionDirs = fs
    .readdirSync(MISSIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(MISSIONS_DIR, d.name));

  for (const dir of missionDirs) {
    validateMission(dir);
  }
  logOk(`${missionsChecked} missions validated, ${stagesChecked} stage configs checked`);
} else {
  logError("missions", "Content directory not found");
}

// Validate challenges
console.log("\n⚔️  Challenges:");
if (fs.existsSync(CHALLENGES_DIR)) {
  const categoryDirs = fs
    .readdirSync(CHALLENGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(CHALLENGES_DIR, d.name));

  for (const catDir of categoryDirs) {
    const jsonFiles = fs
      .readdirSync(catDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.join(catDir, f));
    for (const file of jsonFiles) {
      validateChallenge(file);
    }
  }
  logOk(`${challengesChecked} challenges validated`);
} else {
  logError("challenges", "Content directory not found");
}

// Summary
console.log("\n" + "─".repeat(50));
if (errors > 0) {
  console.log(`\n❌ ${errors} error(s), ${warnings} warning(s)\n`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`\n⚠️  ${warnings} warning(s), 0 errors\n`);
  process.exit(0);
} else {
  console.log(`\n✅ All content valid! ${missionsChecked} missions, ${challengesChecked} challenges\n`);
  process.exit(0);
}
