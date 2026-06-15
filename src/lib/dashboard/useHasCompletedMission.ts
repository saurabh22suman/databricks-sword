"use client"

import { loadSandbox } from "@/lib/sandbox"
import { useEffect, useState } from "react"

export function useHasCompletedMission(): boolean {
  const [hasCompleted, setHasCompleted] = useState(false)

  useEffect(() => {
    const sandbox = loadSandbox()
    if (!sandbox) {
      setHasCompleted(false)
      return
    }
    const completed = Object.values(sandbox.missionProgress).some(
      (mp) => mp.completed,
    )
    setHasCompleted(completed)
  }, [])

  return hasCompleted
}