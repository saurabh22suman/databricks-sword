"use client"

import { getNextRank, getRankForXp, getRankProgress, getXpToNextRank, RANKS } from "@/lib/gamification"
import { loadSandbox } from "@/lib/sandbox"
import { cn } from "@/lib/utils"
import {
    Award,
    Flame,
    LogOut,
    Settings,
    Shield,
    Swords,
    Target,
    Trophy,
    User,
    X,
    Zap,
} from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

/**
 * ProfileSidebar props.
 */
type ProfileSidebarProps = {
  isOpen: boolean
  onClose: () => void
}

/**
 * User stats loaded from sandbox localStorage.
 */
type LocalStats = {
  totalXp: number
  totalMissionsCompleted: number
  totalChallengesCompleted: number
  totalAchievements: number
  currentStreak: number
  longestStreak: number
}

const defaultStats: LocalStats = {
  totalXp: 0,
  totalMissionsCompleted: 0,
  totalChallengesCompleted: 0,
  totalAchievements: 0,
  currentStreak: 0,
  longestStreak: 0,
}

/**
 * ProfileSidebar — Game-style pause menu.
 *
 * When opened, the entire page blurs with a "PAUSED" overlay and a sidebar
 * slides in from the right with user profile, rank, stats, and navigation.
 */
