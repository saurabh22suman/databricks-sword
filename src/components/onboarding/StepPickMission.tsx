"use client"

/**
 * @file StepPickMission.tsx
 * @description Onboarding step 4: present 3 starter missions and mark the
 * tour complete when one is selected.
 */
import Link from "next/link"
import { markOnboardingComplete } from "@/lib/onboarding/state"

const STARTERS: { slug: string; title: string; minutes: number; blurb: string }[] = [
  {
    slug: "lakehouse-fundamentals",
    title: "Lakehouse Fundamentals",
    minutes: 25,
    blurb: "Delta Lake, Unity Catalog, and the medallion architecture.",
  },
  {
    slug: "sql-essentials",
    title: "SQL Essentials",
    minutes: 20,
    blurb: "SELECTs, JOINs, and window functions for analytics engineers.",
  },
  {
    slug: "pyspark-intro",
    title: "PySpark Intro",
    minutes: 30,
    blurb: "DataFrames, transformations, and lazy evaluation.",
  },
]

export function StepPickMission(): React.ReactElement {
  const handlePick = () => {
    markOnboardingComplete()
  }

  return (
    <div>
      <div className="font-mono text-xs tracking-widest text-anime-cyan mb-2">
        [ STEP 4 / 4 ]
      </div>
      <h1
        id="onboarding-title"
        className="font-heading text-3xl font-black text-anime-100 mb-4"
      >
        Pick Your First Mission
      </h1>
      <p className="text-anime-300 font-mono mb-6 leading-relaxed">
        Start with whichever looks most interesting. You can always switch
        later.
      </p>
      <div className="grid gap-3">
        {STARTERS.map((m) => (
          <Link
            key={m.slug}
            href={`/missions/${m.slug}`}
            onClick={handlePick}
            className="cut-corner border border-anime-cyan/40 bg-anime-cyan/5 p-4 hover:bg-anime-cyan/15 transition-colors block"
          >
            <div className="font-heading text-anime-100 font-bold text-lg">
              {m.title}
            </div>
            <div className="text-anime-400 font-mono text-sm mb-1">
              ~{m.minutes} minutes
            </div>
            <div className="text-anime-500 text-xs">{m.blurb}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
