#!/usr/bin/env tsx
/**
 * @file validate-content.ts
 * @description CLI script to validate all mission and challenge content
 * against their Zod schemas. Checks JSON structure, file references,
 * XP consistency, and semantic alignment across mission pedagogy.
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
import { getStageConfig } from "../src/lib/missions/loader";
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
          return data.dragDrop !== undefined;
        case "fill-blank":
          return data.fillBlank !== undefined;
        case "free-text":
          return data.freeText !== undefined;
        default:
          return false;
      }
    },
    {
      message:
        "Challenge must include format-specific data matching the format field (dragDrop, fillBlank, or freeText)",
    }
  );

// Stage type → Schema mapping
type ZodSchema = z.ZodType<unknown>;
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

const INSTRUCTIONAL_STAGE_TYPES = new Set([
  "diagram",
  "drag-drop",
  "fill-blank",
  "free-text",
  "fix-bug",
  "compare",
]);

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "with",
  "your",
  "you",
  "will",
  "can",
  "using",
  "use",
  "used",
  "via",
  "what",
  "when",
  "where",
  "why",
  "how",
  "which",
  "than",
  "then",
  "all",
  "any",
  "each",
  "one",
  "two",
  "three",
  "four",
  "five",
]);

const GENERIC_CONCEPT_TOKENS = new Set([
  "learn",
  "learning",
  "understand",
  "build",
  "create",
  "complete",
  "configure",
  "implement",
  "improve",
  "manage",
  "mission",
  "stage",
  "knowledge",
  "check",
  "objective",
  "goal",
  "summary",
  "expected",
  "output",
  "correct",
  "issue",
  "fix",
  "bug",
  "architecture",
  "workflow",
  "workflows",
  "mastery",
  "understanding",
  "demonstrated",
  "validate",
  "proves",
  "prove",
  "quiz",
]);

const ALWAYS_KEEP_TOKENS = new Set([
  "ai",
  "bi",
  "dr",
  "ml",
  "als",
  "dlt",
  "cdc",
  "sql",
  "api",
  "rmse",
  "kpi",
  "sla",
  "rpo",
  "rto",
  "uc",
  "etl",
  "udf",
  "udfs",
  "aqe",
  "ddl",
  "dml",
  "acid",
]);

type MissionData = z.infer<typeof MissionSchema>;

type StageValidationRecord = {
  id: string;
  title: string;
  type: string;
  configFile: string;
  resolvedConfig: unknown;
};

type QuizQuestionForSemantic = {
  id: string;
  question: string;
  explanation: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function normalizeToken(token: string): string {
  let normalized = token.toLowerCase();

  if (normalized.endsWith("ies") && normalized.length > 4) {
    normalized = `${normalized.slice(0, -3)}y`;
  } else if (normalized.endsWith("s") && normalized.length > 4 && !normalized.endsWith("ss")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

function conceptSetFromTexts(texts: string[]): Set<string> {
  const tokens = new Set<string>();

  for (const text of texts) {
    const rawTokens = text.toLowerCase().replace(/[_\/.:-]/g, " ").match(/[a-z0-9]+/g) ?? [];

    for (const rawToken of rawTokens) {
      const token = normalizeToken(rawToken);

      if (!token) continue;
      if (STOP_WORDS.has(token)) continue;
      if (!ALWAYS_KEEP_TOKENS.has(token) && token.length < 3) continue;

      tokens.add(token);
    }
  }

  return tokens;
}

function getCoverageTokens(tokens: Set<string>): Set<string> {
  const filtered = new Set(Array.from(tokens).filter((token) => !GENERIC_CONCEPT_TOKENS.has(token)));
  return filtered;
}

function getFallbackCoverageTokens(tokens: Set<string>): Set<string> {
  const filtered = getCoverageTokens(tokens);
  return filtered.size > 0 ? filtered : tokens;
}

function getTokenOverlap(left: Set<string>, right: Set<string>): string[] {
  const overlap: string[] = [];
  for (const token of left) {
    if (right.has(token)) {
      overlap.push(token);
    }
  }
  return overlap;
}

function mergeConceptSets(...sets: Set<string>[]): Set<string> {
  const merged = new Set<string>();
  for (const set of sets) {
    for (const token of set) {
      merged.add(token);
    }
  }
  return merged;
}

function collectBriefingIntent(config: unknown): { objective: string; learningGoals: string[] } {
  const record = asRecord(config);
  if (!record) {
    return { objective: "", learningGoals: [] };
  }

  return {
    objective: getString(record.objective),
    learningGoals: getStringArray(record.learningGoals),
  };
}

function collectDebriefIntent(config: unknown): { summary: string; alternativeApproach: string } {
  const record = asRecord(config);
  if (!record) {
    return { summary: "", alternativeApproach: "" };
  }

  return {
    summary: getString(record.summary),
    alternativeApproach: getString(record.alternativeApproach),
  };
}

function collectQuizQuestions(config: unknown): QuizQuestionForSemantic[] {
  const record = asRecord(config);
  if (!record) {
    return [];
  }

  const rawQuestions = Array.isArray(record.questions) ? record.questions : [];

  return rawQuestions
    .map((rawQuestion) => {
      const questionRecord = asRecord(rawQuestion);
      if (!questionRecord) {
        return null;
      }

      return {
        id: getString(questionRecord.id) || "unknown",
        question: getString(questionRecord.question),
        explanation: getString(questionRecord.explanation),
      };
    })
    .filter((question): question is QuizQuestionForSemantic => {
      return question !== null && Boolean(question.question);
    });
}

function collectStageTeachingSignals(stageType: string, config: unknown): string[] {
  const record = asRecord(config);
  if (!record) {
    return [];
  }

  switch (stageType) {
    case "diagram":
      return [getString(record.instructions), ...getStringArray(record.learnings)].filter(Boolean);

    case "drag-drop":
      return [
        getString(record.description),
        getString(record.instructions),
        getString(record.expectedOutput),
        ...getStringArray(record.hints),
        ...getStringArray(record.learnings),
        getString(record.explanation),
      ].filter(Boolean);

    case "fill-blank":
      return [
        getString(record.description),
        getString(record.expectedOutput),
        ...getStringArray(record.hints),
        ...getStringArray(record.learnings),
      ].filter(Boolean);

    case "free-text":
      return [
        getString(record.description),
        getString(record.expectedOutput),
        ...getStringArray(record.hints),
      ].filter(Boolean);

    case "fix-bug":
      return [
        getString(record.description),
        getString(record.expectedPattern),
        getString(record.simulatedOutput),
        ...getStringArray(record.hints),
      ].filter(Boolean);

    case "compare": {
      const solution1 = asRecord(record.solution1);
      const solution2 = asRecord(record.solution2);

      return [
        getString(record.description),
        getString(solution1?.title),
        getString(solution1?.explanation),
        getString(solution2?.title),
        getString(solution2?.explanation),
        ...getStringArray(record.comparisonPoints),
      ].filter(Boolean);
    }

    default:
      return [];
  }
}

function runMissionSemanticChecks(
  slug: string,
  mission: MissionData,
  stageRecords: StageValidationRecord[]
): void {
  const recordByStageId = new Map(stageRecords.map((stage) => [stage.id, stage]));
  const instructionalTokensByStageId = new Map<string, Set<string>>();

  const missionIntentTokens = conceptSetFromTexts([
    mission.description,
    ...mission.primaryFeatures,
  ]);

  const briefingStage = stageRecords.find((stage) => stage.type === "briefing");
  const briefingIntent = collectBriefingIntent(briefingStage?.resolvedConfig);
  const briefingObjectiveTokens = conceptSetFromTexts([briefingIntent.objective]);
  const briefingGoalTokens = conceptSetFromTexts(briefingIntent.learningGoals);
  const briefingIntentTokens = mergeConceptSets(briefingObjectiveTokens, briefingGoalTokens);

  const debriefStage = stageRecords.find((stage) => stage.type === "debrief");
  const debriefIntent = collectDebriefIntent(debriefStage?.resolvedConfig);
  const debriefTokens = conceptSetFromTexts([
    debriefIntent.summary,
    debriefIntent.alternativeApproach,
  ]);

  const quizStages = stageRecords.filter((stage) => stage.type === "quiz");
  const quizQuestionsByStage = new Map<string, QuizQuestionForSemantic[]>();
  const quizConceptTokens = new Set<string>();

  for (const quizStage of quizStages) {
    const questions = collectQuizQuestions(quizStage.resolvedConfig);
    quizQuestionsByStage.set(quizStage.id, questions);

    for (const question of questions) {
      const questionTokens = conceptSetFromTexts([question.question, question.explanation]);
      for (const token of questionTokens) {
        quizConceptTokens.add(token);
      }
    }
  }

  const fixBugStages = stageRecords.filter((stage) => stage.type === "fix-bug");

  for (const stageRecord of stageRecords) {
    if (!INSTRUCTIONAL_STAGE_TYPES.has(stageRecord.type)) {
      continue;
    }

    const teachingSignals = collectStageTeachingSignals(stageRecord.type, stageRecord.resolvedConfig);
    const stageTokens = conceptSetFromTexts(teachingSignals);
    instructionalTokensByStageId.set(stageRecord.id, stageTokens);

    if (teachingSignals.length === 0) {
      logWarn(`${slug}:${stageRecord.id}`, "Instructional stage has no teaching signals (description/instructions/learnings/hints).");
      continue;
    }

    const coverageTokens = getCoverageTokens(stageTokens);
    if (coverageTokens.size > 0 && coverageTokens.size <= 1) {
      logWarn(
        `${slug}:${stageRecord.id}`,
        "Instructional stage has weak or generic teaching signals; add clearer domain-specific language."
      );
    }
  }

  const allInstructionalTokens = mergeConceptSets(...Array.from(instructionalTokensByStageId.values()));
  const assessmentClosureTokens = mergeConceptSets(quizConceptTokens, debriefTokens);

  // Check 1: Every briefing learning goal must be covered by at least one instructional stage.
  for (const learningGoal of briefingIntent.learningGoals) {
    const goalTokens = getCoverageTokens(conceptSetFromTexts([learningGoal]));
    if (goalTokens.size === 0) {
      continue;
    }

    let bestStageId = "none";
    let bestOverlapTokens: string[] = [];

    for (const [stageId, stageTokens] of instructionalTokensByStageId) {
      const overlapTokens = getTokenOverlap(goalTokens, stageTokens);
      if (overlapTokens.length > bestOverlapTokens.length) {
        bestOverlapTokens = overlapTokens;
        bestStageId = stageId;
      }
    }

    if (bestOverlapTokens.length === 0) {
      logError(
        `${slug}:briefing`,
        `Learning goal is not covered by instructional stages: "${learningGoal}"`
      );
    } else if (bestOverlapTokens.length === 1) {
      logWarn(
        `${slug}:${bestStageId}`,
        `Learning goal has weak coverage from instructional stages: "${learningGoal}" (overlap: ${bestOverlapTokens.join(", " )})`
      );
    }
  }

  // Check 2: Fix-bug concept keywords should appear in briefing goals and in quiz or debrief.
  const briefingGoalCoverageTokens = getFallbackCoverageTokens(briefingGoalTokens);
  const assessmentCoverageTokens = getFallbackCoverageTokens(assessmentClosureTokens);

  for (const fixBugStage of fixBugStages) {
    const fixBugSignals = collectStageTeachingSignals("fix-bug", fixBugStage.resolvedConfig);
    const fixBugTokens = getFallbackCoverageTokens(conceptSetFromTexts(fixBugSignals));

    if (fixBugTokens.size === 0) {
      continue;
    }

    const briefingOverlap = getTokenOverlap(fixBugTokens, briefingGoalCoverageTokens);
    if (briefingOverlap.length === 0) {
      logError(
        `${slug}:${fixBugStage.id}`,
        "Fix-bug concepts are disconnected from briefing learning goals."
      );
    }

    const closureOverlap = getTokenOverlap(fixBugTokens, assessmentCoverageTokens);
    if (closureOverlap.length === 0) {
      logError(
        `${slug}:${fixBugStage.id}`,
        "Fix-bug concepts are not reinforced in quiz/debrief content."
      );
    }
  }

  // Check 3: Quiz concepts must be taught in earlier instructional stages.
  const cumulativeInstructionalTokens = new Set<string>();

  for (const stage of mission.stages) {
    const stageRecord = recordByStageId.get(stage.id);
    if (!stageRecord) {
      continue;
    }

    if (INSTRUCTIONAL_STAGE_TYPES.has(stageRecord.type)) {
      const stageTokens = instructionalTokensByStageId.get(stageRecord.id) ?? new Set<string>();
      for (const token of stageTokens) {
        cumulativeInstructionalTokens.add(token);
      }
      continue;
    }

    if (stageRecord.type !== "quiz") {
      continue;
    }

    const questions = quizQuestionsByStage.get(stageRecord.id) ?? [];
    for (const question of questions) {
      const questionTokens = getCoverageTokens(conceptSetFromTexts([question.question, question.explanation]));
      if (questionTokens.size === 0) {
        continue;
      }

      const overlap = getTokenOverlap(questionTokens, cumulativeInstructionalTokens);
      if (overlap.length === 0) {
        logError(
          `${slug}:${stageRecord.id}`,
          `Quiz question concept is not taught in earlier instructional stages (${question.id}).`
        );
      }
    }
  }

  // Check 4: primaryFeatures should be represented in briefing, stages, quiz, and debrief.
  const briefingCoverageSet = getFallbackCoverageTokens(briefingIntentTokens);
  const stageCoverageSet = getFallbackCoverageTokens(allInstructionalTokens);
  const quizCoverageSet = getFallbackCoverageTokens(quizConceptTokens);
  const debriefCoverageSet = getFallbackCoverageTokens(debriefTokens);

  for (const feature of mission.primaryFeatures) {
    const featureTokens = getCoverageTokens(conceptSetFromTexts([feature]));
    if (featureTokens.size === 0) {
      continue;
    }

    const missingAreas: string[] = [];

    if (getTokenOverlap(featureTokens, briefingCoverageSet).length === 0) {
      missingAreas.push("briefing");
    }
    if (getTokenOverlap(featureTokens, stageCoverageSet).length === 0) {
      missingAreas.push("instructional stages");
    }
    if (getTokenOverlap(featureTokens, quizCoverageSet).length === 0) {
      missingAreas.push("quiz");
    }
    if (getTokenOverlap(featureTokens, debriefCoverageSet).length === 0) {
      missingAreas.push("debrief");
    }

    const coverageCount = 4 - missingAreas.length;

    if (coverageCount <= 1) {
      logWarn(
        `${slug}:mission`,
        `Primary feature "${feature}" is poorly represented across mission pedagogy (missing: ${missingAreas.join(", ")}).`
      );
    } else if (missingAreas.length > 0) {
      logWarn(
        `${slug}:mission`,
        `Primary feature "${feature}" has partial coverage (missing: ${missingAreas.join(", ")}).`
      );
    }
  }

  // Additional consistency guard: mission intent should connect to instructional content.
  const missionIntentOverlap = getTokenOverlap(getCoverageTokens(missionIntentTokens), stageCoverageSet);
  if (missionIntentOverlap.length === 0) {
    logWarn(
      `${slug}:mission`,
      "Mission description/primaryFeatures are disconnected from instructional stage teaching signals."
    );
  }
}

/**
 * Validates a single mission directory.
 */
async function validateMission(missionDir: string): Promise<void> {
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

  const stageRecords: StageValidationRecord[] = [];

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
          `${stageFileName}: ${String(issue.path.join("."))} — ${issue.message}`
        );
      }
      stagesChecked++;
      continue;
    }

    let resolvedConfig: unknown = stageResult.data;
    try {
      resolvedConfig = await getStageConfig<unknown>(slug, stageFileName);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown loader error";
      logError(slug, `${stageFileName}: failed to resolve stage content via loader — ${message}`);
    }

    stageRecords.push({
      id: stage.id,
      title: stage.title,
      type: stage.type,
      configFile: stageFileName,
      resolvedConfig,
    });

    stagesChecked++;
  }

  runMissionSemanticChecks(slug, mission, stageRecords);

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

async function main(): Promise<void> {
  console.log("\n🔍 Databricks Sword — Content Validation\n");

  // Validate missions
  console.log("📦 Missions:");
  if (fs.existsSync(MISSIONS_DIR)) {
    const missionDirs = fs
      .readdirSync(MISSIONS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(MISSIONS_DIR, d.name));

    for (const dir of missionDirs) {
      await validateMission(dir);
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
}

void main();
