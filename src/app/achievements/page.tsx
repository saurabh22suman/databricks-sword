"use client"

import { AchievementCard } from "@/components/gamification/AchievementCard"
import { RankBadge } from "@/components/gamification/RankBadge"
import type { Achievement } from "@/lib/gamification"
import { ACHIEVEMENTS, getRankForXp, RANKS } from "@/lib/gamification"
import { loadSandbox } from "@/lib/sandbox"
import { cn } from "@/lib/utils"
import { Award, Lock, Shield, Star, Trophy, Unlock } from "lucide-react"
import { useEffect, useState } from "react"

/**
 * Achievement category grouping for display.
 */
type AchievementCategory = {
  id: string
  label: string
  icon: React.ReactNode
  accentColor: string
  achievements: Achievement[]
}

/**
 * Groups achievements into display categories.
 */
function categorizeAchievements(): AchievementCategory[] {
  const categories: AchievementCategory[] = [
    {
      id: "first-steps",
      label: "First Steps",
      icon: <Star className="w-5 h-5" />,
      accentColor: "anime-cyan",
      achievements: ACHIEVEMENTS.filter((a) =>
        ["first-blood", "getting-started"].includes(a.id),
      ),
    },
    {
      id: "mission-mastery",
      label: "Mission Mastery",
      icon: <Shield className="w-5 h-5" />,
      accentColor: "anime-accent",
      achievements: ACHIEVEMENTS.filter((a) =>
        a.condition.type === "mission-complete" && !["first-blood"].includes(a.id),
      ),
    },
    {
      id: "challenge-mastery",
      label: "Challenge Mastery",
      icon: <Trophy className="w-5 h-5" />,
      accentColor: "anime-yellow",
      achievements: ACHIEVEMENTS.filter(
        (a) =>
          a.condition.type === "challenge-complete" &&
          !("category" in a.condition && a.condition.category) &&
          !["getting-started"].includes(a.id),
      ),
    },
    {
      id: "specialists",
      label: "Category Specialists",
      icon: <Award className="w-5 h-5" />,
      accentColor: "anime-purple",
      achievements: ACHIEVEMENTS.filter(
        (a) =>
          a.condition.type === "challenge-complete" &&
          "category" in a.condition &&
          a.condition.category,
      ),
    },
    {
      id: "streaks",
      label: "Consistency & Streaks",
      icon: <Star className="w-5 h-5" />,
      accentColor: "anime-green",
      achievements: ACHIEVEMENTS.filter((a) => a.condition.type === "streak"),
    },
    {
      id: "ranks",
      label: "Rank Progression",
      icon: <Shield className="w-5 h-5" />,
      accentColor: "anime-cyan",
      achievements: ACHIEVEMENTS.filter((a) => a.condition.type === "rank-reached"),
    },
    {
      id: "exploration",
      label: "Exploration",
      icon: <Trophy className="w-5 h-5" />,
      accentColor: "anime-purple",
      achievements: ACHIEVEMENTS.filter(
        (a) => a.condition.type === "side-quest-complete",
      ),
    },
  ]

  return categories.filter((c) => c.achievements.length > 0)
}

/**
 * Achievements page — full showcase of all achievements with unlock status.
 */
