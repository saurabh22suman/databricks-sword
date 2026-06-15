"use client"

/**
 * @file MissionStatusCard.tsx
 * @description Client wrapper that picks between ResumeMissionCard (when
 * the operator has an in-progress mission) and NoMissionEmptyState
 * (first-time visitors). Reads the sandbox on mount to avoid SSR/hydration
 * mismatch — renders nothing until the read completes.
 */
import { useEffect, useState } from "react"
import { loadSandbox } from "@/lib/sandbox"
import { findResumeMission, type ResumeMission } from "@/lib/dashboard/resume"
import { NoMissionEmptyState } from "./NoMissionEmptyState"
import { ResumeMissionCard } from "./ResumeMissionCard"

export function MissionStatusCard(): React.ReactElement | null {
  const [resume, setResume] = useState<ResumeMission | null | undefined>(undefined)

  useEffect(() => {
    setResume(findResumeMission(loadSandbox()))
  }, [])

  if (resume === undefined) return null
  if (resume === null) return <NoMissionEmptyState />
  return <ResumeMissionCard />
}
