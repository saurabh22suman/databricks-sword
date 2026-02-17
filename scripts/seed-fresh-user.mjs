/**
 * @file seed-fresh-user.mjs
 * @description Seeds the mock user (mock-user-001) with a fresh / low-XP
 * sandbox snapshot so that animations (rank-up, achievements, challenge-complete)
 * can be tested via Playwright.
 *
 * Usage:
 *   export $(grep -v '^#' .env | xargs) && node scripts/seed-fresh-user.mjs
 */

import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

/** SandboxData with ~80 XP — just below the Recruit threshold (100 XP) */
const freshSandbox = {
  version: 1,
  missionProgress: {},
  challengeResults: {},
  userStats: {
    totalXp: 80,
    totalMissionsCompleted: 0,
    totalChallengesCompleted: 0,
    totalAchievements: 0,
    currentStreak: 1,
    longestStreak: 1,
    totalTimeSpentMinutes: 5,
  },
  streakData: {
    currentStreak: 1,
    longestStreak: 1,
    lastActiveDate: new Date().toISOString().split("T")[0],
    freezesAvailable: 2,
    freezesUsed: 0,
  },
  achievements: [],
  flashcardProgress: {},
  lastSynced: null,
};

/** Databricks connection fields to update */
const databricksFields = {
  warehouseId: "b4d816135a346c2e",
  catalogName: "dev",
};

async function main() {
  const userId = "mock-user-001";
  const snapshotJson = JSON.stringify(freshSandbox);

  // Ensure user row exists
  await db.execute({
    sql: `INSERT OR IGNORE INTO users (id, name, email, created_at) VALUES (?, ?, ?, unixepoch())`,
    args: [userId, "Mock Swordsman", "mock@dbsword.local"],
  });

  // Upsert sandbox snapshot
  const existing = await db.execute({
    sql: `SELECT id FROM sandbox_snapshots WHERE user_id = ?`,
    args: [userId],
  });

  if (existing.rows.length > 0) {
    await db.execute({
      sql: `UPDATE sandbox_snapshots SET snapshot_data = ?, updated_at = unixepoch() WHERE user_id = ?`,
      args: [snapshotJson, userId],
    });
    console.log("✅ Updated sandbox snapshot for", userId);
  } else {
    const { nanoid } = await import("nanoid");
    await db.execute({
      sql: `INSERT INTO sandbox_snapshots (id, user_id, snapshot_data, updated_at) VALUES (?, ?, ?, unixepoch())`,
      args: [nanoid(), userId, snapshotJson],
    });
    console.log("✅ Inserted new sandbox snapshot for", userId);
  }

  console.log(
    `   XP: ${freshSandbox.userStats.totalXp}  |  Rank: Cadet  |  Achievements: 0`
  );
  console.log(
    "   Completing one challenge (usually 75-125 XP) should trigger rank-up to Recruit!"
  );

  // Update Databricks connection with warehouse ID and catalog name
  const connResult = await db.execute({
    sql: `UPDATE databricks_connections SET warehouse_id = ?, catalog_name = ? WHERE user_id = ?`,
    args: [databricksFields.warehouseId, databricksFields.catalogName, userId],
  });

  if (connResult.rowsAffected > 0) {
    console.log("✅ Updated Databricks connection with warehouse ID and catalog");
    console.log(`   Warehouse ID: ${databricksFields.warehouseId}`);
    console.log(`   Catalog: ${databricksFields.catalogName}`);
  } else {
    console.log("⚠️  No Databricks connection found for user - connect first via /settings");
  }
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
