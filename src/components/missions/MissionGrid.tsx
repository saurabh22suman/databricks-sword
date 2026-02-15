"use client"

import type { Mission } from "@/lib/missions"
import type { Track } from "@/lib/missions/tracks"
import { TRACKS, getAllTracks, getTrackForMission } from "@/lib/missions/tracks"
import { loadSandbox } from "@/lib/sandbox"
import type { SandboxData } from "@/lib/sandbox/types"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { MissionCard } from "./MissionCard"

export type MissionGridProps = {
  /** All missions to display */
  missions: Mission[]
  /** Current user XP for lock state (server-side fallback) */
  userXp?: number
}

/**
 * Client component for rendering the interactive mission grid.
 * Supports filtering by track (DE / ML / BI / All) and groups by rank within each track.
 * Loads actual user XP from browser sandbox on mount.
 */
export function MissionGrid({ missions, userXp = 0 }: MissionGridProps): React.ReactElement {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<Track | "all">("all")
  const [resolvedXp, setResolvedXp] = useState(userXp)
  const [sandboxData, setSandboxData] = useState<SandboxData | null>(null)

  /** Load real XP and progress from browser sandbox on mount */
  useEffect(() => {
    const sandbox = loadSandbox()
    if (sandbox) {
      setResolvedXp(sandbox.userStats.totalXp)
      setSandboxData(sandbox)
    }
  }, [])

  const filteredMissions =
    activeFilter === "all"
      ? missions
      : missions.filter((m) => getTrackForMission(m.id) === activeFilter)

  /** Group filtered missions by track for display */
  const groupedByTrack = getAllTracks().reduce(
    (acc, track) => {
      const trackMissions = filteredMissions.filter(
        (m) => getTrackForMission(m.id) === track,
      )
      if (trackMissions.length > 0) {
        acc.push({ track, missions: trackMissions })
      }
      return acc
    },
    [] as Array<{ track: Track; missions: Mission[] }>,
  )

  return (
    <div className="space-y-10">
      {/* Track Filter Tabs */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => setActiveFilter("all")}
          className={cn(
            "cut-corner px-5 py-2.5 font-heading text-xs font-bold uppercase tracking-wider transition-all border-2",
            activeFilter === "all"
              ? "border-anime-cyan bg-anime-cyan/10 text-anime-cyan"
              : "border-anime-700 bg-anime-950 text-gray-500 hover:text-gray-300",
          )}
        >
          All Tracks
          <span className="ml-2 font-mono opacity-70">({missions.length})</span>
        </button>
        {getAllTracks().map((track) => {
          const info = TRACKS[track]
          const count = missions.filter(
            (m) => getTrackForMission(m.id) === track,
          ).length
          const isActive = activeFilter === track
          return (
            <button
              key={track}
              onClick={() => setActiveFilter(track)}
              className={cn(
                "cut-corner px-5 py-2.5 font-heading text-xs font-bold uppercase tracking-wider transition-all border-2",
                isActive
                  ? `${info.borderColor} ${info.bgColor} ${info.color}`
                  : "border-anime-700 bg-anime-950 text-gray-500 hover:text-gray-300",
              )}
            >
              {info.shortName}
              <span className="ml-2 font-mono opacity-70">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Mission Groups */}
      {groupedByTrack.map(({ track, missions: trackMissions }) => {
        const info = TRACKS[track]
        return (
          <section key={track} className="space-y-6">
            <div className="flex items-center gap-3">
              <h2
                className={cn(
                  "font-heading text-2xl font-bold uppercase tracking-wider",
                  info.color,
                )}
              >
                {info.name}
              </h2>
              <span className="font-mono text-xs text-gray-500">
                {trackMissions.length} mission{trackMissions.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trackMissions.map((mission) => {
                const missionProgress = sandboxData?.missionProgress[mission.id]
                const isCompleted = missionProgress?.completed ?? false
                return (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    userXp={resolvedXp}
                    completed={isCompleted}
                    onClick={() => router.push(`/missions/${mission.id}`)}
                  />
                )
              })}
            </div>
          </section>
        )
      })}

      {/* Empty state for filter */}
      {filteredMissions.length === 0 && (
        <div className="text-center py-12">
          <div className="w-32 h-32 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(0,255,255,0.2)]">
            <img
              src="/illustrations/empty-missions.png"
              alt="No missions found"
              className="w-full h-full object-contain opacity-70"
            />
          </div>
          <p className="text-gray-500 font-mono text-sm">
            No missions found for this track.
          </p>
        </div>
      )}
    </div>
  )
}
