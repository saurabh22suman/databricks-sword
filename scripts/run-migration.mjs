import { createClient } from "@libsql/client"
import { readFileSync } from "fs"
import { join } from "path"

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url) {
  throw new Error("TURSO_DATABASE_URL is not defined")
}

const client = createClient({ url, authToken })

// Read migration SQL
const migrationSQL = readFileSync(
  join(process.cwd(), "drizzle/0002_field_ops_tables.sql"),
  "utf-8"
)

// Split into individual statements (simple split on semicolon)
const statements = migrationSQL
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith("--"))

console.log(`Running ${statements.length} SQL statements...`)

for (const statement of statements) {
  try {
    await client.execute(statement)
    console.log("✓ Executed statement")
  } catch (error) {
    console.error("✗ Failed:", error)
    throw error
  }
}

console.log("✓ Migration completed successfully")
client.close()
