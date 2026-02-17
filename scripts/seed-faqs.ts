/**
 * @file seed-faqs.ts
 * @description Seeds the faq_items table with all 85 static FAQ questions
 * using Drizzle ORM + Turso.
 *
 * Usage:
 *   export $(grep -v '^#' .env | xargs) && npx tsx scripts/seed-faqs.ts
 */

import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { faqData, categorySlugMap } from "../src/content/intel/faqData"

// Mirror the schema (can't import @/ alias from scripts)
const faqItems = sqliteTable("faq_items", {
  id: text("id").primaryKey(),
  category: text("category").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  codeExample: text("code_example"),
  keyPoints: text("key_points").default("[]"),
  displayOrder: integer("display_order").notNull().default(0),
  status: text("status").notNull().default("published"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

async function main(): Promise<void> {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url) {
    console.error("TURSO_DATABASE_URL is not set")
    process.exit(1)
  }

  const client = createClient({ url, authToken })
  const db = drizzle(client)

  // Clear existing FAQ items
  console.log("🗑️  Clearing existing FAQ items...")
  await db.delete(faqItems)

  // Flatten all questions with category slugs and display order
  const now = new Date()
  let globalOrder = 0
  const rows: Array<{
    id: string
    category: string
    question: string
    answer: string
    codeExample: string | null
    keyPoints: string
    displayOrder: number
    status: string
    createdAt: Date
    updatedAt: Date
  }> = []

  for (const category of faqData) {
    const slug = categorySlugMap[category.name]
    if (!slug) {
      console.warn(`⚠️  No slug mapping for category "${category.name}", skipping`)
      continue
    }

    for (const q of category.questions) {
      globalOrder++
      rows.push({
        id: crypto.randomUUID(),
        category: slug,
        question: q.question,
        answer: q.answer,
        codeExample: q.codeExample ?? null,
        keyPoints: JSON.stringify(q.keyPoints),
        displayOrder: globalOrder,
        status: "published",
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  // Insert in batches of 20 (Turso has statement size limits)
  const BATCH_SIZE = 20
  let inserted = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    await db.insert(faqItems).values(batch)
    inserted += batch.length
    console.log(`✅ Inserted ${inserted}/${rows.length} FAQ items`)
  }

  console.log(`\n🎉 Done! Seeded ${rows.length} FAQ items across ${faqData.length} categories.`)
  process.exit(0)
}

main().catch((err) => {
  console.error("❌ Seed failed:", err)
  process.exit(1)
})
