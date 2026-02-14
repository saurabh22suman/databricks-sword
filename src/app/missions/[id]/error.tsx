"use client"

import { useEffect } from "react"

/**
 * Error boundary for individual mission pages.
 * Catches errors during mission loading, stage rendering, or data fetching.
 */
export default function MissionDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}): React.ReactElement {
  useEffect(() => {
    console.error("Mission detail error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-anime-950 cyber-grid flex items-center justify-center">
      <div className="grain-overlay fixed inset-0 pointer-events-none" />

      <div className="relative z-10 text-center max-w-md px-4">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-anime-accent/20 border-2 border-anime-accent flex items-center justify-center">
          <svg className="w-10 h-10 text-anime-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h2 className="font-heading text-2xl font-bold text-anime-accent mb-2">
          Mission Failed
        </h2>
        <p className="text-anime-400 mb-2 text-sm">
          {error.message || "Could not load this mission. The data may be corrupted or unavailable."}
        </p>
        {error.digest && (
          <p className="text-anime-700 text-xs font-mono mb-6">Digest: {error.digest}</p>
        )}

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 rounded bg-anime-cyan text-anime-950 font-heading font-bold hover:bg-anime-cyan/90 transition-colors"
          >
            Retry Mission
          </button>
          <a
            href="/missions"
            className="px-6 py-3 rounded border border-anime-700 text-anime-300 font-heading hover:bg-anime-800 transition-colors"
          >
            Back to Missions
          </a>
        </div>
      </div>
    </div>
  )
}
