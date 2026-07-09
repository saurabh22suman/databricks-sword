"use client"

import { ProfileSidebar } from "@/components/auth/ProfileSidebar"
import { Button } from "@/components/ui/Button"
import { NotificationDropdown } from "@/components/ui/NotificationDropdown"
import { RankProgressBar } from "@/components/gamification/RankProgressBar"
import { onXpEvent } from "@/lib/gamification/xpEventBus"
import { useSettings } from "@/lib/settings"
import { useHasCompletedMission } from "@/lib/dashboard"
import { loadSandbox, subscribeSandboxChange } from "@/lib/sandbox"
import { useSandboxSync } from "@/lib/sandbox/useSandboxSync"
import { stopMusic } from "@/lib/sound"
import { Menu, RefreshCw, User, Volume2, VolumeX, X } from "lucide-react"
import { useSession } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

const STANDARD_NAV = [
  { href: "/missions", label: "Missions" },
  { href: "/intel", label: "Intel" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/blog", label: "Logs" },
] as const

const ADVANCED_NAV = [
  { href: "/field-ops", label: "⚡ Field Ops", highlight: "cyan" as const },
  { href: "/map", label: "Map", highlight: "purple" as const },
  { href: "/cheat-sheet", label: "Cheat Sheet", highlight: "cyan" as const },
] as const

/**
 * Main site header with cyberpunk anime aesthetic.
 * Fixed navbar with neon branding and dark-only theme.
 * Shows avatar ring when authenticated that opens the game-style pause sidebar.
 * Includes mobile hamburger menu for smaller screens.
 */
export function Header(): React.ReactElement {
  const { data: session, status } = useSession()
  const { settings, updateSetting } = useSettings()
  const hasCompletedMission = useHasCompletedMission()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false)
  const [mobileShowMore, setMobileShowMore] = useState(false)
  const [userXp, setUserXp] = useState(0)
  const { refreshFromServer, isSyncing } = useSandboxSync()

  const moreDropdownRef = useRef<HTMLDivElement>(null)

  // Load XP from sandbox on mount.
// Listen for XP events (emitted when milestones sync to server and local progress updates).
// This approach avoids race conditions between sync and local lookups.
  const [hasHydrated, setHasHydrated] = useState(false)

  useEffect(() => {
    // Wait for session to be ready before loading XP
    if (status === "loading") return

    const sandbox = loadSandbox()
    if (sandbox) {
      setUserXp(sandbox.userStats.totalXp)
    }
    setHasHydrated(true)

    // Subscribe to XP events for live updates (delta XP awarded
    // locally — missions, challenges, etc.).
    const unsubscribeXp = onXpEvent((event) => {
      setUserXp((prevXp) => Math.max(0, prevXp + event.amount))
    })

    // Subscribe to sandbox changes (e.g. refreshFromServer pulled new
    // data, recalculateStats healed drift, migration ran). We re-read
    // the authoritative total from localStorage instead of adding a
    // delta, because these notifications represent absolute state
    // changes — not incremental awards. Without this subscription,
    // the header XP would freeze at the mount-time value until a
    // hard navigation.
    const unsubscribeSandbox = subscribeSandboxChange(() => {
      const latest = loadSandbox()
      if (latest) {
        setUserXp(latest.userStats.totalXp)
      }
    })

    return () => {
      unsubscribeXp()
      unsubscribeSandbox()
    }
  }, [status])

  // Close mobile menu and More dropdown on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (mobileMenuOpen) {
          setMobileMenuOpen(false)
        }
        if (moreDropdownOpen) {
          setMoreDropdownOpen(false)
        }
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [mobileMenuOpen, moreDropdownOpen])

  // Click outside handler for More dropdown
  useEffect(() => {
    if (!moreDropdownOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        moreDropdownRef.current &&
        !moreDropdownRef.current.contains(e.target as Node)
      ) {
        setMoreDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [moreDropdownOpen])

  // Don't render progress bar until we've hydrated to avoid flash of incorrect rank
  const isLoading = status === "loading" || !hasHydrated

  const audioMuted = !settings.sfxEnabled && !settings.musicEnabled

  const toggleAudioMute = (): void => {
    if (audioMuted) {
      updateSetting("sfxEnabled", true)
      updateSetting("musicEnabled", true)
      return
    }

    updateSetting("sfxEnabled", false)
    updateSetting("musicEnabled", false)
    stopMusic()
  }

  const toggleMoreDropdown = (): void => {
    setMoreDropdownOpen(!moreDropdownOpen)
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-anime-950/80 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="relative w-10 h-10 flex items-center justify-center overflow-hidden transform group-hover:rotate-12 transition-transform duration-300">
              <Image
                src="/logo/logo-mark.png"
                alt="DB Sword logo"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black italic tracking-tighter text-white leading-none">
                DB<span className="text-anime-accent">SWORD</span>
              </span>
              <span className="text-[9px] text-gray-500 tracking-widest group-hover:text-anime-cyan transition-colors font-mono">
                PROJECT ALICE
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-gray-400">
            {hasCompletedMission ? (
              <>
                {STANDARD_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="hover:text-white relative group transition-colors"
                  >
                    {item.label}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-anime-cyan group-hover:w-full transition-all duration-300" />
                  </Link>
                ))}
                {ADVANCED_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`hover:text-white relative group transition-colors`}
                  >
                    {item.label}
                    <span className={`absolute -bottom-1 left-0 w-0 h-0.5 ${item.highlight === "cyan" ? "bg-anime-cyan" : "bg-anime-purple"} group-hover:w-full transition-all duration-300`} />
                  </Link>
                ))}
              </>
            ) : (
              <>
                {STANDARD_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="hover:text-white relative group transition-colors"
                  >
                    {item.label}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-anime-cyan group-hover:w-full transition-all duration-300" />
                  </Link>
                ))}
                <div ref={moreDropdownRef} className="relative">
                  <button
                    onClick={toggleMoreDropdown}
                    className="hover:text-white relative group transition-colors flex items-center gap-1"
                    aria-expanded={moreDropdownOpen}
                    aria-haspopup="true"
                  >
                    More
                    <span className="text-[10px]">▾</span>
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-anime-cyan group-hover:w-full transition-all duration-300" />
                  </button>
                  {moreDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-anime-900 border border-anime-700 rounded-md shadow-lg py-2 flex flex-col gap-1 z-50">
                      {ADVANCED_NAV.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMoreDropdownOpen(false)}
                          className={`px-4 py-2 hover:bg-anime-800 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest`}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </nav>

          {/* XP Progress bar - only show when authenticated and hydrated */}
          {session?.user && !isLoading && (
            <div className="hidden lg:flex items-center gap-3 pl-6 border-l border-white/10">
              <RankProgressBar xp={userXp} className="w-48" />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button
              onClick={toggleAudioMute}
              variant="ghost"
              className="p-2 h-auto rounded-md text-gray-400 hover:text-white hover:bg-anime-800/60"
              aria-label={audioMuted ? "Unmute all audio" : "Mute all audio"}
              aria-pressed={!audioMuted}
              title={audioMuted ? "Unmute all audio" : "Mute all audio"}
            >
              {audioMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>

            {/* Sync from server button - only show when authenticated */}
            {session?.user && (
              <Button
                onClick={() => refreshFromServer()}
                variant="ghost"
                className="p-2 h-auto rounded-md text-gray-400 hover:text-white hover:bg-anime-800/60"
                aria-label="Sync from server"
                title="Sync from server"
                disabled={isSyncing}
              >
                <span className={isSyncing ? "animate-spin" : ""}>
                  <RefreshCw className="w-5 h-5" />
                </span>
              </Button>
            )}

            {/* Notifications Dropdown */}
            <NotificationDropdown />

            {/* Mobile Menu Toggle */}
            <Button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              variant="ghost"
              className="md:hidden p-2 h-auto text-gray-400 hover:text-white"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </Button>

            {/* Auth: Avatar ring (logged in) or Start Training CTA */}
            {status === "loading" ? (
              <div className="w-10 h-10 rounded-full bg-anime-700 animate-pulse" />
            ) : session?.user ? (
              <button
                onClick={() => setSidebarOpen(true)}
                className="relative w-10 h-10 rounded-full border-2 border-anime-cyan/50 hover:border-anime-cyan overflow-hidden transition-all duration-300 hover:shadow-neon-cyan group"
                aria-label="Open profile menu"
              >
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-anime-800 flex items-center justify-center">
                    <User className="w-5 h-5 text-anime-cyan" />
                  </div>
                )}
                {/* Pulse ring on hover */}
                <div className="absolute inset-0 rounded-full border-2 border-anime-cyan opacity-0 group-hover:opacity-50 group-hover:scale-125 transition-all duration-500" />
              </button>
            ) : (
              <Link
                href="/auth/signin"
                className="relative px-6 py-2 bg-transparent border border-anime-accent text-anime-accent font-bold uppercase text-xs tracking-widest hover:bg-anime-accent hover:text-white transition-all group overflow-hidden"
              >
                <span className="relative z-10">Start Training</span>
                <div className="absolute inset-0 bg-anime-accent transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Game-style pause sidebar */}
      <ProfileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Main navigation">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-anime-950/90 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu Content */}
          <nav className="absolute top-20 left-0 right-0 bg-anime-950 border-b border-anime-700 p-6 flex flex-col gap-4">
            {hasCompletedMission ? (
              <>
                {STANDARD_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-white py-2 border-b border-anime-800 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
                {ADVANCED_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-sm font-bold uppercase tracking-widest hover:text-white py-2 border-b border-anime-800 transition-colors ${
                      item.highlight === "cyan" ? "text-anime-cyan" : "text-gray-400"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </>
            ) : (
              <>
                {STANDARD_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-white py-2 border-b border-anime-800 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
                {!mobileShowMore ? (
                  <button
                    onClick={() => setMobileShowMore(true)}
                    className="text-sm font-bold uppercase tracking-widest text-anime-cyan hover:text-white py-2 border-b border-anime-800 transition-colors text-left"
                  >
                    Show more ▾
                  </button>
                ) : (
                  <>
                    {ADVANCED_NAV.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          setMobileShowMore(false)
                          setMobileMenuOpen(false)
                        }}
                        className={`text-sm font-bold uppercase tracking-widest hover:text-white py-2 border-b border-anime-800 transition-colors ${
                          item.highlight === "cyan" ? "text-anime-cyan" : "text-gray-400"
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                    <button
                      onClick={() => setMobileShowMore(false)}
                      className="text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-white py-2 border-b border-anime-800 transition-colors text-left"
                    >
                      Show less ▾
                    </button>
                  </>
                )}
              </>
            )}
          </nav>
        </div>
      )}
    </>
  )
}