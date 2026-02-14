"use client"

import { ArrowLeft } from "lucide-react"

/**
 * Go-back button that calls window.history.back().
 * Extracted as a client component so it can be used in server-rendered pages.
 */
export function GoBackButton(): React.ReactElement {
  return (
    <button
      onClick={() => window.history.back()}
      className="cut-corner flex items-center justify-center gap-2 border border-white/20 bg-transparent px-8 py-4 font-bold uppercase tracking-wider text-white transition-all hover:border-anime-cyan hover:bg-anime-cyan/5 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] active:scale-95"
    >
      <ArrowLeft className="h-5 w-5" />
      <span>Go Back</span>
    </button>
  )
}
