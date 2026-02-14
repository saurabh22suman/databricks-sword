"use client"

import { useEffect } from "react"

/**
 * Error boundary for the user profile page.
 */
export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}): React.ReactElement {
  useEffect(() => {
    console.error("Profile error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-anime-950 cyber-grid flex items-center justify-center">
      <div className="grain-overlay fixed inset-0 pointer-events-none" />

      <div className="relative z-10 text-center max-w-md px-4">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-anime-cyan/20 border-2 border-anime-cyan flex items-center justify-center">
          <svg className="w-10 h-10 text-anime-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>

        <h2 className="font-heading text-2xl font-bold text-anime-cyan mb-2">
          Profile Error
        </h2>
        <p className="text-anime-400 mb-2 text-sm">
          {error.message || "Could not load your profile data."}
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
