"use client"

import { AlertTriangle } from "lucide-react"
import { useEffect } from "react"

/**
 * Global error boundary for Next.js App Router.
 * Features glitch effect with cyberpunk aesthetics.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}): React.ReactElement {
  useEffect(() => {
    // Log the error to an error reporting service if needed
    console.error("Global error:", error)
  }, [error])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-anime-950">
      {/* Cyber grid background */}
      <div className="cyber-grid absolute inset-0 opacity-20" />

      {/* Grain overlay */}
      <div className="grain-overlay absolute inset-0" />

      {/* Red warning overlay */}
      <div className="absolute inset-0 bg-anime-accent/5 animate-pulse" />

      {/* Error content */}
      <div className="relative z-10 flex max-w-2xl flex-col items-center gap-8 px-4">
        {/* Glitched icon */}
        <div className="relative">
          <div className="absolute inset-0 animate-pulse">
            <div className="h-32 w-32 rounded-full bg-anime-accent/30 blur-3xl" />
          </div>
          <div className="cut-corner relative flex h-32 w-32 items-center justify-center border-2 border-anime-accent bg-anime-900 shadow-neon-red animate-glitch">
            <AlertTriangle className="h-16 w-16 text-anime-accent" strokeWidth={1.5} />
          </div>
        </div>

        {/* Error heading with glitch effect */}
        <div className="text-center">
          <h1 className="animate-glitch mb-2 font-heading text-6xl font-black uppercase tracking-tighter text-anime-accent">
            SYSTEM ERROR
          </h1>
          <p className="font-mono text-xs uppercase tracking-widest text-anime-accent/70">
            CRITICAL FAILURE DETECTED
          </p>
        </div>

        {/* Error message */}
        <div className="w-full max-w-lg">
          <div className="cut-corner border border-anime-accent/30 bg-anime-900/50 p-6">
            <div className="mb-4 flex items-center gap-2 border-b border-anime-accent/20 pb-2">
              <div className="h-2 w-2 animate-pulse bg-anime-accent" />
              <span className="font-mono text-xs uppercase tracking-wider text-anime-accent">
                Error Trace
              </span>
            </div>
            <p className="font-mono text-sm text-gray-400">
              {error.message || "An unexpected error occurred"}
            </p>
            {error.digest && (
              <p className="mt-2 font-mono text-xs text-gray-600">
                Digest: {error.digest}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <button
            onClick={reset}
            className="cut-corner group relative overflow-hidden border border-anime-accent bg-anime-accent px-8 py-4 font-bold uppercase tracking-wider text-white shadow-neon-red transition-all hover:bg-red-600 hover:shadow-[0_0_40px_rgba(255,0,60,0.8)] active:scale-95"
          >
            <div className="absolute inset-0 translate-x-[-150%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform group-hover:animate-shimmer" />
            <span className="relative z-10">Retry System</span>
          </button>

          <a
            href="/"
            className="cut-corner border border-white/20 bg-transparent px-8 py-4 font-bold uppercase tracking-wider text-white transition-all hover:border-anime-cyan hover:bg-anime-cyan/5 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] active:scale-95"
          >
            Return to Base
          </a>
        </div>

        {/* HUD elements */}
        <div className="absolute left-8 top-8 font-mono text-xs text-anime-accent/50">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse bg-anime-accent" />
            <span>SYS.STATUS: ERROR</span>
          </div>
        </div>

        <div className="absolute right-8 bottom-8 font-mono text-xs text-anime-accent/50">
          <div className="flex flex-col items-end gap-1">
            <span className="animate-pulse text-anime-accent">ALERT: CRITICAL</span>
            <span>FAILSAFE: ACTIVE</span>
            <span>RECOVERY: STANDBY</span>
          </div>
        </div>
      </div>
    </div>
  )
}