export function ProfileSidebar({ isOpen, onClose }: ProfileSidebarProps): React.ReactElement | null {
  const { data: session } = useSession()
  const [stats, setStats] = useState<LocalStats>(defaultStats)
  const [isAnimating, setIsAnimating] = useState(false)

  // Load sandbox stats when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
      const sandbox = loadSandbox()
      if (sandbox) {
        setStats({
          totalXp: sandbox.userStats.totalXp,
          totalMissionsCompleted: sandbox.userStats.totalMissionsCompleted,
          totalChallengesCompleted: sandbox.userStats.totalChallengesCompleted,
          totalAchievements: sandbox.userStats.totalAchievements,
          currentStreak: sandbox.streakData.currentStreak,
          longestStreak: sandbox.streakData.longestStreak,
        })
      }
      // Lock body scroll
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  const handleClose = useCallback(() => {
    setIsAnimating(false)
    // Wait for exit animation before truly closing
    setTimeout(onClose, 300)
  }, [onClose])

  if (!isOpen && !isAnimating) return null

  const user = session?.user
  const rank = getRankForXp(stats.totalXp)
  const rankIndex = RANKS.findIndex((r) => r.id === rank.id)
  const nextRank = getNextRank(rank)
  const progress = getRankProgress(stats.totalXp)
  const xpToNext = getXpToNextRank(stats.totalXp)

  return (
    <>
      {/* ===== FULL PAGE PAUSE OVERLAY ===== */}
      <div
        className={cn(
          "fixed inset-0 z-[998] transition-all duration-500",
          isOpen
            ? "opacity-100 backdrop-blur-md bg-anime-950/60"
            : "opacity-0 backdrop-blur-0 bg-transparent pointer-events-none"
        )}
        onClick={handleClose}
        aria-hidden="true"
      >
        {/* Scan lines */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,255,255,0.03)_2px,rgba(0,255,255,0.03)_4px)]" />

        {/* PAUSED text - centered on page */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div
            className={cn(
              "transition-all duration-700 ease-out",
              isOpen
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-8 scale-95"
            )}
          >
            <h2 className="text-6xl md:text-8xl font-black italic tracking-tighter text-white/10 select-none animate-pulse">
              PAUSED
            </h2>
          </div>
          <p className="mt-4 text-xs font-mono uppercase tracking-[0.4em] text-anime-cyan/30 select-none">
            Press ESC to resume
          </p>
        </div>

        {/* Corner decorations */}
        <div className="absolute top-6 left-6 w-16 h-16 border-t-2 border-l-2 border-anime-cyan/20 pointer-events-none" />
        <div className="absolute bottom-6 left-6 w-16 h-16 border-b-2 border-l-2 border-anime-cyan/20 pointer-events-none" />
      </div>

      {/* ===== RIGHT SIDEBAR ===== */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-[999] h-full w-full sm:w-96",
          "bg-anime-950 border-l border-anime-cyan/20",
          "flex flex-col overflow-y-auto",
          "transition-transform duration-500 ease-out",
          "shadow-[-20px_0_60px_rgba(0,255,255,0.1)]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 text-anime-700 hover:text-anime-cyan transition-colors"
          aria-label="Close profile sidebar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ── User Identity ── */}
        <div className="relative px-6 pt-8 pb-6 border-b border-white/5">
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-anime-cyan/5 blur-3xl pointer-events-none" />

          <div className="relative flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-anime-cyan/50 overflow-hidden shadow-neon-cyan">
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={user.name || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-anime-800 flex items-center justify-center">
                    <User className="w-8 h-8 text-anime-cyan" />
                  </div>
                )}
              </div>
              {/* Online indicator */}
              <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-anime-green border-2 border-anime-950" />
            </div>

            {/* Name & email */}
            <div className="flex-1 min-w-0">
              <h3 className="font-heading text-lg font-bold text-white truncate">
                {user?.name || "Operative"}
              </h3>
              <p className="text-xs font-mono text-anime-700 truncate">
                {user?.email || "anonymous"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Rank & XP ── */}
        <div className="px-6 py-5 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-anime-cyan" />
              <span className="text-sm font-bold uppercase tracking-wider text-anime-cyan">
                {rank.title}
              </span>
            </div>
            <span className="text-xs font-mono text-anime-700">
              LVL {rankIndex + 1}
            </span>
          </div>

          {/* XP Progress bar */}
          <div className="relative mb-2">
            <div className="w-full h-2 bg-anime-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-anime-cyan to-anime-accent rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-anime-cyan">{stats.totalXp} XP</span>
            <span className="text-anime-700">
              {nextRank ? `${xpToNext} to ${nextRank.title}` : "MAX RANK"}
            </span>
          </div>
        </div>

        {/* ── Quick Stats ── */}
        <div className="px-6 py-5 border-b border-white/5">
          <h4 className="text-[10px] font-mono uppercase tracking-[0.3em] text-anime-700 mb-4">
            Combat Stats
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Swords className="w-4 h-4" />}
              label="Missions"
              value={stats.totalMissionsCompleted}
              color="cyan"
            />
            <StatCard
              icon={<Target className="w-4 h-4" />}
              label="Challenges"
              value={stats.totalChallengesCompleted}
              color="accent"
            />
            <StatCard
              icon={<Trophy className="w-4 h-4" />}
              label="Achievements"
              value={stats.totalAchievements}
              color="yellow"
            />
            <StatCard
              icon={<Flame className="w-4 h-4" />}
              label="Streak"
              value={stats.currentStreak}
              suffix="d"
              color="green"
            />
          </div>
        </div>

        {/* ── Streak Info ── */}
        {stats.currentStreak > 0 && (
          <div className="px-6 py-4 border-b border-white/5 bg-anime-green/5">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🔥</div>
              <div>
                <p className="text-sm font-bold text-anime-green">
                  {stats.currentStreak} Day Streak
                </p>
                <p className="text-[10px] font-mono text-anime-700">
                  Best: {stats.longestStreak}d
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Navigation ── */}
        <nav className="px-4 py-4 flex-1">
          <h4 className="px-2 text-[10px] font-mono uppercase tracking-[0.3em] text-anime-700 mb-3">
            Navigation
          </h4>

          <NavItem href="/profile" icon={<User className="w-4 h-4" />} label="Profile" onClick={handleClose} />
          <NavItem href="/missions" icon={<Swords className="w-4 h-4" />} label="Missions" onClick={handleClose} />
          <NavItem href="/challenges" icon={<Target className="w-4 h-4" />} label="Challenges" onClick={handleClose} />
          <NavItem href="/review" icon={<Zap className="w-4 h-4" />} label="Flashcard Review" onClick={handleClose} />
          <NavItem href="/daily" icon={<Flame className="w-4 h-4" />} label="Daily Forge" onClick={handleClose} />
          <NavItem href="/achievements" icon={<Award className="w-4 h-4" />} label="Achievements" onClick={handleClose} />

          <div className="my-3 border-t border-white/5" />

          <NavItem href="/settings" icon={<Settings className="w-4 h-4" />} label="Settings" onClick={handleClose} />
        </nav>

        {/* ── Sign Out ── */}
        <div className="px-4 pb-6 pt-2 border-t border-white/5">
          <button
            onClick={() => {
              handleClose()
              signOut({ callbackUrl: "/" })
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-anime-accent hover:bg-anime-accent/10 transition-colors rounded font-mono text-sm uppercase tracking-wider"
          >
            <LogOut className="w-4 h-4" />
            <span>Disconnect</span>
          </button>

          <p className="mt-4 px-4 text-[9px] font-mono text-anime-700/50 uppercase tracking-widest text-center">
            DB Sword v0.1.0
          </p>
        </div>
      </aside>
    </>
  )
}

/* ── Sub-components ── */

type StatCardProps = {
  icon: React.ReactNode
  label: string
  value: number
  suffix?: string
  color: "cyan" | "accent" | "yellow" | "green"
}

const colorMap = {
  cyan: "text-anime-cyan border-anime-cyan/20 bg-anime-cyan/5",
  accent: "text-anime-accent border-anime-accent/20 bg-anime-accent/5",
  yellow: "text-anime-yellow border-anime-yellow/20 bg-anime-yellow/5",
  green: "text-anime-green border-anime-green/20 bg-anime-green/5",
} as const

function StatCard({ icon, label, value, suffix = "", color }: StatCardProps): React.ReactElement {
  return (
    <div className={cn("border rounded-lg p-3 text-center", colorMap[color])}>
      <div className="flex items-center justify-center mb-1">{icon}</div>
      <p className="text-lg font-bold font-mono">
        {value}
        {suffix}
      </p>
      <p className="text-[9px] uppercase tracking-wider opacity-70">{label}</p>
    </div>
  )
}

type NavItemProps = {
  href: string
  icon: React.ReactNode
  label: string
  onClick: () => void
}

function NavItem({ href, icon, label, onClick }: NavItemProps): React.ReactElement {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 rounded text-sm text-gray-400 hover:text-white hover:bg-anime-800/50 transition-colors group"
    >
      <span className="text-anime-700 group-hover:text-anime-cyan transition-colors">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
