"use client"

import type { IndustryConfig } from "@/lib/field-ops/types"
import { cn } from "@/lib/utils"
import { Target } from "lucide-react"
import Link from "next/link"

type FieldOperationsPreviewProps = {
  /** Featured industries to display (typically 2) */
  industries: IndustryConfig[]
}

/**
 * Field Operations preview section on the landing page.
 * Displays featured real-world deployment operations linking to /field-ops
 */
export function FieldOperationsPreview({
  industries,
}: FieldOperationsPreviewProps): React.ReactElement | null {
  if (industries.length === 0) return null

  return (
    <section id="field-ops" className="py-32 relative">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6 relative z-10">
          <div>
            <div className="text-anime-cyan font-mono text-xs uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-anime-cyan" />
              Featured Operations
            </div>
            <h2 className="text-4xl md:text-5xl font-black italic text-white tracking-tighter">
              FIELD <span className="text-gray-600">OPERATIONS</span>
            </h2>
            <p className="mt-4 text-gray-400 max-w-lg border-l-2 border-gray-700 pl-4 text-sm font-mono">
              Deploy to real Databricks environments. Fix broken pipelines across 8 industries.
            </p>
          </div>
          <Link
            href="/field-ops"
            className="flex items-center gap-2 text-anime-accent font-bold uppercase tracking-widest text-xs border border-anime-accent px-4 py-2 hover:bg-anime-accent hover:text-white transition-colors"
          >
            View all operations <Target className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6 relative z-10">
          {industries.map((industry) => {
            return (
              <Link
                key={industry.industry}
                href={`/field-ops/${industry.industry}`}
                className={cn(
                  "group relative bg-anime-900 border border-white/10 p-1 transition-all duration-300",
                  "hover:border-anime-cyan/50",
                )}
              >
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-2 h-2 bg-white/20 group-hover:bg-white transition-colors" />
                <div className="absolute top-0 right-0 w-2 h-2 bg-white/20 group-hover:bg-white transition-colors" />
                <div className="absolute bottom-0 left-0 w-2 h-2 bg-white/20 group-hover:bg-white transition-colors" />
                <div className="absolute bottom-0 right-0 w-2 h-2 bg-white/20 group-hover:bg-white transition-colors" />

                <div
                  className={cn(
                    "h-full bg-anime-950 p-8 relative overflow-hidden transition-colors",
                    "hover:bg-anime-cyan/5",
                  )}
                >
                  {/* Background emoji */}
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-6xl">
                    {industry.emoji}
                  </div>

                  <div className="flex justify-between items-start mb-6">
                    <div className={cn("p-3 bg-white/5 border border-white/10 text-2xl")}>
                      {industry.emoji}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-black italic uppercase tracking-widest px-2 py-1 border border-current",
                        "text-anime-cyan",
                      )}
                    >
                      LIVE-OPS
                    </span>
                  </div>

                  <div className="mb-4">
                    <div
                      className={cn(
                        "text-[10px] font-mono uppercase tracking-widest mb-1 opacity-80",
                        "text-anime-cyan",
                      )}
                    >
                      {industry.industry}
                    </div>
                    <h3 className="text-2xl font-bold italic text-white group-hover:translate-x-2 transition-transform duration-300">
                      {industry.title}
                    </h3>
                  </div>

                  <p className="text-gray-400 text-sm leading-relaxed mb-6 font-mono border-t border-white/5 pt-4">
                    {industry.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
                      <span>{industry.estimatedMinutes} min</span>
                      <span className="text-anime-cyan">+{industry.xpReward} XP</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white group-hover:text-anime-cyan transition-colors">
                      <div className="w-4 h-px bg-current" />
                      Deploy
                      <div className="w-4 h-px bg-current" />
                    </div>
                  </div>

                  {/* XP requirement badge */}
                  {industry.xpRequired > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                        Requires {industry.xpRequired.toLocaleString()} XP
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
