"use client"

import { useSettings } from "@/lib/settings"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

/**
 * Available Lottie animation names mapped to their JSON file paths.
 */
export const ANIMATION_PATHS = {
  "loading-spinner": "/animations/loading-spinner.json",
  "xp-burst": "/animations/xp-burst.json",
  "achievement-unlock": "/animations/achievement-unlock.json",
  "mission-complete": "/animations/mission-complete.json",
  "rank-up": "/animations/rank-up.json",
  "flame-low": "/animations/flame-low.json",
  "flame-medium": "/animations/flame-medium.json",
  "flame-high": "/animations/flame-high.json",
} as const

export type AnimationName = keyof typeof ANIMATION_PATHS

type LottieAnimationProps = {
  /** Name of the animation to play */
  name: AnimationName
  /** Whether to loop the animation */
  loop?: boolean
  /** Whether to autoplay the animation */
  autoplay?: boolean
  /** Width of the animation container */
  width?: number | string
  /** Height of the animation container */
  height?: number | string
  /** Playback speed (1 = normal) */
  speed?: number
  /** Callback when animation completes (non-looping only) */
  onComplete?: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * LottieAnimation — Reusable wrapper for playing Lottie JSON animations.
 * Lazy-loads the animation data on mount to avoid bundling large JSON.
 *
 * @example
 * ```tsx
 * <LottieAnimation name="xp-burst" width={120} height={120} />
 * ```
 */
export function LottieAnimation({
  name,
  loop = false,
  autoplay = true,
  width = 120,
  height = 120,
  speed = 1,
  onComplete,
  className,
}: LottieAnimationProps): React.ReactElement | null {
  const { settings } = useSettings()
  const [animationData, setAnimationData] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (!settings.animationsEnabled) return
    let cancelled = false
    const path = ANIMATION_PATHS[name]
    fetch(path)
      .then((res) => res.json())
      .then((data: Record<string, unknown>) => {
        if (!cancelled) setAnimationData(data)
      })
      .catch(() => {
        // Silently fail — animation is decorative
      })
    return () => {
      cancelled = true
    }
  }, [name, settings.animationsEnabled])

  if (!settings.animationsEnabled || !animationData) return null

  return (
    <LottiePlayer
      animationData={animationData}
      loop={loop}
      autoplay={autoplay}
      width={width}
      height={height}
      speed={speed}
      onComplete={onComplete}
      className={className}
    />
  )
}

/**
 * Props for the internal LottiePlayer component.
 */
export type LottiePlayerProps = {
  animationData: Record<string, unknown>
  loop: boolean
  autoplay: boolean
  width: number | string
  height: number | string
  speed: number
  onComplete?: () => void
  className?: string
}

/**
 * Dynamically imported LottiePlayer — keeps lottie-react out of the initial bundle.
 */
const LottiePlayer = dynamic<LottiePlayerProps>(
  () => import("./LottiePlayer").then((mod) => mod.LottiePlayer),
  { ssr: false }
)
