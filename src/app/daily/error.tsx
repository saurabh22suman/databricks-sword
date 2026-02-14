"use client"

import { useEffect } from "react"

/**
 * Error boundary for the Daily Forge page.
 */
export default function DailyError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}): React.ReactElement {
  useEffect(() => {
    console.error("Daily Forge error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-anime-950 cyber-grid flex items-center justify-center">
      <div className="grain-overlay fixed inset-0 pointer-events-none" />

      <div className="relative z-10 text-center max-w-md px-4">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-anime-green/20 border-2 border-anime-green flex items-center justify-center">
          <svg className="w-10 h-10 text-anime-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          </svg>
        </div>

        <h2 className="font-heading text-2xl font-bold text-anime-green mb-2">
          Forge Error
        </h2>
        <p className="text-anime-400 mb-2 text-sm">
          {error.message || "The Daily Forge encountered an error."}
        </p>
        {error.digest && (
          <p className="text-anime-700 text-xs font-mono mb-6">Digest: {error.digest}</p>
        )}

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 rounded bg-anime-cyan text-anime-950 font-heading font-bold hover:bg-anime-cyan/90 transition-colors"
          >
            Try Again
          </button>
          <a
            href="/"
            className="px-6 py-3 rounded border border-anime-700 text-anime-300 font-heading hover:bg-anime-800 transition-colors"
          >
            Return to Base
          </a>
        </div>
      </div>
    </div>
  )
}
