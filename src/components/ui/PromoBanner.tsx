/**
 * @file PromoBanner.tsx
 * @description Floating promotional banner for datapathsala.com
 * Styled with matcha/cyberpunk aesthetic
 */

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { X } from "lucide-react"
import { useSession } from "next-auth/react"

const PROMO_CONFIG = {
  href: "https://datapathsala.com",
  text: "Check out this cool DE Practice Platform from my mentor Mr Manish Kumar",
  cta: "Learn More",
}

/**
 * Cyberpunk-styled promotional banner
 * Positioned at top of page (below header) with entrance animations
 * Only shows when user is logged in
 */
export function PromoBanner(): React.ReactElement {
  const { data: session, status } = useSession()
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  // Only show when logged in
  const isLoggedIn = status === "authenticated" && session?.user

  useEffect(() => {
    // Delay appearance for dramatic entrance
    const timer = setTimeout(() => {
      if (!isLoggedIn) return

      // Check if previously dismissed
      const dismissed = localStorage.getItem("promo-banner-dismissed")
      if (!dismissed) {
        setIsVisible(true)
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [isLoggedIn])

  const handleDismiss = (): void => {
    setIsVisible(false)
    // Remember dismissal for session
    localStorage.setItem("promo-banner-dismissed", "true")
    // Auto-remove after animation
    setTimeout(() => setIsDismissed(true), 500)
  }

  // Don't render if not logged in or dismissed
  if (!isLoggedIn || isDismissed) {
    return <></>
  }

  return (
    <div
      role="region"
      aria-label="Promotional banner"
      className={`
        fixed top-20 left-0 right-0 z-40
        transition-all duration-500 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"}
      `}
    >
      <div className="relative group mx-auto max-w-4xl px-4">
        {/* Glow effect behind */}
        <div className="absolute -inset-2 bg-gradient-to-r from-anime-purple via-anime-accent to-anime-cyan rounded-lg blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500" />

        {/* Main banner card - horizontal layout */}
        <div className="relative cut-corner bg-anime-900/95 border border-anime-purple/50 backdrop-blur-xl overflow-hidden shadow-[0_4px_20px_rgba(168,85,247,0.2)]">
          {/* Animated scan line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-anime-accent to-transparent animate-scan-horizontal" />

          {/* Content - horizontal flex layout */}
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            {/* Label + Text */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="shrink-0 px-2 py-0.5 bg-anime-accent/20 border border-anime-accent/50 text-anime-accent text-[10px] font-bold uppercase tracking-widest">
                ✦ Hot
              </div>
              <p className="text-sm text-anime-100 font-medium truncate">
                {PROMO_CONFIG.text}
                <span className="text-anime-cyan ml-1">🚀</span>
              </p>
            </div>

            {/* CTA + Dismiss */}
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href={PROMO_CONFIG.href}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  inline-flex items-center gap-2 px-3 py-1.5
                  bg-anime-purple/30 hover:bg-anime-purple/50
                  border border-anime-purple/60 hover:border-anime-purple
                  text-anime-100 text-sm font-semibold
                  transition-all duration-300
                  hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]
                  cut-corner
                "
              >
                <span>{PROMO_CONFIG.cta}</span>
                <span className="text-anime-cyan">→</span>
              </Link>
              <button
                onClick={handleDismiss}
                className="
                  p-1.5
                  text-anime-500 hover:text-anime-100
                  hover:bg-anime-800/50
                  transition-all duration-200
                  rounded
                "
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Decorative circuit lines */}
          <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-anime-purple/30 via-anime-cyan/30 to-transparent" />
        </div>
      </div>
    </div>
  )
}