"use client"

import { XpAward } from "@/components/gamification/XpAward"
import type { XpEvent } from "@/lib/gamification/types"
import { onXpEvent } from "@/lib/gamification/xpEventBus"
import { useEffect, useRef, useState } from "react"

/**
 * ToastContainer
 *
 * Listens to the XP event bus and renders floating toast notifications.
 * Each new XP event slides in from the top-right, auto-dismisses after 4s.
 * Queues up to 3 toasts so rapid XP awards don't stack infinitely.
 */

const DISMISS_MS = 4000
const MAX_VISIBLE = 3

type ToastEntry = {
  id: string
  event: XpEvent
}

export function ToastContainer(): React.ReactElement | null {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const counterRef = useRef(0)

  useEffect(() => {
    const unsubscribe = onXpEvent((event) => {
      const id = `toast-${++counterRef.current}`
      setToasts((prev) => {
        const next = [...prev, { id, event }]
        return next.slice(-MAX_VISIBLE)
      })

      // Auto-dismiss after 4s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, DISMISS_MS)
    })

    return unsubscribe
  }, [])

  if (toasts.length === 0) return <></>

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-72">
      {toasts.map((toast) => (
        <XpAward
          key={toast.id}
          xpEvent={toast.event}
          showAnimation
          onDismiss={() => {
            setToasts((prev) => prev.filter((t) => t.id !== toast.id))
          }}
          autoDismiss={DISMISS_MS}
        />
      ))}
    </div>
  )
}