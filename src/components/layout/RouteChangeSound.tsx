/**
 * @file RouteChangeSound.tsx
 * @description Plays a subtle navigation sound on route changes.
 * Mount once in the root layout — uses usePathname() to detect transitions.
 */

"use client"

import { playSound } from "@/lib/sound"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

/**
 * Invisible component that plays a navigation sound on route changes.
 * Skips the first render (initial page load) so only subsequent
 * navigations produce audio.
 */
export function RouteChangeSound(): null {
  const pathname = usePathname()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    playSound("navigate")
  }, [pathname])

  return null
}
