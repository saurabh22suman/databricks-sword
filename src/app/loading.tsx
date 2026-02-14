import { LoadingSpinner } from "@/components/ui/LoadingSpinner"

/**
 * Global loading state for Next.js App Router.
 * Features animated scan lines with cyberpunk aesthetics.
 */
export default function Loading(): React.ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-anime-950">
      {/* Cyber grid background */}
      <div className="cyber-grid absolute inset-0 opacity-20" />

      {/* Grain overlay */}
      <div className="grain-overlay absolute inset-0" />

      {/* Loading content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Lottie Loading Animation */}
        <div className="relative">
          <div className="absolute inset-0 animate-pulse">
            <div className="h-24 w-24 rounded-full bg-anime-cyan/20 blur-2xl" />
          </div>
          <LoadingSpinner />
        </div>

        {/* Scan line animation */}
        <div className="relative h-2 w-64 overflow-hidden border border-anime-cyan/30 bg-anime-900/50">
          <div className="animate-scan absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-anime-cyan to-transparent shadow-neon-cyan" />
        </div>

        {/* Status text */}
        <div className="flex flex-col items-center gap-2">
          <p className="animate-pulse font-mono text-sm uppercase tracking-widest text-anime-cyan">
            Initializing System...
          </p>
          <div className="flex gap-1">
            <span className="h-1 w-1 animate-pulse bg-anime-cyan delay-0" />
            <span className="h-1 w-1 animate-pulse bg-anime-cyan delay-75" />
            <span className="h-1 w-1 animate-pulse bg-anime-cyan delay-150" />
          </div>
        </div>

        {/* HUD elements */}
        <div className="absolute left-8 top-8 font-mono text-xs text-anime-cyan/50">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse bg-anime-cyan" />
            <span>SYS.STATUS: LOADING</span>
          </div>
        </div>

        <div className="absolute right-8 bottom-8 font-mono text-xs text-anime-cyan/50">
          <div className="flex flex-col items-end gap-1">
            <span>CPU: 98%</span>
            <span>MEM: 87%</span>
            <span className="animate-pulse text-anime-yellow">NET: SYNC</span>
          </div>
        </div>
      </div>
    </div>
  )
}
