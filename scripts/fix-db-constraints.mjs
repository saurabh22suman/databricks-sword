import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const migrations = [
  "CREATE UNIQUE INDEX IF NOT EXISTS 'databricks_connections_user_id_unique' ON 'databricks_connections' ('user_id');",
];

async function run() {
  console.log("Connecting to Turso:", process.env.TURSO_DATABASE_URL?.slice(0, 40) + "...");
  for (const sql of migrations) {
    console.log("Running:", sql.slice(0, 60) + "...");
    try {
      await client.execute(sql);
      console.log("✓ Success");
    } catch (e) {
      console.log("✗ Error:", e.message);
    }
  }
  console.log("Done!");
}

run().catch(console.error);
