"use client"

import { useEffect, useState } from "react"
import { getStoredMotionPreference, setStoredMotionPreference, type MotionPreference } from "@/lib/a11y/motion"

const OPTIONS: { value: MotionPreference; label: string; description: string }[] = [
  { value: "system", label: "Match system", description: "Use my OS-level preference" },
  { value: "reduce", label: "Reduce motion", description: "Disable most animations" },
  { value: "no-preference", label: "Full motion", description: "Show all animations regardless of OS" },
]

/**
 * In-app override for the user's motion preference. Persists to localStorage
 * and applies `data-reduce-motion` on the `<html>` element so the global
 * @media rule in globals.css can also gate animations.
 */
export function ReducedMotionToggle() {
  const [pref, setPref] = useState<MotionPreference>("system")
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setPref(getStoredMotionPreference())
    setHydrated(true)
  }, [])

  const handleChange = (next: MotionPreference) => {
    setPref(next)
    setStoredMotionPreference(next)
    if (next === "reduce") {
      document.documentElement.setAttribute("data-reduce-motion", "true")
    } else if (next === "no-preference") {
      document.documentElement.setAttribute("data-reduce-motion", "false")
    } else {
      document.documentElement.removeAttribute("data-reduce-motion")
    }
  }

  return (
    <fieldset className="border border-anime-700/30 p-4 rounded">
      <legend className="text-anime-cyan px-2 text-sm font-mono">Motion preferences</legend>
      <div className="flex flex-col gap-2 mt-2" role="radiogroup" aria-label="Motion preference">
        {OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className="flex items-start gap-3 text-anime-300 cursor-pointer hover:bg-anime-800/30 p-2 rounded"
          >
            <input
              type="radio"
              name="motion-pref"
              value={opt.value}
              checked={hydrated && pref === opt.value}
              onChange={() => handleChange(opt.value)}
              className="mt-1 accent-anime-accent"
              aria-label={opt.label}
            />
            <span className="flex flex-col">
              <span className="font-mono text-anime-100">{opt.label}</span>
              <span className="text-xs text-anime-500 font-mono">{opt.description}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
