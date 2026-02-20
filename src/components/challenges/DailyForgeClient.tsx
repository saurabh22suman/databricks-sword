/**
 * @file DailyForgeClient.tsx
 * @description Client wrapper for DailyForge with localStorage streak tracking
 */

"use client"

import { useSyncNow } from "@/components/auth"
import type { Challenge, ValidationResult } from "@/lib/challenges"
import { calculateDailyForgeXp } from "@/lib/gamification"
import { loadSandbox, saveSandbox } from "@/lib/sandbox"
import React, { useEffect, useState } from "react"
import { DailyForge } from "./DailyForge"

export type DailyForgeClientProps = {
  /** Today's challenge (loaded server-side) */
  challenge: Challenge
}

/** localStorage key for daily forge state */
const DAILY_FORGE_KEY = "databricks-sword-daily-forge"

type DailyForgeState = {
  lastCompletedDate: string | null
  streakCount: number
}

/**
 * Gets the current date as YYYY-MM-DD string.
 */
function getToday(): string {
  return new Date().toISOString().split("T")[0]
}

/**
 * Client wrapper that manages streak state in localStorage.
 */
export function DailyForgeClient({
  challenge,
}: DailyForgeClientProps): React.ReactElement {
  const { syncNow } = useSyncNow()
  const [state, setState] = useState<DailyForgeState>({
    lastCompletedDate: null,
    streakCount: 0,
  })
  const [loaded, setLoaded] = useState(false)

  // Load state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DAILY_FORGE_KEY)
      if (saved) {
        setState(JSON.parse(saved) as DailyForgeState)
      }
    } catch {
      // Ignore localStorage errors
    }
    setLoaded(true)
  }, [])

  const today = getToday()
  const completedToday = state.lastCompletedDate === today

  const handleComplete = (_result: ValidationResult): void => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split("T")[0]

    const newStreak =
      state.lastCompletedDate === yesterdayStr
        ? state.streakCount + 1
        : 1

    const newState: DailyForgeState = {
      lastCompletedDate: today,
      streakCount: newStreak,
    }

    setState(newState)

    try {
      localStorage.setItem(DAILY_FORGE_KEY, JSON.stringify(newState))
    } catch {
      // Ignore localStorage errors
    }

    // Award Daily Forge XP to sandbox
    try {
      const sandbox = loadSandbox()
      if (sandbox) {
        const { total } = calculateDailyForgeXp(newStreak)
        sandbox.userStats.totalXp += total
        sandbox.streakData.currentStreak = newStreak
        if (newStreak > sandbox.streakData.longestStreak) {
          sandbox.streakData.longestStreak = newStreak
        }
        sandbox.streakData.lastActiveDate = today
        saveSandbox(sandbox)
        // Immediately push XP to server so it isn't lost on logout
        void syncNow()
      }
    } catch {
      // Ignore sandbox errors
    }
  }

  if (!loaded) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-anime-800 rounded mb-6" />
        <div className="h-64 bg-anime-800 rounded" />
      </div>
    )
  }

  return (
    <DailyForge
      challenge={challenge}
      streakCount={state.streakCount}
      completedToday={completedToday}
      onComplete={handleComplete}
    />
  )
}
