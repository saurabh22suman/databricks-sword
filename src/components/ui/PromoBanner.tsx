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
 * Positioned mid-right of screen with entrance animations
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
      className={`
        fixed right-8 top-1/2 -translate-y-1/2 z-50
        transition-all duration-700 ease-out
        ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-20 pointer-events-none"}
      `}
    >
      <div className="relative group">
        {/* Glow effect behind */}
        <div className="absolute -inset-2 bg-gradient-to-r from-anime-purple via-anime-accent to-anime-cyan rounded-lg blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-500 animate-pulse" />

        {/* Main banner card */}
        <div className="relative cut-corner bg-anime-900/95 border border-anime-purple/50 backdrop-blur-xl overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.3)]">
          {/* Animated scan line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-anime-accent to-transparent animate-scan-horizontal" />

          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-anime-accent" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-anime-cyan" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-anime-cyan" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-anime-accent" />

          {/* Content */}
          <div className="p-4 pr-10 min-w-[280px] max-w-md">
            {/* Label */}
            <div className="flex items-center gap-2 mb-2">
              <div className="px-2 py-0.5 bg-anime-accent/20 border border-anime-accent/50 text-anime-accent text-[10px] font-bold uppercase tracking-widest animate-pulse">
                ✦ Hot Recommendation
              </div>
            </div>

            {/* Main text */}
            <p className="text-sm text-anime-100 font-medium leading-relaxed mb-3">
              {PROMO_CONFIG.text}{" "}
              <span className="text-anime-cyan">🚀</span>
            </p>

            {/* CTA Button */}
            <Link
              href={PROMO_CONFIG.href}
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-flex items-center gap-2 px-4 py-2
                bg-anime-purple/30 hover:bg-anime-purple/50
                border border-anime-purple/60 hover:border-anime-purple
                text-anime-100 text-sm font-semibold
                transition-all duration-300
                group-hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]
                cut-corner
              "
            >
              <span>{PROMO_CONFIG.cta}</span>
              <span className="text-anime-cyan">→</span>
            </Link>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="
              absolute top-2 right-2 p-1.5
              text-anime-500 hover:text-anime-100
              hover:bg-anime-800/50
              transition-all duration-200
              rounded
            "
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Decorative circuit lines */}
          <div className="absolute bottom-2 left-4 right-4 h-[1px] bg-gradient-to-r from-anime-purple/30 via-anime-cyan/30 to-transparent" />
        </div>

        {/* Floating particles effect */}
        <div className="absolute -top-4 -right-4 w-8 h-8 animate-pulse">
          <div className="absolute inset-0 border-2 border-anime-accent/30 rounded-full animate-ping" />
          <div className="absolute inset-2 border border-anime-cyan/50 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  )
}