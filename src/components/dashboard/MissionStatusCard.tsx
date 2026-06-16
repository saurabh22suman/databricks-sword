"use client"

/**
 * @file MissionStatusCard.tsx
 * @description Client wrapper that picks between ResumeMissionCard (when
 * the operator has an in-progress mission), AllMissionsCompleteState
 * (when every started mission is finished), and NoMissionEmptyState
 * (first-time visitors). Reads the sandbox on mount to avoid SSR/hydration
 * mismatch — renders nothing until the read completes.
 */
import { useEffect, useState } from "react"
import { loadSandbox } from "@/lib/sandbox"
import {
  findResumeMission,
  hasCompletedAllStartedMissions,
  type ResumeMission,
} from "@/lib/dashboard/resume"
import { AllMissionsCompleteState } from "./AllMissionsCompleteState"
import { NoMissionEmptyState } from "./NoMissionEmptyState"
import { ResumeMissionCard } from "./ResumeMissionCard"

export function MissionStatusCard(): React.ReactElement | null {
  const [resume, setResume] = useState<ResumeMission | null | undefined>(undefined)
  const [allComplete, setAllComplete] = useState(false)

  useEffect(() => {
    const sandbox = loadSandbox()
    setResume(findResumeMission(sandbox))
    setAllComplete(hasCompletedAllStartedMissions(sandbox))
  }, [])

  if (resume === undefined) return null
  if (resume !== null) return <ResumeMissionCard />
  if (allComplete) return <AllMissionsCompleteState />
  return <NoMissionEmptyState />
}
