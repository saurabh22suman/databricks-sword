/**
 * @file grant-grandmaster-demo.mjs
 * @description One-off admin script. Writes a fully-unlocked "all content
 * completed" sandbox to the given user's `sandbox_snapshots` row on Turso.
 *
 * Effects:
 *   - totalXp set to the sum of all mission `xpReward` + side-quest `xpBonus`
 *     + challenge `xpReward` + field-ops `xpReward` in `src/content/` and
 *     `src/lib/field-ops/industries.ts` (so it survives `recalculateStats`
 *     on the client — see `src/lib/sandbox/storage.ts:238`).
 *   - All 22 missions marked `completed: true` with per-stage `xpEarned`
 *     populated (sum per mission == mission.xpReward + per-mission side-quest
 *     bonus, since the client's `recalculateStats` can only see stage XP).
 *   - All 52 challenges marked `completed: true` with `xpEarned` from content.
 *   - All 9 side-quest IDs added to `sideQuestsCompleted` for their mission.
 *   - All ~29 achievement IDs added to the unlocked list.
 *   - All 9 field-ops industries added to `completedFieldOps` (the client's
 *     `recalculateStats` looks each up in `INDUSTRY_CONFIGS` to add the XP).
 *   - Streak data filled out.
 *   - User record created if it does not already exist.
 *
 * Usage:
 *   export $(grep -v '^#' .env | xargs) && \
 *     node scripts/grant-grandmaster-demo.mjs [email]
 *
 * Defaults the email to saurabh22suman@gmail.com.
 *
 * Safety:
 *   - Idempotent (SELECT-then-INSERT-or-UPDATE)
 *   - Only touches the row for the specified email
 *   - Creates the user row with a fresh UUID if missing
 *   - Verifies the write with a follow-up SELECT
 */

import { createClient } from "@libsql/client";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TARGET_EMAIL = process.argv[2] ?? "saurabh22suman@gmail.com";
const TARGET_NAME = "Saurabh Suman";
const TARGET_STREAK = 30;
const TODAY = new Date().toISOString().split("T")[0];

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error(
    "TURSO_DATABASE_URL is not defined. Run: export $(grep -v '^#' .env | xargs)",
  );
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// ---------------------------------------------------------------------------
// Content discovery (read directly from src/content, no DB round-trip)
// ---------------------------------------------------------------------------

function listDirs(p) {
  return readdirSync(p).filter((name) => statSync(join(p, name)).isDirectory());
}

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf-8"));
}

const missionsRoot = join(process.cwd(), "src/content/missions");
const missionEntries = listDirs(missionsRoot).map((slug) => {
  const json = readJson(join(missionsRoot, slug, "mission.json"));
  const sideQuests = Array.isArray(json.sideQuests) ? json.sideQuests : [];
  return {
    id: json.id,
    slug,
    xpReward: Number(json.xpReward ?? 0),
    stages: Array.isArray(json.stages) ? json.stages : [],
    sideQuests: sideQuests.map((sq) => ({
      id: String(sq.id),
      xpBonus: Number(sq.xpBonus ?? 0),
    })),
  };
}).filter((m) => m.id);

const challengesRoot = join(process.cwd(), "src/content/challenges");
const challengeFiles = readdirSync(challengesRoot, { recursive: true })
  .filter((f) => typeof f === "string" && f.endsWith(".json"));
const challengeEntries = challengeFiles.map((rel) => {
  const id = rel.replace(/\.json$/, "");
  const xpReward = Number(readJson(join(challengesRoot, rel)).xpReward ?? 0);
  return { id, xpReward };
});

