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
          <div className="text-center mb-8">
            <h2 className="font-heading text-3xl font-black text-anime-cyan tracking-wider">
              RANK PROGRESSION
            </h2>
            <p className="text-anime-500 text-sm mt-2 font-mono tracking-wide">
              // advance through the ranks
            </p>
          </div>

          {/* Horizontal progression track */}
          <div className="relative overflow-x-auto pb-4 px-4">
            <div className="flex items-start gap-0 min-w-max mx-auto justify-center px-2">
              {RANKS.map((r, idx) => {
                const isAchieved = r.minXp <= totalXp
                const isCurrent = r.id === rank.id
                const isNext = idx > 0 && RANKS[idx - 1].id === rank.id

                return (
                  <div key={r.id} className="flex items-start">
                    {/* Connector line (not for first rank) */}
                    {idx > 0 && (
                      <div className="flex items-center pt-8 -mx-1">
                        <div
                          className={cn(
                            "h-0.5 w-4 sm:w-8 lg:w-10 transition-all duration-500",
                            isAchieved
                              ? "bg-gradient-to-r from-anime-cyan to-anime-cyan shadow-[0_0_8px_rgba(0,255,255,0.5)]"
                              : isNext
                                ? "bg-gradient-to-r from-anime-cyan/60 to-anime-700/40"
                                : "bg-anime-700/30",
                          )}
                        />
                      </div>
                    )}

                    {/* Rank node */}
                    <div
                      className={cn(
                        "flex flex-col items-center text-center w-18 sm:w-22 lg:w-24 group transition-all duration-500",
                        !isAchieved && !isNext && "opacity-35",
                      )}
                    >
                      {/* Badge container */}
                      <div
                        className={cn(
                          "relative rounded-full p-1 transition-all duration-500",
                          isCurrent && "ring-2 ring-anime-cyan ring-offset-2 ring-offset-anime-950 animate-pulse-fast",
                          isAchieved && !isCurrent && "ring-1 ring-anime-cyan/30",
                          !isAchieved && "ring-1 ring-anime-700/20",
                        )}
                      >
                        {/* Glow backdrop for achieved ranks */}
                        {isAchieved && (
                          <div
                            className={cn(
                              "absolute inset-0 rounded-full blur-md -z-10",
                              isCurrent
                                ? "bg-anime-cyan/30"
                                : "bg-anime-cyan/10",
                            )}
                          />
                        )}

                        <div
                          className={cn(
                            "relative overflow-hidden rounded-full border-2 transition-all duration-300",
                            "group-hover:scale-110",
                            isCurrent
                              ? "border-anime-cyan bg-anime-800 shadow-[0_0_20px_rgba(0,255,255,0.4)]"
                              : isAchieved
                                ? "border-anime-cyan/40 bg-anime-900"
                                : "border-anime-700/30 bg-anime-950 grayscale",
                          )}
                          style={{ width: "48px", height: "48px" }}
                        >
                          <img
                            src={r.badge.src}
                            alt={r.badge.alt}
                            className="w-full h-full object-contain"
                          />
                        </div>

                        {/* Current rank indicator dot */}
                        {isCurrent && (
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-anime-cyan shadow-[0_0_10px_rgba(0,255,255,0.8)] border-2 border-anime-950" />
                        )}

                        {/* Lock icon for unachieved */}
                        {!isAchieved && (
                          <div className="absolute inset-0 rounded-full flex items-center justify-center bg-anime-950/60">
                            <Lock className="w-4 h-4 text-anime-700" />
                          </div>
                        )}
                      </div>

                      {/* Rank title */}
                      <div
                        className={cn(
                          "mt-3 text-xs font-bold uppercase tracking-wider transition-colors duration-300",
                          isCurrent
                            ? "text-anime-cyan"
                            : isAchieved
                              ? "text-anime-400"
                              : "text-anime-700",
                        )}
                      >
                        {r.title}
                      </div>

                      {/* XP threshold */}
                      <div
                        className={cn(
                          "text-[10px] font-mono mt-0.5 transition-colors duration-300",
                          isCurrent
                            ? "text-anime-cyan/70"
                            : isAchieved
                              ? "text-anime-500"
                              : "text-anime-700/60",
                        )}
                      >
                        {r.minXp.toLocaleString()} XP
                      </div>

                      {/* Current rank label */}
                      {isCurrent && (
                        <div className="mt-2 px-2 py-0.5 rounded-full bg-anime-cyan/10 border border-anime-cyan/30">
                          <span className="text-[9px] font-mono text-anime-cyan uppercase tracking-widest">
                            Current
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* XP progress bar spanning the full width */}
            <div className="mt-8 mx-auto max-w-2xl">
              <div className="flex items-center justify-between text-[10px] font-mono text-anime-500 mb-1">
                <span>0 XP</span>
                <span className="text-anime-cyan font-bold">
                  {totalXp.toLocaleString()} XP
                </span>
                <span>25,000 XP</span>
              </div>
              <div className="h-1.5 bg-anime-800 rounded-full overflow-hidden border border-anime-700/30">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-anime-cyan via-anime-purple to-anime-accent transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,255,255,0.4)]"
                  style={{
                    width: `${Math.min((totalXp / 25000) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
