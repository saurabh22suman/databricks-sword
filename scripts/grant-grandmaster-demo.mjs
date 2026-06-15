/**
 * @file grant-grandmaster-demo.mjs
 * @description One-off admin script. Writes a fully-unlocked "Grandmaster
 * demo" sandbox to the given user's `sandbox_snapshots` row on Turso.
 *
 * Effects:
 *   - totalXp set to 30,000 (above Grandmaster threshold of 25,000)
 *   - All 22 missions marked `completed: true`
 *   - All 52 challenges marked `completed: true`
 *   - All ~29 achievement IDs added to the unlocked list
 *   - All 9 field-ops industries added to `completedFieldOps`
 *   - Streak data filled out
 *   - User record created if it does not already exist
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
const TARGET_XP = 30_000; // Above Grandmaster threshold (25,000)
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
const missionIds = listDirs(missionsRoot)
  .map((slug) => readJson(join(missionsRoot, slug, "mission.json")).id)
  .filter(Boolean);

const challengesRoot = join(process.cwd(), "src/content/challenges");
const challengeIds = readdirSync(challengesRoot, { recursive: true })
  .filter((f) => typeof f === "string" && f.endsWith(".json"))
  .map((rel) => rel.replace(/\.json$/, ""));

const fieldOpsRoot = join(process.cwd(), "src/content/field-ops");
const fieldOpsIndustries = listDirs(fieldOpsRoot);

const achievementsSrc = readFileSync(
  join(process.cwd(), "src/lib/gamification/achievements.ts"),
  "utf-8",
);
const achievementIds = [
  ...achievementsSrc.matchAll(/^\s*id:\s*"([a-z0-9-]+)"/gm),
].map((m) => m[1]);

console.log("📦 Discovered content:");
console.log(`   missions:      ${missionIds.length}`);
console.log(`   challenges:    ${challengeIds.length}`);
console.log(`   achievements:  ${achievementIds.length}`);
console.log(`   field-ops:     ${fieldOpsIndustries.length}`);

// ---------------------------------------------------------------------------
// Build the SandboxData payload (matches SandboxDataSchema in
// src/lib/sandbox/types.ts — both the client and the server validate it).
// ---------------------------------------------------------------------------

const now = new Date().toISOString();
const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString();

const missionProgress = Object.fromEntries(
  missionIds.map((id) => [
    id,
    {
      started: true,
      completed: true,
      stageProgress: {},
      sideQuestsCompleted: [],
      totalXpEarned: 500,
      startedAt: oneDayAgo,
      completedAt: now,
    },
  ]),
);

const challengeResults = Object.fromEntries(
  challengeIds.map((id) => [
    id,
    {
      attempted: true,
      completed: true,
      xpEarned: 200,
      hintsUsed: 0,
      attempts: 1,
      completionCount: 1,
      bestScore: 100,
      completedAt: now,
    },
  ]),
);

const sandboxData = {
  version: 1,
  missionProgress,
  challengeResults,
  userStats: {
    totalXp: TARGET_XP,
    totalMissionsCompleted: missionIds.length,
    totalChallengesCompleted: challengeIds.length,
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
    args: [snapshotJson, TARGET_XP, TARGET_STREAK, userId],
  });
  console.log(`✅ Updated sandbox_snapshots for ${userId}`);
} else {
  await client.execute({
    sql: `INSERT INTO sandbox_snapshots
            (id, user_id, snapshot_data, total_xp, current_streak, updated_at)
          VALUES (?, ?, ?, ?, ?, unixepoch())`,
    args: [userId, userId, snapshotJson, TARGET_XP, TARGET_STREAK],
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
