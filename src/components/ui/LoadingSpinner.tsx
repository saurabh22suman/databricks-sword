"use client"

import { LottieAnimation } from "@/components/ui/LottieAnimation"

/**
 * Animated loading spinner using Lottie animation.
 * Client component wrapping the LottieAnimation for use in loading.tsx pages.
 */
export function LoadingSpinner(): React.ReactElement {
  return (
    <LottieAnimation
      name="loading-spinner"
      loop
      width={96}
      height={96}
    />
  )
}
