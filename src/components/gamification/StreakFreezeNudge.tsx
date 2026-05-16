"use client"

import { loadSandbox } from "@/lib/sandbox"
import { getStreakMultiplier } from "@/lib/gamification/streaks"
import { cn } from "@/lib/utils"
import { Flame, X } from "lucide-react"
import { useEffect, useState } from "react"

const NUDGE_KEY = "dbsword:streak-nudge-seen"

/**
 * StreakFreezeNudge
 *
 * Shown on mount when the learner's streak is at risk of breaking.
 * Detects: last active was yesterday, no activity today yet, and has freezes available.
 * Only shown once per session (per day).
 */
export function StreakFreezeNudge(): React.ReactElement | null {
  const [visible, setVisible] = useState(false)
  const [freezes, setFreezes] = useState(0)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    // Only show once per day
    const seenToday = sessionStorage.getItem(NUDGE_KEY)
    if (seenToday) return

    const sandbox = loadSandbox()
    if (!sandbox) return

    const today = new Date().toISOString().split("T")[0]
    const lastActive = sandbox.streakData.lastActiveDate

    if (!lastActive) return

    const diffDays = Math.floor(
      (new Date(today).getTime() - new Date(lastActive).getTime()) /
        (1000 * 60 * 60 * 24),
    )

    // At risk: last active was yesterday (diffDays === 1 means streak is safe)
    // If last active was 2 days ago and no freeze used yet, nudge
    if (diffDays === 2 && sandbox.streakData.freezesAvailable > 0) {
      sessionStorage.setItem(NUDGE_KEY, today)
      setFreezes(sandbox.streakData.freezesAvailable)
      setStreak(sandbox.streakData.currentStreak)
      setVisible(true)
    }
  }, [])

  if (!visible) return <></>

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-50",
        "translate-x-[-50%]",
        "flex items-center gap-3 px-5 py-3",
        "bg-anime-900 border border-anime-yellow/50",
        "rounded-lg shadow-[0_0_20px_rgba(255,204,0,0.2)]",
        "animate-slide-in",
        "max-w-sm",
      )}
    >
      <Flame className="w-5 h-5 text-anime-yellow flex-shrink-0" />
      <div className="flex flex-col">
        <p className="text-sm font-bold text-anime-yellow">
          Your {streak}-day streak is about to break!
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          Come back today to save it — you have{" "}
          <span className="text-anime-yellow font-bold">
            {freezes} freeze{freezes !== 1 ? "s" : ""}
          </span>{" "}
          to protect it.
        </p>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="text-anime-700 hover:text-anime-yellow transition-colors ml-1 flex-shrink-0"
        aria-label="Dismiss streak nudge"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}