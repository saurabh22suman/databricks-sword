/**
 * @file ProfilePageClient.tsx
 * @description Client component that loads user profile data from the browser
 * sandbox (localStorage) and renders the gamification dashboard.
 */

"use client"

import { AchievementGrid, RankBadge, StreakCalendar, StreakFlame, XpBar } from "@/components/gamification"
import { SkillDecayIndicator } from "@/components/srs/SkillDecayIndicator"
import { ACHIEVEMENTS, getRankForXp } from "@/lib/gamification"
import { loadSandbox } from "@/lib/sandbox"
import type { MissionProgress, SandboxData } from "@/lib/sandbox/types"
import type { SkillDecay } from "@/lib/srs"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

/** Derived completed mission info for display */
type CompletedMission = {
  id: string
  title: string
  completedAt: string
  xpEarned: number
}

/** Streak calendar day entry */
type StreakDay = {
  date: string
  hasActivity: boolean
  isFrozen: boolean
}

/**
 * Derive completed missions list from sandbox missionProgress.
 * Formats mission IDs into readable titles.
 */
function deriveCompletedMissions(
  missionProgress: Record<string, MissionProgress>,
): CompletedMission[] {
  return Object.entries(missionProgress)
    .filter(([, progress]) => progress.completed)
    .map(([id, progress]) => ({
      id,
      title: id
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      completedAt: progress.completedAt ?? new Date().toISOString(),
      xpEarned: progress.totalXpEarned,
    }))
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
}

/**
 * Derive skill decay data from completed missions.
 * Simulates skill decay based on time since mission completion.
 */
