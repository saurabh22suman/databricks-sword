"use client"

import { loadSandbox } from "@/lib/sandbox"
import { getStreakMultiplier } from "@/lib/gamification/streaks"
import { cn } from "@/lib/utils"
import { Zap } from "lucide-react"
import { useEffect, useState } from "react"

const SEEN_KEY = "dbsword:daily-bonus-seen"

/**
 * StreakDailyBonus
 *
 * Shown at the top of the page when the learner visits on a day
 * where their active streak earns them a login bonus.
 * Displays the streak multiplier and XP amount.
 */
export function StreakDailyBonus(): React.ReactElement | null {
  const [visible, setVisible] = useState(false)
  const [streak, setStreak] = useState(0)
  const [multiplier, setMultiplier] = useState(1)

  useEffect(() => {
    const seen = sessionStorage.getItem(SEEN_KEY)
    if (seen) return

    const sandbox = loadSandbox()
    if (!sandbox) return

    const today = new Date().toISOString().split("T")[0]
    const lastActive = sandbox.streakData.lastActiveDate

    // Only show if last active is today (already earned) or yesterday (active streak)
    if (!lastActive) return
    if (lastActive !== today) return

    const currentStreak = sandbox.streakData.currentStreak
    if (currentStreak <= 0) return

    const mult = getStreakMultiplier(currentStreak)
    // Only show for multiplier >= 1.25 (3+ day streak)
    if (mult < 1.25) return

    sessionStorage.setItem(SEEN_KEY, today)
    setStreak(currentStreak)
    setMultiplier(mult)
    setVisible(true)

    // Auto-hide after 5s
    const timer = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return <></>

  return (
    <div
      className={cn(
        "fixed top-20 left-1/2 z-40",
        "translate-x-[-50%]",
        "flex items-center gap-3 px-5 py-2.5",
        "bg-anime-green/10 border border-anime-green/30",
        "rounded-b-lg shadow-[0_0_16px_rgba(0,255,102,0.15)]",
        "animate-slide-in",
      )}
    >
      <Zap className="w-4 h-4 text-anime-green flex-shrink-0 animate-pulse" />
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-anime-green">
          {multiplier}x Streak Bonus Active!
        </span>
        <span className="text-xs text-gray-400">|</span>
        <span className="text-xs text-gray-400">
          {streak}-day streak burning bright
        </span>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="text-anime-green/50 hover:text-anime-green transition-colors"
        aria-label="Dismiss daily bonus banner"
      >
        ×
      </button>
    </div>
  )
}