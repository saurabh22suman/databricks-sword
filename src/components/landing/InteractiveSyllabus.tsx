"use client"

import type { Mission } from "@/lib/missions"
import type { Track } from "@/lib/missions/tracks"
import { TRACKS, getAllTracks, getTrackForMission } from "@/lib/missions/tracks"
import { cn } from "@/lib/utils"
import { ArrowRight, ChevronRight } from "lucide-react"
import { useState } from "react"

/** Rank badge colors matching anime theme */
const RANK_COLORS = {
  B: {
    bg: "bg-anime-green/10",
    text: "text-anime-green",
    border: "border-anime-green",
  },
  A: {
    bg: "bg-anime-yellow/10",
    text: "text-anime-yellow",
    border: "border-anime-yellow",
  },
  S: {
    bg: "bg-anime-accent/10",
    text: "text-anime-accent",
    border: "border-anime-accent",
  },
}

type InteractiveSyllabusProps = {
  /** All available missions to group by track */
  missions: Mission[]
}

/**
 * Interactive syllabus showing real missions grouped by learning track.
 * Users can switch between Data Engineering, Machine Learning, and BI & Analytics tracks.
 * Displays a prerequisite chain as a visual ladder within each track.
 */
export function InteractiveSyllabus({
  missions,
}: InteractiveSyllabusProps): React.ReactElement {
  const [activeTrack, setActiveTrack] = useState<Track>("de")

  const trackInfo = TRACKS[activeTrack]

  /** Group missions by track, sorted by rank (B → A → S) */
  const missionsByTrack = getAllTracks().reduce(
    (acc, track) => {
      const trackMissions = missions
        .filter((m) => getTrackForMission(m.id) === track)
        .sort((a, b) => {
          const order = { B: 1, A: 2, S: 3 }
          return order[a.rank] - order[b.rank]
        })
      acc[track] = trackMissions
      return acc
    },
    {} as Record<Track, Mission[]>,
  )

  const allTrackMissions = missionsByTrack[activeTrack] ?? []

  /** Pick one representative mission per rank tier (B, A, S) for preview */
  const activeMissions = (["B", "A", "S"] as const)
    .map((rank) => allTrackMissions.find((m) => m.rank === rank))
    .filter((m): m is Mission => m !== undefined)

  const totalInTrack = allTrackMissions.length
  const hasMore = totalInTrack > activeMissions.length

  return (
    <div id="syllabus" className="mx-auto w-full max-w-5xl px-6 py-20">
      <div className="cut-corner relative overflow-hidden border border-anime-cyan/30 bg-anime-900/50 p-8 shadow-neon-cyan transition-colors duration-300 md:p-12">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-anime-cyan/5 opacity-60 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-64 w-64 rounded-full bg-anime-purple/5 opacity-60 blur-3xl" />

        {/* Cyber grid overlay */}
        <div className="cyber-grid absolute inset-0 opacity-10 pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 mb-10 text-center">
          <div className="mb-4 inline-block border border-anime-cyan bg-anime-cyan/10 px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-anime-cyan">
            Learning Tracks
          </div>
          <h2 className="mb-4 font-heading text-4xl font-black uppercase italic tracking-tighter text-white">
            Choose Your <span className="text-anime-cyan">Mission Path</span>
          </h2>
          <p className="mx-auto max-w-lg text-lg text-gray-400">
            Three specialized tracks to master the Databricks ecosystem.
            Follow the prerequisite chain from B-rank foundations to S-rank mastery.
          </p>
        </div>

        {/* Track Tabs */}
        <div className="relative z-10 flex flex-col sm:flex-row gap-3 mb-10 justify-center">
          {getAllTracks().map((track) => {
            const info = TRACKS[track]
            const isActive = track === activeTrack
            const count = (missionsByTrack[track] ?? []).length
            return (
              <button
                key={track}
                onClick={() => setActiveTrack(track)}
                className={cn(
                  "cut-corner px-6 py-3 font-heading text-sm font-bold uppercase tracking-wider transition-all",
                  "border-2",
                  isActive
                    ? `${info.borderColor} ${info.bgColor} ${info.color}`
                    : "border-anime-700 bg-anime-950 text-gray-500 hover:border-anime-700 hover:text-gray-300",
                )}
              >
                {info.name}
                <span className="ml-2 font-mono text-xs opacity-70">
                  ({count})
                </span>
              </button>
            )
          })}
        </div>

        {/* Track Description */}
        <div className="relative z-10 mb-8 text-center">
          <p className={cn("font-mono text-sm", trackInfo.color)}>
            {trackInfo.description}
          </p>
        </div>

        {/* Mission Chain */}
        {activeMissions.length > 0 ? (
          <div className="relative z-10 space-y-0">
            {activeMissions.map((mission, idx) => {
              const rankColor = RANK_COLORS[mission.rank]
              const isLast = idx === activeMissions.length - 1
              return (
                <div key={mission.id}>
                  {/* Mission Card */}
                  <div className="cut-corner group relative border-2 border-anime-700 bg-anime-900 p-5 transition-all hover:border-anime-cyan hover:shadow-neon-cyan">
                    <div className="flex items-start gap-4">
                      {/* Step Number */}
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center cut-corner border-2 font-mono text-lg font-bold",
                        rankColor.border,
                        rankColor.bg,
                        rankColor.text,
                      )}>
                        {idx + 1}
                      </div>

                      {/* Mission Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <span
                            className={cn(
                              "border px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-wider",
                              rankColor.border,
                              rankColor.bg,
                              rankColor.text,
                            )}
                          >
                            {mission.rank}-RANK
                          </span>
                          <span className="font-mono text-xs text-gray-500">
                            {mission.estimatedMinutes} min
                          </span>
                          <span className="font-mono text-xs text-anime-cyan">
                            +{mission.xpReward} XP
                          </span>
                        </div>
                        <h4 className="font-heading text-lg font-bold uppercase italic text-white transition-colors group-hover:text-anime-cyan">
                          {mission.title}
                        </h4>
                        <p className="text-sm text-gray-400 line-clamp-1">
                          {mission.subtitle}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Connector Arrow */}
                  {!isLast && (
                    <div className="flex justify-center py-1">
                      <ChevronRight className="h-5 w-5 rotate-90 text-anime-cyan/50" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="relative z-10 text-center py-12">
            <p className="text-gray-500 font-mono text-sm">
              No missions available for this track yet.
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="relative z-10 mt-10 flex flex-col items-center gap-4">
          {hasMore && (
            <a
              href="/missions"
              className="font-mono text-sm text-anime-cyan hover:text-white transition-colors group inline-flex items-center gap-1"
            >
              See all {totalInTrack} missions in this track
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </a>
          )}
          <a
            href="/missions"
            className="group mx-auto inline-flex items-center gap-2 cut-corner border-2 border-anime-accent bg-anime-accent px-8 py-4 font-bold uppercase tracking-wider text-white shadow-neon-red transition-all hover:bg-red-600 hover:shadow-[0_0_40px_rgba(255,0,60,0.8)] active:scale-95"
          >
            <span>Deploy to Missions</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </div>
  )
}
