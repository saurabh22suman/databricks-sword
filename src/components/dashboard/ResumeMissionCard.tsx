"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { loadSandbox } from "@/lib/sandbox"
import { findResumeMission, type ResumeMission } from "@/lib/dashboard/resume"

/**
 * Prominent "Continue" card for the dashboard. Reads the sandbox on mount,
 * picks the most recently active in-progress mission, and renders a CTA that
 * takes the user directly to the next uncompleted stage. Renders nothing
 * until the sandbox has been loaded (avoids SSR/hydration mismatch) and
 * nothing at all when no mission is in progress.
 */
export function ResumeMissionCard() {
  const [resume, setResume] = useState<ResumeMission | null | undefined>(undefined)

  useEffect(() => {
    setResume(findResumeMission(loadSandbox()))
  }, [])

  if (resume === undefined) return null
  if (resume === null) return null

  const progressPct = Math.max(
    0,
    Math.min(100, Math.round((resume.completedStages / resume.totalStages) * 100)),
  )
  const stageUrl = `/missions/${resume.missionId}/stage/${resume.currentStageId}`
  const missionTitle = resume.missionId
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")

  return (
    <section
      aria-labelledby="resume-heading"
      data-testid="resume-mission-card"
      className="cut-corner border-2 border-anime-cyan/60 bg-anime-cyan/5 p-6 shadow-[0_0_20px_rgba(0,229,255,0.3)]"
    >
      <div className="text-anime-cyan text-xs font-mono mb-2 tracking-widest">
        [ CONTINUE MISSION ]
      </div>
      <h2
        id="resume-heading"
        className="text-2xl font-heading font-bold text-anime-100 mb-2"
      >
        {missionTitle}
      </h2>
      <div className="text-anime-400 text-sm font-mono mb-4">
        Stage {resume.completedStages + 1} of {resume.totalStages} • {progressPct}% complete
      </div>
      <div className="w-full bg-anime-950 h-2 mb-4" aria-hidden="true">
        <div className="h-full bg-anime-cyan" style={{ width: `${progressPct}%` }} />
      </div>
      <Link
        href={stageUrl}
        className="inline-block px-6 py-2 bg-anime-cyan text-anime-950 font-mono font-bold cut-corner hover:bg-anime-cyan/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anime-cyan"
      >
        Resume →
      </Link>
    </section>
  )
}
