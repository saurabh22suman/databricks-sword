"use client"

import type { Mission } from "@/lib/missions"
import { cn } from "@/lib/utils"
import { ArrowRight, Target } from "lucide-react"
import Link from "next/link"

/** Icon mapping for mission industries */
const INDUSTRY_ICONS: Record<string, string> = {
  fintech: "⚡",
  government: "🛡️",
  finance: "🧠",
  media: "📊",
  healthcare: "💊",
  retail: "🛒",
  logistics: "📦",
  energy: "🔋",
  telecom: "📡",
  gaming: "🎮",
}

/** Rank-based accent colors */
const RANK_STYLE = {
  B: {
    color: "text-anime-green",
    border: "hover:border-anime-green/50",
    bg: "hover:bg-anime-green/5",
  },
  A: {
    color: "text-anime-cyan",
    border: "hover:border-anime-cyan/50",
    bg: "hover:bg-anime-cyan/5",
  },
  S: {
    color: "text-anime-accent",
    border: "hover:border-anime-accent/50",
    bg: "hover:bg-anime-accent/5",
  },
}

type FeaturedMissionsProps = {
  /** Curated list of 4 featured missions */
  missions: Mission[]
}

/**
 * Featured missions showcase on the landing page.
 * Displays 4 real missions with industry context and rank badges,
 * linking directly to mission detail pages.
 */
export function FeaturedMissions({
  missions,
}: FeaturedMissionsProps): React.ReactElement | null {
  if (missions.length === 0) return null

  return (
    <section id="featured" className="py-32 relative">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6 relative z-10">
          <div>
            <div className="text-anime-cyan font-mono text-xs uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-anime-cyan" />
              Featured Operations
            </div>
            <h2 className="text-4xl md:text-5xl font-black italic text-white tracking-tighter">
              ACTIVE <span className="text-gray-600">CAMPAIGNS</span>
            </h2>
            <p className="mt-4 text-gray-400 max-w-lg border-l-2 border-gray-700 pl-4 text-sm font-mono">
              High-priority missions across the Databricks ecosystem. Each campaign simulates a real industry scenario.
            </p>
          </div>
          <Link
            href="/missions"
            className="flex items-center gap-2 text-anime-accent font-bold uppercase tracking-widest text-xs border border-anime-accent px-4 py-2 hover:bg-anime-accent hover:text-white transition-colors"
          >
            View All Missions <Target className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6 relative z-10">
          {missions.map((mission) => {
            const rankStyle = RANK_STYLE[mission.rank]
            const icon = INDUSTRY_ICONS[mission.industry] ?? "⚙️"

            return (
              <Link
                key={mission.id}
                href={`/missions/${mission.id}`}
                className={cn(
                  "group relative bg-anime-900 border border-white/10 p-1 transition-all duration-300",
                  rankStyle.border,
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
                    rankStyle.bg,
                  )}
                >
                  {/* Background icon */}
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-6xl">
                    {icon}
                  </div>

                  <div className="flex justify-between items-start mb-6">
                    <div className={cn("p-3 bg-white/5 border border-white/10 text-2xl")}>
                      {icon}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-black italic uppercase tracking-widest px-2 py-1 border border-current",
                        rankStyle.color,
                      )}
                    >
                      {mission.rank}-RANK
                    </span>
                  </div>

                  <div className="mb-4">
                    <div
                      className={cn(
                        "text-[10px] font-mono uppercase tracking-widest mb-1 opacity-80",
                        rankStyle.color,
                      )}
                    >
                      {mission.industry}
                    </div>
                    <h3 className="text-2xl font-bold italic text-white group-hover:translate-x-2 transition-transform duration-300">
                      {mission.title}
                    </h3>
                  </div>

                  <p className="text-gray-400 text-sm leading-relaxed mb-6 font-mono border-t border-white/5 pt-4">
                    {mission.subtitle}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
                      <span>{mission.estimatedMinutes} min</span>
                      <span className="text-anime-cyan">+{mission.xpReward} XP</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white group-hover:text-anime-cyan transition-colors">
                      <div className="w-4 h-px bg-current" />
                      Deploy
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
