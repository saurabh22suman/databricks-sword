import type { FAQCategory, FAQQuestion } from "@/content/intel/faqData"
import { categorySlugMap, faqData } from "@/content/intel/faqData"
import { IntelSearch } from "@/components/intel/IntelSearch"
import { getAllChallenges } from "@/lib/challenges"
import { CATEGORY_ICON_MAP } from "@/lib/challenges/categoryIcons"
import { faqItems, getDb } from "@/lib/db"
import {
  getChallengeCategoryForIntelTopic,
  getIntelTopicCoverage,
  REQUIRED_INTEL_TOPIC_LABELS,
} from "@/lib/intel/topicAlignment"
import { StructuredData, getFAQStructuredData } from "@/lib/seo/structured-data"
import { eq } from "drizzle-orm"
import { AlertTriangle, Database } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Intel — Databricks Interview Questions & Knowledge Base",
  description:
    "Databricks interview questions with detailed answers, code examples, and explanations. Your decrypted knowledge base for lakehouse mastery.",
}

// ISR: cache intel page for 5 minutes (challenges rarely change)
export const revalidate = 300

/**
 * Get FAQ items from database.
 */
async function getDbFaqs(): Promise<FAQCategory[]> {
  try {
    const db = getDb()
    const items = await db
      .select()
      .from(faqItems)
      .where(eq(faqItems.status, "published"))
      .orderBy(faqItems.displayOrder)

    if (items.length === 0) return []

    // Group by category
    const categoryMap = new Map<string, FAQQuestion[]>()
    for (const item of items) {
      const questions = categoryMap.get(item.category) || []
      questions.push({
        id: item.id,
        question: item.question,
        answer: item.answer,
        codeExample: item.codeExample,
        keyPoints: JSON.parse(item.keyPoints ?? "[]"),
      })
      categoryMap.set(item.category, questions)
    }

    return Array.from(categoryMap.entries()).map(([name, questions]) => ({
      name: name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      // Preserve the legacy `icon` field for type compatibility — the page
      // computes the real icon path server-side below before passing data to
      // the IntelSearch client component.
      icon: "",
      questions,
    }))
  } catch (error) {
    console.error("Failed to fetch DB FAQs:", error)
    return []
  }
}

/**
 * Direct lowercase display-name → icon path map. Built once at module load.
 *
 * The intel page gets its category names from two sources that disagree:
 *   1. Static `faqData` has full titles like "SQL & Analytics", "MLflow & MLOps".
 *   2. DB rows store the bare slug and `getDbFaqs()` title-cases it, so
 *      the runtime display name can be "Sql", "Mlflow", "Pyspark", etc.
 *
 * To handle both shapes we lowercase the display name and match against the
 * FIRST WORD of each known display name. That way "Sql" matches the row
 * whose full name starts with "SQL".
 */
const INTEL_ICON_BY_FIRST_WORD: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const [displayName, slug] of Object.entries(categorySlugMap)) {
    const iconPath = CATEGORY_ICON_MAP[slug as keyof typeof CATEGORY_ICON_MAP]
    if (!iconPath) continue // "general" has no icon file
    const firstWord = displayName.toLowerCase().split(/[\s&]+/)[0]
    if (firstWord) map[firstWord] = iconPath
  }
  return map
})()

/**
 * Resolve a category display name (e.g. "Delta Lake", "PySpark", "Sql")
 * to the public path of its dedicated icon in /public/icons/. Returns
 * `null` when no dedicated icon exists (currently only "General Databricks")
 * so the caller can fall back to a generic icon.
 */
function getIconPathForCategory(displayName: string): string | null {
  const firstWord = displayName.toLowerCase().split(/[\s&]+/)[0]
  return INTEL_ICON_BY_FIRST_WORD[firstWord] ?? null
}

/**
 * Expandable FAQ item component.
 * (Rendered through the IntelSearch client component so the page can search it.)
 */
function FAQItem({ item: _item }: { item: FAQQuestion }): React.ReactElement {
  // The live page renders the intel list through <IntelSearch /> so users
  // can filter it. Kept as a no-op shim for any external imports that
  // expect this symbol to exist on the page module.
  return <></>
}

/**
 * Intel page - Decrypted knowledge base for Databricks interview questions.
 * Cyberpunk-themed FAQ with technical intelligence gathering aesthetic.
 */
