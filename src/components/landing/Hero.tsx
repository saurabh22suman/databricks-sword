"use client"

import { ArrowRight, Cpu, Play } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

/**
 * Hero section for the landing page.
 * Features cinematic cyberpunk aesthetic with parallax effects,
 * and a mecha HUD interface with animated code preview.
 */
export function Hero(): React.ReactElement {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => requestAnimationFrame(() => setScrollY(window.scrollY))
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <section className="relative pt-32 pb-24 overflow-hidden min-h-screen flex items-center">
      {/* Cinematic Lighting/Flares with Parallax */}
      <div
        className="absolute top-1/2 left-1/2 w-[80vw] h-[80vw] bg-anime-purple/10 rounded-full blur-[100px] pointer-events-none animate-pulse"
        style={{
          transform: `translate(-50%, calc(-50% + ${scrollY * 0.3}px))`,
        }}
      />
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] bg-anime-accent/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen animate-float"
        style={{
          transform: `translateY(${scrollY * 0.2}px)`,
        }}
      />

      <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center relative z-10">
        {/* Left Column: Typography */}
        <div
          className="relative animate-slide-in"
          style={{ transform: `translateY(${scrollY * -0.05}px)` }}
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="px-2 py-1 bg-anime-accent/10 border border-anime-accent text-anime-accent text-[10px] font-bold uppercase tracking-widest animate-pulse-fast">
              System Online
            </div>
            <div className="h-px w-20 bg-anime-accent/50" />
          </div>

          <h1 className="text-7xl md:text-8xl font-black italic tracking-tighter text-white mb-2 leading-[0.85] drop-shadow-2xl">
            LIMIT <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-anime-accent via-anime-purple to-anime-cyan bg-[length:200%_auto] animate-[gradient_3s_ease_infinite] drop-shadow-[0_0_15px_rgba(255,0,60,0.5)]">
              BREAK
            </span>
          </h1>
          <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-gray-600 mb-8">
            YOUR DATA SKILLS
          </h2>

          <p className="text-lg text-gray-400 mb-10 leading-relaxed max-w-md border-l-4 border-anime-cyan pl-6 backdrop-blur-sm bg-black/10 py-2">
            <span className="text-anime-cyan font-bold">WARNING:</span> Traditional learning methods detected as obsolete. Initiate <span className="text-white font-bold">Protocol Sword</span> to master the Lakehouse.
          </p>

          <div className="flex flex-col sm:flex-row gap-6">
            <Link
              href="/missions"
              className="cut-corner group relative px-8 py-4 bg-anime-accent hover:bg-red-600 transition-all duration-300 text-white font-bold uppercase tracking-wider flex items-center justify-center gap-3 overflow-hidden shadow-[0_0_20px_rgba(255,0,60,0.4)] hover:shadow-[0_0_40px_rgba(255,0,60,0.8),inset_0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 border-t border-white/20"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-150%] group-hover:animate-shimmer skew-x-[-20deg]" />
              <span className="relative z-10 drop-shadow-md">Start Mission</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />
            </Link>

            <button className="cut-corner px-8 py-4 bg-transparent border border-white/20 hover:border-anime-cyan hover:bg-anime-cyan/5 text-white font-bold uppercase tracking-wider flex items-center justify-center gap-3 transition-all group hover:shadow-[0_0_20px_rgba(0,240,255,0.2)]">
              <Play className="w-5 h-5 fill-current group-hover:text-anime-cyan transition-colors" />
              <span className="group-hover:text-anime-cyan transition-colors">Watch Trailer</span>
            </button>
          </div>

          <div className="mt-16 flex items-center gap-8 opacity-60">
            <div className="flex flex-col">
              <span className="text-2xl font-black text-white">10k+</span>
              <span className="text-[10px] uppercase tracking-widest text-gray-500">Units Deployed</span>
            </div>
            <div className="w-px h-8 bg-gray-700" />
            <div className="flex flex-col">
              <span className="text-2xl font-black text-white">4.9</span>
              <span className="text-[10px] uppercase tracking-widest text-gray-500">System Rating</span>
            </div>
          </div>
        </div>

        {/* Right Column: Mecha HUD Interface */}
        <div
          className="relative perspective-[1000px] group"
          style={{ transform: `translateY(${scrollY * 0.05}px)` }}
        >
          {/* Hero Character */}
          <div className="absolute -top-16 -right-8 z-20 w-64 h-64 pointer-events-none opacity-90 drop-shadow-[0_0_30px_rgba(0,255,255,0.3)]">
            <Image
              src="/illustrations/hero-character.png"
              alt="Cyberpunk warrior character"
              width={256}
              height={256}
              className="object-contain animate-float"
              priority
            />
          </div>

          {/* Decoration Circles */}
          <div className="absolute -top-10 -right-10 w-32 h-32 border-2 border-dashed border-anime-cyan/30 rounded-full animate-spin-slow" />
          <div className="absolute -bottom-5 -left-5 w-24 h-24 border border-anime-purple/30 rounded-full animate-[spin_8s_linear_infinite_reverse]" />

          {/* Code Editor Window */}
          <div className="cut-corner-br bg-anime-900/90 border border-anime-cyan/30 backdrop-blur-xl p-1 shadow-[0_0_50px_rgba(0,240,255,0.1)] group-hover:shadow-[0_0_80px_rgba(0,240,255,0.2)] transition-shadow duration-500 transform rotate-y-[-10deg] rotate-x-[5deg] group-hover:rotate-0 transition-all duration-1000 ease-out animate-float">
            {/* Header */}
            <div className="flex items-center justify-between bg-black/50 p-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-anime-accent animate-pulse" />
                <span className="text-[10px] font-mono text-anime-cyan uppercase tracking-widest">Main_System.py</span>
              </div>
              <div className="flex gap-1">
                <div className="w-3 h-1 bg-gray-600 animate-pulse" />
                <div className="w-3 h-1 bg-gray-600 animate-pulse delay-75" />
                <div className="w-3 h-1 bg-gray-600 animate-pulse delay-150" />
              </div>
            </div>

            {/* Code Area */}
            <div className="p-6 font-mono text-xs sm:text-sm leading-relaxed text-gray-400 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-anime-cyan/50 shadow-[0_0_10px_#00f0ff] animate-scan-vertical" />

              <div className="flex animate-glitch-soft">
                <span className="w-8 text-gray-700 select-none">01</span>
                <span className="text-anime-purple">import</span> <span className="text-white">pyspark.sql.functions</span> <span className="text-anime-purple">as</span> <span className="text-white">F</span>
              </div>
              <div className="flex animate-glitch-soft" style={{ animationDelay: "0.2s" }}>
                <span className="w-8 text-gray-700 select-none">02</span>
                <span />
              </div>
              <div className="flex animate-glitch-soft" style={{ animationDelay: "0.5s" }}>
                <span className="w-8 text-gray-700 select-none">03</span>
                <span className="text-gray-500"># INITIATE PROTOCOL: DELTA</span>
              </div>
              <div className="flex animate-glitch-soft" style={{ animationDelay: "0.7s" }}>
                <span className="w-8 text-gray-700 select-none">04</span>
                <span className="text-white">df = spark.readStream \</span>
              </div>
              <div className="flex animate-glitch-soft" style={{ animationDelay: "0.9s" }}>
                <span className="w-8 text-gray-700 select-none">05</span>
                <span className="pl-4 text-anime-cyan">.format("delta") \</span>
              </div>
              <div className="flex animate-glitch-soft" style={{ animationDelay: "1.1s" }}>
                <span className="w-8 text-gray-700 select-none">06</span>
                <span className="pl-4 text-anime-cyan">.option("ignoreChanges", "true") \</span>
              </div>
              <div className="flex animate-glitch-soft" style={{ animationDelay: "0.3s" }}>
                <span className="w-8 text-gray-700 select-none">07</span>
                <span className="pl-4 text-white">.load(<span className="text-anime-yellow">"/mnt/reactor/core"</span>)</span>
              </div>
              <div className="flex animate-glitch-soft" style={{ animationDelay: "0.6s" }}>
                <span className="w-8 text-gray-700 select-none">08</span>
                <span />
              </div>
              <div className="flex animate-glitch-soft" style={{ animationDelay: "0.8s" }}>
                <span className="w-8 text-gray-700 select-none">09</span>
                <span className="text-white">df.writeStream \</span>
              </div>
              <div className="flex bg-anime-accent/10 -mx-6 px-6 border-l-2 border-anime-accent animate-glitch-soft" style={{ animationDelay: "1.2s" }}>
                <span className="w-8 text-gray-700 select-none">10</span>
                <span className="pl-4 text-anime-accent animate-pulse">.trigger(processingTime="1 second")</span>
              </div>
            </div>

            {/* Footer Info */}
            <div className="p-3 bg-black/40 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-gray-500">
              <div className="flex items-center gap-2">
                <Cpu className="w-3 h-3 animate-spin-slow" />
                <span>CPU: 98%</span>
              </div>
              <div className="text-anime-cyan animate-pulse">STATUS: OPTIMIZED</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
