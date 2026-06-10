"use client"

/**
 * @file IntelSearch.tsx
 * @description Client-side searchable accordion of intel Q&A entries.
 * Used on /intel. Filters questions by question/answer/keyPoints (case-insensitive)
 * and renders a "no results" state when the search has no matches.
 */

import { Search, X } from "lucide-react"
import { useDeferredValue, useMemo, useState } from "react"

type IntelQuestion = {
  id: number | string
  question: string
  answer: string
  codeExample?: string | null
  keyPoints: string[]
}

type IntelCategory = {
  name: string
  /** Public path to the category icon (e.g. /icons/cat-pyspark.png) or null to fall back to a default. */
  iconPath: string | null
  questions: IntelQuestion[]
}

export interface IntelSearchProps {
  /** Categories with their questions, pre-enriched with iconPath on the server. */
  data: IntelCategory[]
}

function matches(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle)
}

function questionMatches(q: IntelQuestion, needle: string): boolean {
  if (!needle) return true
  if (matches(q.question, needle)) return true
  if (matches(q.answer, needle)) return true
  if (q.codeExample && matches(q.codeExample, needle)) return true
  for (const kp of q.keyPoints) {
    if (matches(kp, needle)) return true
  }
  return false
}

/**
 * Renders a single intel entry as a collapsible details/summary block.
 * Styled to match the existing FAQItem in src/app/intel/page.tsx so the
 * visual treatment is identical to the pre-search version.
 */
function IntelEntry({ item }: { item: IntelQuestion }): React.ReactElement {
  const showIdPrefix = typeof item.id === "number"
  return (
    <details className="group cut-corner border border-anime-700 bg-anime-900 transition-colors hover:border-anime-cyan/50">
      <summary className="flex cursor-pointer items-center justify-between p-5 text-gray-100 hover:bg-anime-800/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-anime-cyan/60">
        <span className="pr-4 font-medium">
          {showIdPrefix ? `${item.id}. ` : ""}
          {item.question}
        </span>
        <span className="text-anime-cyan transition-transform group-open:rotate-180">▼</span>
      </summary>
      <div className="border-t border-anime-700 p-5">
        <p className="text-gray-300 leading-relaxed">{item.answer}</p>

        {item.codeExample && (
          <pre className="mt-4 overflow-x-auto rounded bg-anime-950 p-4 text-sm text-gray-300 border border-anime-700">
            <code>{item.codeExample}</code>
          </pre>
        )}

        {item.keyPoints.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-anime-cyan mb-2">Key Points:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
              {item.keyPoints.map((point, idx) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  )
}

export function IntelSearch({ data }: IntelSearchProps): React.ReactElement {
  const [query, setQuery] = useState("")
  // useDeferredValue keeps typing snappy even with a large FAQ list.
  const deferred = useDeferredValue(query.trim().toLowerCase())

  const filtered = useMemo(() => {
    if (!deferred) return data
    return data
      .map((cat) => ({
        ...cat,
        questions: cat.questions.filter((q) => questionMatches(q, deferred)),
      }))
      .filter((cat) => cat.questions.length > 0)
  }, [data, deferred])

  const totalMatches = useMemo(
    () => filtered.reduce((sum, cat) => sum + cat.questions.length, 0),
    [filtered]
  )

  return (
    <div className="space-y-6">
      {/* Search input */}
      <div className="relative">
        <label htmlFor="intel-search" className="sr-only">
          Search intel entries
        </label>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-anime-500"
          aria-hidden="true"
        />
        <input
          id="intel-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions, answers, or key points…"
          className="
            w-full rounded border border-anime-700 bg-anime-900
            py-3 pl-12 pr-12 text-gray-100 placeholder:text-anime-500
            focus:border-anime-cyan focus:outline-none focus:ring-1 focus:ring-anime-cyan/60
          "
          autoComplete="off"
          spellCheck="false"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-anime-500 hover:bg-anime-800 hover:text-anime-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-anime-cyan/60"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Result count */}
      {deferred && (
        <p
          className="font-mono text-xs uppercase tracking-widest text-anime-500"
          aria-live="polite"
        >
          {totalMatches === 0
            ? `No intel matches for "${query.trim()}"`
            : `${totalMatches} match${totalMatches === 1 ? "" : "es"} across ${filtered.length} categor${filtered.length === 1 ? "y" : "ies"}`}
        </p>
      )}

      {/* Filtered list */}
      {filtered.length === 0 ? (
        <div className="cut-corner border border-anime-700 bg-anime-900/50 p-8 text-center">
          <p className="text-gray-400">No intel found.</p>
          <p className="mt-1 text-sm text-anime-500">
            Try a different keyword, or{" "}
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-anime-cyan underline underline-offset-2 hover:text-anime-cyan/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-anime-cyan/60"
            >
              clear the search
            </button>
            .
          </p>
        </div>
      ) : (
        <div className="mt-2 space-y-12">
          {filtered.map((category) => (
            <section
              key={category.name}
              id={category.name.toLowerCase().replace(/\s+/g, "-")}
            >
              <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-4 mb-6 border-l-2 border-anime-cyan pl-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded border border-anime-800 bg-anime-950/60">
                  {category.iconPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={category.iconPath}
                      alt=""
                      aria-hidden="true"
                      width={48}
                      height={48}
                      className="h-10 w-10 object-contain"
                    />
                  ) : (
                    <span aria-hidden="true" className="text-3xl">📚</span>
                  )}
                </span>
                {category.name}
                <span className="ml-auto text-sm font-mono font-normal text-anime-500">
                  {category.questions.length} match
                  {category.questions.length === 1 ? "" : "es"}
                </span>
              </h2>
              <div className="space-y-4">
                {category.questions.map((item) => (
                  <IntelEntry key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