// Field-ops XP comes from INDUSTRY_CONFIGS in
// src/lib/field-ops/industries.ts (the source of truth — the per-mission
// `mission.json` files in src/content/field-ops/*/ are out of date and
// only have xpReward on 4 of the 9 industries). We parse the constant
// to stay consistent with the client's `recalculateStats`.
const industriesSrc = readFileSync(
  join(process.cwd(), "src/lib/field-ops/industries.ts"),
  "utf-8",
);
const industryEntries = [
  ...industriesSrc.matchAll(
    /^\s*"?(?<id>[a-z0-9-]+)"?\s*:\s*\{[\s\S]*?xpReward:\s*(?<xp>\d+)/gm,
  ),
].map((m) => ({ id: m.groups.id, xpReward: Number(m.groups.xp) }));
const uniqueIndustryEntries = Array.from(
  new Map(industryEntries.map((e) => [e.id, e])).values(),
);

const fieldOpsRoot = join(process.cwd(), "src/content/field-ops");
const fieldOpsIndustries = listDirs(fieldOpsRoot);

const achievementsSrc = readFileSync(
  join(process.cwd(), "src/lib/gamification/achievements.ts"),
  "utf-8",
);
const achievementIds = [
  ...achievementsSrc.matchAll(/^\s*id:\s*"([a-z0-9-]+)"/gm),
].map((m) => m[1]);

// Compute the actual content XP total so the sandbox survives
// `recalculateStats` on the client (which overwrites userStats.totalXp
// with sum(stage.xpEarned) + sum(challenge.xpEarned) + sum(field-ops XP)).
const totalMissionXp = missionEntries.reduce((s, m) => s + m.xpReward, 0);
const totalSideQuestXp = missionEntries.reduce(
  (s, m) => s + m.sideQuests.reduce((ss, sq) => ss + sq.xpBonus, 0),
  0,
);
const totalChallengeXp = challengeEntries.reduce((s, c) => s + c.xpReward, 0);
const totalFieldOpsXp = uniqueIndustryEntries.reduce((s, i) => s + i.xpReward, 0);
const targetXp =
  totalMissionXp + totalSideQuestXp + totalChallengeXp + totalFieldOpsXp;

console.log("📦 Discovered content:");
console.log(`   missions:        ${missionEntries.length}`);
console.log(`   challenges:      ${challengeEntries.length}`);
console.log(`   side quests:     ${missionEntries.reduce((s, m) => s + m.sideQuests.length, 0)}`);
console.log(`   achievements:    ${achievementIds.length}`);
console.log(`   field-ops:       ${fieldOpsIndustries.length}`);
console.log(`   mission XP:      ${totalMissionXp}`);
console.log(`   side-quest XP:   ${totalSideQuestXp}`);
console.log(`   challenge XP:    ${totalChallengeXp}`);
console.log(`   field-ops XP:    ${totalFieldOpsXp}`);
console.log(`   TOTAL XP:        ${targetXp}`);

// ---------------------------------------------------------------------------
// Build the SandboxData payload (matches SandboxDataSchema in
// src/lib/sandbox/types.ts — both the client and the server validate it).
// ---------------------------------------------------------------------------

const now = new Date().toISOString();
const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString();

const missionProgress = Object.fromEntries(
  missionEntries.map((m) => {
    // Total stage XP must equal mission.xpReward + this mission's side-quest
    // xpBonus sum, because the client's `recalculateStats` only sums
    // stage.xpEarned. Side-quest XP itself is not stored anywhere on the
    // client (sideQuestsCompleted is just an array of IDs), so we bake the
    // bonus into the per-stage distribution. The last stage absorbs any
    // rounding remainder.
    const totalMissionStageXp =
      m.xpReward + m.sideQuests.reduce((s, sq) => s + sq.xpBonus, 0);
    const numStages = Math.max(m.stages.length, 1);
    const basePerStage = Math.floor(totalMissionStageXp / numStages);
    const remainder = totalMissionStageXp - basePerStage * numStages;

    const stageProgress = Object.fromEntries(
      m.stages.map((stage, i) => {
        const isLast = i === m.stages.length - 1;
        const xpEarned = isLast ? basePerStage + remainder : basePerStage;
        return [
          stage.id,
          {
            completed: true,
            xpEarned,
            codeAttempts: [],
            hintsUsed: 0,
            completedAt: now,
          },
        ];
      }),
    );

    return [
      m.id,
      {
        started: true,
        completed: true,
        stageProgress,
        sideQuestsCompleted: m.sideQuests.map((sq) => sq.id),
        totalXpEarned: totalMissionStageXp,
        startedAt: oneDayAgo,
        completedAt: now,
      },
    ];
  }),
);

const challengeResults = Object.fromEntries(
  challengeEntries.map((c) => [
    c.id,
    {
      attempted: true,
      completed: true,
      xpEarned: c.xpReward,
      hintsUsed: 0,
      attempts: 1,
      completionCount: 1,
      bestScore: 100,
      completedAt: now,
    },
  ]),
);

const sandboxData = {
  version: 2, // SandboxDataSchema v2: adds pendingClaims (P0-1)
  missionProgress,
  challengeResults,
  userStats: {
    totalXp: targetXp,
    totalMissionsCompleted: missionEntries.length,
    totalChallengesCompleted: challengeEntries.length,
    totalAchievements: achievementIds.length,
    currentStreak: TARGET_STREAK,
    longestStreak: 100,
    totalTimeSpentMinutes: 2400,
  },
  streakData: {
    currentStreak: TARGET_STREAK,
    longestStreak: 100,
    lastActiveDate: TODAY,
    freezesAvailable: 2,
    freezesUsed: 0,
  },
  achievements: achievementIds,
  completedFieldOps: fieldOpsIndustries,
  flashcardProgress: {},
  pendingClaims: [],
  lastSynced: now,
};

// ---------------------------------------------------------------------------
// Ensure user row
// ---------------------------------------------------------------------------

let userId;
const userLookup = await client.execute({
  sql: "SELECT id FROM users WHERE email = ?",
  args: [TARGET_EMAIL],
});

if (userLookup.rows.length > 0) {
  userId = userLookup.rows[0].id;
  console.log(`✅ Found existing user ${userId} for ${TARGET_EMAIL}`);
} else {
  userId = randomUUID();
  await client.execute({
    sql: `INSERT INTO users (id, name, email, leaderboard_opt_in, created_at)
          VALUES (?, ?, ?, 1, unixepoch())`,
    args: [userId, TARGET_NAME, TARGET_EMAIL],
  });
  console.log(`✅ Created new user ${userId} for ${TARGET_EMAIL}`);
}

// ---------------------------------------------------------------------------
// Upsert sandbox_snapshots (also keeps the denormalized total_xp and
// current_streak columns in sync so the leaderboard index is hot).
// ---------------------------------------------------------------------------

const snapshotJson = JSON.stringify(sandboxData);
const existingSnap = await client.execute({
  sql: "SELECT id FROM sandbox_snapshots WHERE user_id = ?",
  args: [userId],
});

if (existingSnap.rows.length > 0) {
  await client.execute({
    sql: `UPDATE sandbox_snapshots
          SET snapshot_data = ?, total_xp = ?, current_streak = ?, updated_at = unixepoch()
          WHERE user_id = ?`,
    args: [snapshotJson, targetXp, TARGET_STREAK, userId],
  });
  console.log(`✅ Updated sandbox_snapshots for ${userId}`);
} else {
  await client.execute({
    sql: `INSERT INTO sandbox_snapshots
            (id, user_id, snapshot_data, total_xp, current_streak, updated_at)
          VALUES (?, ?, ?, ?, ?, unixepoch())`,
    args: [userId, userId, snapshotJson, targetXp, TARGET_STREAK],
  });
  console.log(`✅ Inserted sandbox_snapshots for ${userId}`);
}

// ---------------------------------------------------------------------------
// Verify
// ---------------------------------------------------------------------------

const verify = await client.execute({
  sql: `SELECT user_id, total_xp, current_streak, length(snapshot_data) AS json_bytes
        FROM sandbox_snapshots WHERE user_id = ?`,
  args: [userId],
});
console.log("🔍 Row after write:", verify.rows[0]);

const counts = await client.execute({
  sql: `SELECT
          json_array_length(json_extract(snapshot_data, '$.achievements'))        AS achievements,
          json_array_length(json_extract(snapshot_data, '$.completedFieldOps')) AS field_ops,
          snapshot_data
        FROM sandbox_snapshots WHERE user_id = ?`,
  args: [userId],
});
// missionProgress and challengeResults are JSON objects, so we count keys in JS.
// (SQLite's `json_*` helpers are array-oriented; there is no `json_object_length`.)
const verified = JSON.parse(counts.rows[0].snapshot_data);
console.log("🎯 Sandbox JSON contents:");
console.log(`   achievements:         ${counts.rows[0].achievements}`);
console.log(`   missions:             ${Object.keys(verified.missionProgress).length}`);
console.log(`   challenges:           ${Object.keys(verified.challengeResults).length}`);
console.log(`   completedFieldOps:    ${counts.rows[0].field_ops}`);
console.log(`   userStats.totalXp:    ${verified.userStats.totalXp}`);
console.log("🏆 Grandmaster demo applied.");