function deriveSkillDecay(sandbox: SandboxData): SkillDecay[] {
  const skillDecayData: SkillDecay[] = []
  const now = new Date()

  for (const [missionId, progress] of Object.entries(sandbox.missionProgress)) {
    if (!progress.completed || !progress.completedAt) continue

    const completedDate = new Date(progress.completedAt)
    const daysSince = Math.floor(
      (now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Calculate retention estimate based on days since practice
    // Using simplified decay curve: retention = 100 * e^(-days/30)
    const retentionEstimate = Math.max(0, Math.min(100, 
      Math.round(100 * Math.exp(-daysSince / 30))
    ))

    // Determine decay level
    let decayLevel: SkillDecay["decayLevel"]
    let recommendedAction: SkillDecay["recommendedAction"]

    if (retentionEstimate >= 80) {
      decayLevel = "none"
      recommendedAction = "none"
    } else if (retentionEstimate >= 60) {
      decayLevel = "mild"
      recommendedAction = "review"
    } else if (retentionEstimate >= 40) {
      decayLevel = "moderate"
      recommendedAction = "practice"
    } else {
      decayLevel = "severe"
      recommendedAction = "relearn"
    }

    const skillName = missionId
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")

    skillDecayData.push({
      skillId: missionId,
      userId: "local-user",
      skillName,
      missionIds: [missionId],
      lastPracticed: progress.completedAt,
      daysSinceLastPractice: daysSince,
      retentionEstimate,
      decayLevel,
      recommendedAction,
      relatedCards: Object.keys(progress.stageProgress).length,
      cardsDue: decayLevel !== "none" ? 1 : 0,
    })
  }

  // Sort by urgency (most severe first)
  const severityOrder: Record<SkillDecay["decayLevel"], number> = {
    severe: 0,
    moderate: 1,
    mild: 2,
    none: 3,
  }
  return skillDecayData.sort(
    (a, b) => severityOrder[a.decayLevel] - severityOrder[b.decayLevel]
  )
}

/**
 * Derive streak calendar data from sandbox.
 * Generates entries for the current month based on the lastActiveDate and streak length.
 */
function deriveStreakCalendar(sandbox: SandboxData): StreakDay[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Build a set of active dates from missionProgress completedAt timestamps
  const activeDates = new Set<string>()

  for (const progress of Object.values(sandbox.missionProgress)) {
    if (progress.completedAt) {
      activeDates.add(progress.completedAt.slice(0, 10))
    }
    for (const stage of Object.values(progress.stageProgress)) {
      if (stage.completedAt) {
        activeDates.add(stage.completedAt.slice(0, 10))
      }
    }
  }
  for (const result of Object.values(sandbox.challengeResults)) {
    if (result.completedAt) {
      activeDates.add(result.completedAt.slice(0, 10))
    }
  }

  // Also mark the last active date if present
  if (sandbox.streakData.lastActiveDate) {
    activeDates.add(sandbox.streakData.lastActiveDate.slice(0, 10))
  }

  const days: StreakDay[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    days.push({
      date: dateStr,
      hasActivity: activeDates.has(dateStr),
      isFrozen: false, // Could be derived from freeze data if tracked per-day
    })
  }

  return days
}

/**
 * Profile page client component.
 * Loads real data from the browser sandbox instead of hardcoded mock data.
 */
export default function ProfilePageClient(): React.ReactElement {
  const router = useRouter()
  const [sandbox, setSandbox] = useState<SandboxData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [skillDecayFilter, setSkillDecayFilter] = useState<
    "none" | "mild" | "moderate" | "severe" | undefined
  >(undefined)

  useEffect(() => {
    const data = loadSandbox()
    setSandbox(data)
    setLoaded(true)
  }, [])

  // Empty state defaults
  const totalXp = sandbox?.userStats.totalXp ?? 0
  const currentStreak = sandbox?.streakData.currentStreak ?? 0
  const longestStreak = sandbox?.streakData.longestStreak ?? 0
  const freezesAvailable = sandbox?.streakData.freezesAvailable ?? 2
  const unlockedAchievements = sandbox?.achievements ?? []
  const completedMissions = sandbox
    ? deriveCompletedMissions(sandbox.missionProgress)
    : []
  const streakData = sandbox ? deriveStreakCalendar(sandbox) : []
  const skillDecayData = sandbox ? deriveSkillDecay(sandbox) : []
  const currentRank = getRankForXp(totalXp)

  const now = new Date()

  // Handlers for SkillDecayIndicator
  const handleReviewSkill = (skillId: string): void => {
    router.push(`/review?skill=${skillId}`)
  }

  const handleViewDetails = (skillId: string): void => {
    router.push(`/missions/${skillId}`)
  }

  const handleRefreshDecay = (): void => {
    const data = loadSandbox()
    setSandbox(data)
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-anime-950 py-8 flex items-center justify-center">
        <div className="text-anime-cyan font-heading text-xl animate-pulse">
          Loading profile...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-anime-950 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-4xl font-black text-anime-cyan mb-2">
            Mission Control
          </h1>
          <p className="text-anime-purple">
            Your journey through the Databricks universe
          </p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Rank & XP Card */}
          <div className="lg:col-span-1 bg-anime-900 border border-anime-700 rounded-lg p-6 cut-corner">
            <div className="text-center mb-4">
              <RankBadge rank={currentRank} size={64} showDescription />
            </div>

            <div className="space-y-4">
              <XpBar currentXp={totalXp} showAnimation />

              <div className="text-center">
                <div className="text-2xl font-bold text-anime-cyan">
                  {totalXp.toLocaleString()} XP
                </div>
                <div className="text-sm text-anime-purple">Total Experience</div>
              </div>
            </div>
          </div>

          {/* Streak Stats Card */}
          <div className="lg:col-span-1 bg-anime-900 border border-anime-700 rounded-lg p-6 cut-corner">
            <h2 className="text-lg font-bold text-anime-cyan mb-4 text-center">
              Streak Status
            </h2>

            <div className="text-center mb-4">
              <StreakFlame streakDays={currentStreak} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-center text-sm">
              <div>
                <div className="text-xl font-bold text-anime-yellow">
                  {longestStreak}
                </div>
                <div className="text-anime-purple">Longest</div>
              </div>
              <div>
                <div className="text-xl font-bold text-anime-purple">
                  {freezesAvailable}
                </div>
                <div className="text-anime-purple">Freezes</div>
              </div>
            </div>
          </div>

          {/* Mission Progress Card */}
          <div className="lg:col-span-1 bg-anime-900 border border-anime-700 rounded-lg p-6 cut-corner">
            <h2 className="text-lg font-bold text-anime-cyan mb-4 text-center">
              Mission Progress
            </h2>

            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-anime-green">
                  {completedMissions.length}
                </div>
                <div className="text-sm text-anime-purple">Missions Complete</div>
              </div>

              <div className="text-center">
                <div className="text-lg font-bold text-anime-yellow">
                  {unlockedAchievements.length}/{ACHIEVEMENTS.length}
                </div>
                <div className="text-sm text-anime-purple">Achievements</div>
              </div>

              <div className="w-full bg-anime-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-anime-cyan to-anime-purple h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(completedMissions.length / 20) * 100}%` }}
                />
              </div>
              <div className="text-center text-xs text-anime-purple">
                {Math.round((completedMissions.length / 20) * 100)}% Campaign Complete
              </div>
            </div>
          </div>
        </div>

        {/* Achievement Collection */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-anime-cyan mb-4 text-center">
            Achievement Collection
          </h2>
          <AchievementGrid
            achievements={[...ACHIEVEMENTS]}
            unlockedAchievements={unlockedAchievements}
            showSummary
            className="bg-anime-900 border border-anime-700 rounded-lg p-6 cut-corner"
          />
        </div>

        {/* Activity Calendar & Recent Missions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Streak Calendar */}
          <div>
            <h2 className="text-xl font-bold text-anime-cyan mb-4 text-center">
              Activity Calendar
            </h2>
            <StreakCalendar
              month={now.getMonth() + 1}
              year={now.getFullYear()}
              streakData={streakData}
              className="cut-corner"
            />
          </div>

          {/* Recent Missions */}
          <div>
            <h2 className="text-xl font-bold text-anime-cyan mb-4 text-center">
              Recent Missions
            </h2>
            <div className="bg-anime-900 border border-anime-700 rounded-lg p-6 cut-corner space-y-3">
              {completedMissions.length === 0 ? (
                <div className="text-center text-anime-purple py-8">
                  <p className="text-lg mb-2">No missions completed yet</p>
                  <p className="text-sm">Start your first mission to see progress here!</p>
                </div>
              ) : (
                completedMissions.slice(0, 5).map((mission, index) => (
                  <div
                    key={mission.id}
                    className="flex items-center justify-between p-3 bg-anime-800 border border-anime-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-bold text-anime-cyan text-sm">
                        {mission.title}
                      </div>
                      <div className="text-xs text-anime-purple">
                        Completed {new Date(mission.completedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-anime-yellow">
                        +{mission.xpEarned} XP
                      </div>
                      <div className="text-xs text-anime-purple">#{index + 1}</div>
                    </div>
                  </div>
                ))
              )}

              {completedMissions.length > 5 && (
                <div className="text-center pt-2">
                  <a
                    href="/missions"
                    className="text-sm text-anime-purple hover:text-anime-cyan transition-colors"
                  >
                    View All Missions →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Skill Decay Indicator */}
        {skillDecayData.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-anime-cyan mb-4 text-center">
              Skill Retention
            </h2>
            <SkillDecayIndicator
              skillDecayData={skillDecayData}
              onReviewSkill={handleReviewSkill}
              onViewDetails={handleViewDetails}
              onRefresh={handleRefreshDecay}
              filterLevel={skillDecayFilter}
              onFilterChange={setSkillDecayFilter}
            />
            <div className="flex gap-2 justify-center mt-4">
              <button
                onClick={() => setSkillDecayFilter(undefined)}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  skillDecayFilter === undefined
                    ? "bg-anime-cyan text-anime-950"
                    : "bg-anime-800 text-anime-purple hover:text-anime-cyan"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSkillDecayFilter("severe")}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  skillDecayFilter === "severe"
                    ? "bg-anime-accent text-anime-950"
                    : "bg-anime-800 text-anime-purple hover:text-anime-accent"
                }`}
              >
                Severe
              </button>
              <button
                onClick={() => setSkillDecayFilter("moderate")}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  skillDecayFilter === "moderate"
                    ? "bg-anime-yellow text-anime-950"
                    : "bg-anime-800 text-anime-purple hover:text-anime-yellow"
                }`}
              >
                Moderate
              </button>
              <button
                onClick={() => setSkillDecayFilter("mild")}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  skillDecayFilter === "mild"
                    ? "bg-anime-purple text-anime-950"
                    : "bg-anime-800 text-anime-purple hover:text-anime-purple"
                }`}
              >
                Mild
              </button>
            </div>
          </div>
        )}

        {/* Skills Need Refreshing - Fallback for users without completed missions */}
        {totalXp > 0 && skillDecayData.length === 0 && (
          <div className="mt-8">
            <div className="bg-anime-accent/20 border border-anime-accent rounded-lg p-4 cut-corner">
              <div className="flex items-center gap-3">
                <div className="text-2xl">⚠️</div>
                <div className="flex-1">
                  <div className="font-bold text-anime-accent">
                    Skills Need Refreshing
                  </div>
                  <div className="text-sm text-anime-purple">
                    Keep your knowledge sharp — visit the Memory Forge to review concepts.
                  </div>
                </div>
                <a
                  href="/review"
                  className="px-4 py-2 bg-anime-accent text-anime-950 rounded-lg font-bold text-sm hover:bg-anime-accent/80 transition-colors"
                >
                  Review
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