export default async function IntelPage(): Promise<React.ReactElement> {
  // DB-first: load from Turso, fall back to static data if DB is empty
  const dbFaqs = await getDbFaqs()
  const displayData = dbFaqs.length > 0 ? dbFaqs : faqData

  const totalQuestions = displayData.reduce((sum, cat) => sum + cat.questions.length, 0)

  // Enrich categories with the real icon path (from /public/icons/) before
  // handing off to the client component for interactive search.
  const searchData = displayData.map((cat) => ({
    name: cat.name,
    iconPath: getIconPathForCategory(cat.name),
    questions: cat.questions,
  }))

  const challenges = await getAllChallenges()
  const coverage = getIntelTopicCoverage(challenges)

  return (
    <div className="min-h-screen bg-anime-950 text-white pt-20">
      <StructuredData data={getFAQStructuredData()} />
      
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 flex items-center gap-4">
          <div className="w-16 h-16 bg-anime-accent/10 border border-anime-accent flex items-center justify-center text-anime-accent">
            <Database className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-black italic text-white uppercase tracking-tighter">
              Intel
            </h1>
            <p className="text-gray-500 font-mono text-xs uppercase tracking-widest mt-1">
              Decrypted Knowledge Base • {totalQuestions} Entries
            </p>
          </div>
        </div>

        <p className="text-lg text-gray-400 mb-8 border-l-2 border-anime-cyan pl-4">
          Prepare for Databricks interview operations with classified intel, detailed answers, code examples, and tactical key points.
        </p>

        {coverage.missingBaselineTopics.length > 0 && (
          <div className="mb-8 cut-corner border border-anime-yellow/50 bg-anime-yellow/10 p-4 text-anime-yellow">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Intel/Challenge alignment warning</p>
                <p className="mt-1 text-sm text-anime-200">
                  Missing challenge coverage for baseline Intel topics: {coverage.missingBaselineTopics.map((topic) => REQUIRED_INTEL_TOPIC_LABELS[topic]).join(", ")}. Add at least one challenge in each listed category.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Category summary cards */}
        <div className="mt-8 mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayData.map((cat) => {
            const categorySlug = categorySlugMap[cat.name]
            const challengeCategory = categorySlug ? getChallengeCategoryForIntelTopic(categorySlug) : null
            const challengeHref = challengeCategory
              ? (`/challenges?category=${encodeURIComponent(challengeCategory)}` as const)
              : "/challenges"
            const iconPath = getIconPathForCategory(cat.name)

            return (
              <div
                key={cat.name}
                className="cut-corner border border-anime-700 bg-anime-900 p-5 transition-all duration-300 hover:border-anime-cyan hover:bg-anime-800/50"
              >
                <a
                  href={`#${cat.name.toLowerCase().replace(/\s+/g, "-")}`}
                  className="group block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-anime-cyan/60"
                >
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded border border-anime-800 bg-anime-950/60 transition-colors group-hover:border-anime-cyan/60 group-hover:bg-anime-900">
                    {iconPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={iconPath}
                        alt=""
                        aria-hidden="true"
                        width={72}
                        height={72}
                        className="h-16 w-16 object-contain"
                      />
                    ) : (
                      <Database className="h-12 w-12 text-anime-cyan" aria-hidden="true" />
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-100 transition-colors group-hover:text-anime-cyan">{cat.name}</h3>
                  <p className="mt-1 text-sm font-mono text-gray-400">{cat.questions.length} classified entries</p>
                </a>

                <Link
                  href={challengeHref}
                  className="mt-4 inline-block text-sm font-medium text-anime-cyan hover:text-anime-cyan/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-anime-cyan/60"
                >
                  Execute {cat.name} challenges →
                </Link>
              </div>
            )
          })}
        </div>

        {/* Search + FAQ content (client component for interactive filtering) */}
        <div className="mt-12">
          <IntelSearch data={searchData} />
        </div>

        <div className="mt-12 cut-corner border border-anime-accent/30 bg-anime-900 p-6 text-center">
          <p className="text-gray-400">
            Ready to deploy your knowledge in the field?
          </p>
          <Link
            href="/challenges"
            className="mt-3 inline-block rounded bg-anime-accent px-6 py-2 font-medium text-white transition-colors hover:bg-anime-accent/80"
          >
            Execute Challenge Operations →
          </Link>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-anime-cyan hover:text-anime-cyan/80"
          >
            ← Return to Base
          </Link>
        </div>
      </div>
    </div>
  )
}
