"use client"

import { cn } from "@/lib/utils"
import { useLottie } from "lottie-react"
import { useEffect } from "react"

import type { LottiePlayerProps } from "./LottieAnimation"

/**
 * Internal LottiePlayer — extracted so `lottie-react` is dynamically imported
 * and kept out of the initial JavaScript bundle.
 */
export function LottiePlayer({
  animationData,
  loop,
  autoplay,
  width,
  height,
  speed,
  onComplete,
  className,
}: LottiePlayerProps): React.ReactElement {
  const { View, setSpeed } = useLottie(
    {
      animationData,
      loop,
      autoplay,
      onComplete,
    },
    {
      width: typeof width === "number" ? `${width}px` : width,
      height: typeof height === "number" ? `${height}px` : height,
    }
  )

  useEffect(() => {
    setSpeed(speed)
  }, [speed, setSpeed])

  return (
    <div className={cn("inline-flex items-center justify-center", className)} aria-hidden="true">
      {View}
    </div>
  )
}
