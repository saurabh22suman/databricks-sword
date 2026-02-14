"use client"

import { useEffect } from "react"

/**
 * Error boundary for the review / spaced repetition page.
 */
export default function ReviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}): React.ReactElement {
  useEffect(() => {
    console.error("Review error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-anime-950 cyber-grid flex items-center justify-center">
      <div className="grain-overlay fixed inset-0 pointer-events-none" />

      <div className="relative z-10 text-center max-w-md px-4">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-anime-purple/20 border-2 border-anime-purple flex items-center justify-center">
          <svg className="w-10 h-10 text-anime-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>

        <h2 className="font-heading text-2xl font-bold text-anime-purple mb-2">
          Review Error
        </h2>
        <p className="text-anime-400 mb-2 text-sm">
          {error.message || "Something went wrong loading the review session."}
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
