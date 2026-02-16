"use client"

import { ProfileSidebar } from "@/components/auth/ProfileSidebar"
import { Menu, User, X } from "lucide-react"
import { useSession } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

/**
 * Main site header with cyberpunk anime aesthetic.
 * Fixed navbar with neon branding and dark-only theme.
 * Shows avatar ring when authenticated that opens the game-style pause sidebar.
 * Includes mobile hamburger menu for smaller screens.
 */
export function Header(): React.ReactElement {
  const { data: session, status } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
            <Link
              href="/#projects"
              className="hover:text-white relative group transition-colors"
            >
              Projects
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-anime-cyan group-hover:w-full transition-all duration-300" />
            </Link>
            <Link
              href="/#interview-prep"
              className="hover:text-white relative group transition-colors"
            >
              Intel
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-anime-cyan group-hover:w-full transition-all duration-300" />
            </Link>
            <Link
              href="/field-ops"
              className="hover:text-white relative group transition-colors"
            >
              ⚡ Field Ops
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-anime-cyan group-hover:w-full transition-all duration-300" />
            </Link>
            <Link
              href="/#blog"
              className="hover:text-white relative group transition-colors"
            >
              Logs
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-anime-cyan group-hover:w-full transition-all duration-300" />
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

            <Link
              href="/missions"
              className="hidden sm:block text-xs font-bold uppercase tracking-widest text-white hover:text-anime-cyan transition-colors"
            >
              Missions
            </Link>

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
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-anime-950/90 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Menu Content */}
          <nav className="absolute top-20 left-0 right-0 bg-anime-950 border-b border-anime-700 p-6 flex flex-col gap-4">
            <Link
              href="/#projects"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-white py-2 border-b border-anime-800 transition-colors"
            >
              Projects
            </Link>
            <Link
              href="/#interview-prep"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-white py-2 border-b border-anime-800 transition-colors"
            >
              Intel
            </Link>
            <Link
              href="/field-ops"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-white py-2 border-b border-anime-800 transition-colors"
            >
              ⚡ Field Ops
            </Link>
            <Link
              href="/#blog"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-white py-2 border-b border-anime-800 transition-colors"
            >
              Logs
            </Link>
            <Link
              href="/missions"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-bold uppercase tracking-widest text-anime-cyan hover:text-white py-2 transition-colors"
            >
              Missions
            </Link>
          </nav>
        </div>
      )}
    </>
  )
}
