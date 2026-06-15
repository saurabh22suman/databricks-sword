"use client"

import { cn } from "@/lib/utils"
import { onXpEvent } from "@/lib/gamification/xpEventBus"
import type { XpEvent } from "@/lib/gamification/types"
import { useEffect, useRef, useState } from "react"

/**
 * XpFlyToBar
 *
 * Listens to the XP event bus. When XP is earned, renders an animated "+N XP" chip
 * that flies from center-screen upward toward the header and fades out.
 */

type FlyEntry = {
  id: string
  amount: number
}

const ANIM_DURATION = 900 // ms

export function XpFlyToBar(): React.ReactElement | null {
  const [entries, setEntries] = useState<FlyEntry[]>([])
  const counterRef = useRef(0)

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>()

    const unsubscribe = onXpEvent((event: XpEvent) => {
      if (event.amount <= 0) return

      const id = `fly-${++counterRef.current}`
      setEntries((prev) => [...prev, { id, amount: event.amount }])

      const timer = setTimeout(() => {
        timers.delete(timer)
        setEntries((prev) => prev.filter((e) => e.id !== id))
      }, ANIM_DURATION)
      timers.add(timer)
    })

    return () => {
      unsubscribe()
      // Clear any pending animation timers so we don't call setEntries
      // on an unmounted component if the user navigates away mid-animation.
      for (const timer of timers) {
        clearTimeout(timer)
      }
      timers.clear()
    }
  }, [])

  if (entries.length === 0) return <></>

  return (
    <>
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="fixed z-[9999] pointer-events-none flex items-center"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className={cn(
              "px-4 py-2 rounded-full font-mono font-bold",
              "bg-anime-accent text-white shadow-[0_0_20px_rgba(255,51,102,0.9)]",
              "animate-xp-fly-up",
            )}
            data-xp-fly
          >
            +{entry.amount} XP
          </div>
        </div>
      ))}
    </>
  )
}