export default function AchievementsPage(): React.ReactElement {
  const [unlockedIds, setUnlockedIds] = useState<string[]>([])
  const [totalXp, setTotalXp] = useState(0)

  useEffect(() => {
    const sandbox = loadSandbox()
    if (sandbox) {
      setTotalXp(sandbox.userStats.totalXp ?? 0)
      setUnlockedIds(sandbox.achievements ?? [])
    }
  }, [])

  const categories = categorizeAchievements()
  const rank = getRankForXp(totalXp)
  const unlockedCount = unlockedIds.length
  const totalCount = ACHIEVEMENTS.length
  const completionPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0

  return (
    <div className="min-h-screen bg-anime-950 cyber-grid pt-20">
      <div className="grain-overlay fixed inset-0 pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-16 max-w-6xl">
        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-anime-700 rounded-full mb-4 text-xs tracking-widest uppercase text-anime-cyan font-mono">
            <Award className="w-3 h-3" />
            Achievement Vault
          </div>
          <h1 className="font-heading text-5xl font-black text-anime-100 mb-3">
            <span className="text-anime-yellow">ACHIEVEMENT</span> COLLECTION
          </h1>
          <p className="text-anime-400 text-lg max-w-xl mx-auto">
            Unlock medals through combat mastery, consistency, and exploration.
          </p>
        </div>

        {/* Summary Stats Bar */}
        <div className="mb-12 bg-anime-900 border border-anime-700 rounded-lg p-6 cut-corner">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="flex items-center justify-center mb-2">
                <Unlock className="w-5 h-5 text-anime-green" />
              </div>
              <div className="text-2xl font-black text-anime-green">{unlockedCount}</div>
              <div className="text-xs text-anime-400 font-mono uppercase tracking-wider">Unlocked</div>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <Lock className="w-5 h-5 text-anime-accent" />
              </div>
              <div className="text-2xl font-black text-anime-accent">{totalCount - unlockedCount}</div>
              <div className="text-xs text-anime-400 font-mono uppercase tracking-wider">Locked</div>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <Trophy className="w-5 h-5 text-anime-yellow" />
              </div>
              <div className="text-2xl font-black text-anime-yellow">{completionPct}%</div>
              <div className="text-xs text-anime-400 font-mono uppercase tracking-wider">Complete</div>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <RankBadge rank={rank} size={20} />
              </div>
              <div className="text-2xl font-black text-anime-cyan">{rank.title}</div>
              <div className="text-xs text-anime-400 font-mono uppercase tracking-wider">Current Rank</div>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-1 text-xs font-mono">
              <span className="text-anime-400">OVERALL PROGRESS</span>
              <span className="text-anime-yellow">{unlockedCount} / {totalCount}</span>
            </div>
            <div className="w-full h-2 bg-anime-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-anime-yellow via-anime-accent to-anime-purple rounded-full transition-all duration-1000"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Achievement Categories */}
        <div className="space-y-10">
          {categories.map((category) => {
            const catUnlocked = category.achievements.filter((a) =>
              unlockedIds.includes(a.id),
            ).length

            return (
              <section key={category.id}>
                {/* Category Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("text-" + category.accentColor)}>
                    {category.icon}
                  </div>
                  <h2 className="font-heading text-xl font-bold text-anime-100">
                    {category.label}
                  </h2>
                  <div className="ml-auto text-xs font-mono text-anime-400">
                    {catUnlocked}/{category.achievements.length} UNLOCKED
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-anime-700 via-anime-700/50 to-transparent mb-4" />

                {/* Achievement Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.achievements.map((achievement) => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      isUnlocked={unlockedIds.includes(achievement.id)}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>

        {/* Ranks Progression Footer */}
        <div className="mt-16">
          <div className="text-center mb-6">
            <h2 className="font-heading text-2xl font-bold text-anime-cyan">
              RANK PROGRESSION
            </h2>
            <p className="text-anime-400 text-sm mt-1">
              Earn XP to advance through the ranks
            </p>
          </div>

          <div className="bg-anime-900 border border-anime-700 rounded-lg p-6 cut-corner">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              {RANKS.map((r) => {
                const isCurrentOrPast = r.minXp <= totalXp
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "text-center p-3 rounded-lg border transition-all duration-300",
                      isCurrentOrPast
                        ? "border-anime-cyan/50 bg-anime-800"
                        : "border-anime-700/30 bg-anime-950/50 opacity-40",
                    )}
                  >
                    <div className="mb-2 flex justify-center">
                      <RankBadge rank={r} size={32} />
                    </div>
                    <div
                      className={cn(
                        "text-xs font-bold",
                        isCurrentOrPast ? "text-anime-cyan" : "text-anime-700",
                      )}
                    >
                      {r.title}
                    </div>
                    <div className="text-[10px] text-anime-400 font-mono mt-0.5">
                      {r.minXp.toLocaleString()} XP
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
