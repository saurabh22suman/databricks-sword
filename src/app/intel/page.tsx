import { faqItems, getDb } from "@/lib/db"
import { StructuredData, getFAQStructuredData } from "@/lib/seo/structured-data"
import { faqData } from "@/content/intel/faqData"
import type { FAQQuestion, FAQCategory } from "@/content/intel/faqData"
import { eq } from "drizzle-orm"
import type { Metadata } from "next"
import Link from "next/link"
import { Database } from "lucide-react"

export const metadata: Metadata = {
  title: "Intel — Databricks Interview Questions & Knowledge Base",
  description:
    "Databricks interview questions with detailed answers, code examples, and explanations. Your decrypted knowledge base for lakehouse mastery.",
}

// Force dynamic rendering for DB queries
export const dynamic = "force-dynamic"

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

    // Convert to category array with icons
    const categoryIcons: Record<string, string> = {
      "general": "🏢",
      "delta-lake": "🔷",
      "pyspark": "⚡",
      "sql": "📊",
      "mlflow": "🤖",
      "architecture": "🏗️",
    }

    return Array.from(categoryMap.entries()).map(([name, questions]) => ({
      name: name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      icon: categoryIcons[name] || "📚",
      questions,
    }))
  } catch (error) {
    console.error("Failed to fetch DB FAQs:", error)
    return []
  }
}

/**
 * Expandable FAQ item component.
 */
function FAQItem({ item }: { item: FAQQuestion }): React.ReactElement {
  // Only show ID prefix for numeric IDs (static data), not UUIDs (database data)
  const showIdPrefix = typeof item.id === 'number';
  
  return (
    <details className="group cut-corner border border-anime-700 bg-anime-900 hover:border-anime-cyan/50 transition-colors">
      <summary className="flex cursor-pointer items-center justify-between p-5 text-gray-100 hover:bg-anime-800/50">
        <span className="font-medium pr-4">{showIdPrefix ? `${item.id}. ` : ''}{item.question}</span>
        <span className="text-anime-cyan transition-transform group-open:rotate-180">
          ▼
        </span>
      </summary>
      <div className="border-t border-anime-700 p-5">
        <p className="text-gray-300 leading-relaxed">{item.answer}</p>
        
        {item.codeExample && (
          <pre className="mt-4 overflow-x-auto rounded bg-anime-950 p-4 text-sm text-gray-300 border border-anime-700">
            <code>{item.codeExample}</code>
          </pre>
        )}
        
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-anime-cyan mb-2">Key Points:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
            {item.keyPoints.map((point, idx) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  )
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

        {/* Category summary cards */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-12">
          {displayData.map((cat) => (
            <a
              key={cat.name}
              href={`#${cat.name.toLowerCase().replace(/\s+/g, "-")}`}
              className="cut-corner border border-anime-700 bg-anime-900 p-5 transition-all duration-300 hover:border-anime-cyan hover:bg-anime-800/50 hover:-translate-y-1 hover:shadow-neon-cyan group"
            >
              <span className="text-2xl" aria-hidden="true">
                {cat.icon}
              </span>
              <h3 className="mt-2 font-semibold text-gray-100 group-hover:text-anime-cyan transition-colors">{cat.name}</h3>
              <p className="mt-1 text-sm text-gray-400 font-mono">
                {cat.questions.length} classified entries
              </p>
            </a>
          ))}
        </div>

        {/* FAQ content by category */}
        <div className="mt-12 space-y-12">
          {displayData.map((category) => (
            <section
              key={category.name}
              id={category.name.toLowerCase().replace(/\s+/g, "-")}
            >
              <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-3 mb-6 border-l-2 border-anime-cyan pl-4">
                <span aria-hidden="true">{category.icon}</span>
                {category.name}
              </h2>
              <div className="space-y-4">
                {category.questions.map((item) => (
                  <FAQItem key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))}
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
