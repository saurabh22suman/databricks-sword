import { GoBackButton } from "@/components/ui/GoBackButton"
import { Home } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

/**
 * Global 404 not found page for Next.js App Router.
 * Features cyberpunk/anime aesthetics with hologram effect.
 */
export default function NotFound(): React.ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-anime-950">
      {/* Cyber grid background */}
      <div className="cyber-grid absolute inset-0 opacity-20" />

      {/* Grain overlay */}
      <div className="grain-overlay absolute inset-0" />

      {/* Purple ambient glow */}
      <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-anime-purple/10 blur-[120px]" />

      {/* 404 content */}
      <div className="relative z-10 flex max-w-2xl flex-col items-center gap-8 px-4">
        {/* 404 number with hologram effect */}
        <div className="relative">
          <div className="absolute inset-0 blur-md">
            <h1 className="animate-hologram font-heading text-9xl font-black italic text-anime-purple/50">
              404
            </h1>
          </div>
          <h1 className="relative font-heading text-9xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-anime-purple via-anime-cyan to-anime-purple animate-[gradient_3s_ease_infinite] drop-shadow-[0_0_20px_rgba(153,51,255,0.5)]">
            404
          </h1>
        </div>

        {/* Error Illustration */}
        <div className="relative">
          <div className="absolute inset-0 animate-pulse">
            <div className="h-40 w-40 rounded-full bg-anime-purple/20 blur-2xl" />
          </div>
          <div className="relative w-40 h-40 drop-shadow-[0_0_20px_rgba(153,51,255,0.4)]">
            <Image
              src="/illustrations/error-404.png"
              alt="404 Error - Sector not found"
              width={160}
              height={160}
              className="object-contain animate-float"
            />
          </div>
        </div>

        {/* Message */}
        <div className="text-center">
          <h2 className="mb-3 font-heading text-4xl font-black uppercase tracking-tighter text-white">
            Sector Not Found
          </h2>
          <p className="font-mono text-sm uppercase tracking-widest text-gray-400">
            Target coordinates invalid
          </p>
        </div>

        {/* Description */}
        <div className="w-full max-w-md">
          <div className="cut-corner border border-anime-purple/30 bg-anime-900/50 p-6">
            <p className="text-center text-gray-400 leading-relaxed">
              The page you&apos;re looking for doesn&apos;t exist in the database.
              It may have been moved, deleted, or the URL might be incorrect.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/"
            className="cut-corner group relative flex items-center justify-center gap-2 overflow-hidden border border-anime-purple bg-anime-purple px-8 py-4 font-bold uppercase tracking-wider text-white shadow-neon-purple transition-all hover:bg-purple-600 hover:shadow-[0_0_40px_rgba(153,51,255,0.8)] active:scale-95"
          >
            <div className="absolute inset-0 translate-x-[-150%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform group-hover:animate-shimmer" />
            <Home className="relative z-10 h-5 w-5" />
            <span className="relative z-10">Return Home</span>
          </Link>

          <GoBackButton />
        </div>

        {/* HUD elements */}
        <div className="absolute left-8 top-8 font-mono text-xs text-anime-purple/50">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse bg-anime-purple" />
            <span>SYS.STATUS: NOT_FOUND</span>
          </div>
        </div>

        <div className="absolute right-8 top-8 font-mono text-xs text-anime-purple/50">
          <span>ERROR_CODE: 404</span>
        </div>

        <div className="absolute right-8 bottom-8 font-mono text-xs text-gray-600">
          <div className="flex flex-col items-end gap-1">
            <span>SEARCH: FAILED</span>
            <span>ALTERNATE: STANDBY</span>
            <span className="animate-pulse text-anime-cyan">REDIRECT: AVAILABLE</span>
          </div>
        </div>
      </div>
    </div>
  )
}
