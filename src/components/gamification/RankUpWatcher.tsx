"use client"

import { useEffect, useRef, useState } from "react"
import { RANKS, getRankForXp } from "@/lib/gamification"
import { onXpEvent } from "@/lib/gamification/xpEventBus"
import type { Rank } from "@/lib/gamification/types"
import { loadSandbox } from "@/lib/sandbox"
import { RankUpCelebration } from "./RankUpCelebration"

interface CelebrationState {
  previousRank: Rank
  newRank: Rank
}

/**
 * RankUpWatcher Component
 *
 * Subscribes to XP events and triggers the RankUpCelebration
 * when the user's rank increases.
 */
export function RankUpWatcher(): React.ReactElement | null {
  const [celebration, setCelebration] = useState<CelebrationState | null>(null)

  // Track rank and XP in refs (not state) to avoid re-renders on every event
  const previousRankRef = useRef<Rank>(RANKS[0])
  const totalXpRef = useRef<number>(0)

  useEffect(() => {
    // Initialize from sandbox on mount
    const sandbox = loadSandbox()
    if (sandbox) {
      totalXpRef.current = sandbox.userStats.totalXp
      previousRankRef.current = getRankForXp(sandbox.userStats.totalXp)
    } else {
      // Default to Cadet (first rank) if no sandbox
      totalXpRef.current = 0
      previousRankRef.current = RANKS[0]
    }

    // Subscribe to XP events
    const unsubscribe = onXpEvent((event) => {
      totalXpRef.current += event.amount
      const newRank = getRankForXp(totalXpRef.current)

      if (newRank.id !== previousRankRef.current.id) {
        const prevRank = previousRankRef.current
        previousRankRef.current = newRank
        setCelebration({ previousRank: prevRank, newRank })
      }
    })

    return unsubscribe
  }, [])

  if (!celebration) {
    return null
  }

  return (
    <RankUpCelebration
      newRank={celebration.newRank}
      previousRank={celebration.previousRank}
      showAnimation
      autoDismiss={4000}
      onDismiss={() => setCelebration(null)}
    />
  )
}