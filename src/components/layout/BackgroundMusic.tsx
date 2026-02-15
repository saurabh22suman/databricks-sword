/**
 * @file BackgroundMusic.tsx
 * @description Manages ambient background music lifecycle.
 *
 * Starts music after the first user interaction (click/keypress) to comply
 * with browser autoplay policies. Stops music when `musicEnabled` is toggled
 * off in settings, and resumes when toggled back on.
 *
 * **Auto-pauses during missions:** When the user navigates to a mission
 * stage route (`/missions/[id]/stage/[stageId]`), the music automatically
 * fades out so it doesn't distract from gameplay. It resumes when the user
 * navigates to any other page or completes the mission.
 *
 * Mount once in the root layout — renders nothing visible.
 */

"use client"

import { useSettings } from "@/lib/settings"
import { getMusicState, setMusicVolume, startMusic, stopMusic } from "@/lib/sound"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

/** Returns true if the pathname is a mission stage route */
function isMissionStageRoute(pathname: string): boolean {
  // Matches /missions/{id}/stage/{stageId}
  return /^\/missions\/[^/]+\/stage\/[^/]+/.test(pathname)
}

/**
 * Invisible component that manages the ambient music lifecycle.
 * Starts playing after the user's first click and responds to
 * the musicEnabled settings toggle and mission stage routes.
 */
export function BackgroundMusic(): null {
  const { settings } = useSettings()
  const pathname = usePathname()
  const hasInteracted = useRef(false)
  const musicStarted = useRef(false)
  /** Tracks whether music was paused because the user entered a mission */
  const pausedForMission = useRef(false)

  const onMissionStage = isMissionStageRoute(pathname)

  // Listen for first user interaction to unlock audio
  useEffect(() => {
    const handleInteraction = (): void => {
      if (hasInteracted.current) return
      hasInteracted.current = true

      // Start music if enabled AND not on a mission stage
      if (settings.musicEnabled && !isMissionStageRoute(window.location.pathname)) {
        setMusicVolume(settings.musicVolume)
        startMusic()
        musicStarted.current = true
      }

      // Clean up listeners after first interaction
      document.removeEventListener("click", handleInteraction)
      document.removeEventListener("keydown", handleInteraction)
    }

    document.addEventListener("click", handleInteraction, { once: false })
    document.addEventListener("keydown", handleInteraction, { once: false })

    return () => {
      document.removeEventListener("click", handleInteraction)
      document.removeEventListener("keydown", handleInteraction)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-pause / resume based on mission stage route
  useEffect(() => {
    if (!hasInteracted.current) return
    if (!settings.musicEnabled) return

    const state = getMusicState()

    if (onMissionStage) {
      // Entering a mission stage — pause music
      if (state === "playing" || state === "fading-in") {
        stopMusic()
        pausedForMission.current = true
      }
    } else if (pausedForMission.current) {
      // Left the mission stage — resume music
      pausedForMission.current = false
      startMusic()
      musicStarted.current = true
    }
  }, [onMissionStage, settings.musicEnabled])

  // React to musicEnabled setting changes
  useEffect(() => {
    if (!hasInteracted.current) return
    // Don't start music if on a mission stage
    if (onMissionStage) return

    const state = getMusicState()

    if (settings.musicEnabled && (state === "stopped" || state === "fading-out")) {
      startMusic()
      musicStarted.current = true
    } else if (!settings.musicEnabled && (state === "playing" || state === "fading-in")) {
      stopMusic()
      musicStarted.current = false
      pausedForMission.current = false
    }
  }, [settings.musicEnabled, onMissionStage])

  // React to volume changes in real-time
  useEffect(() => {
    if (!hasInteracted.current) return
    setMusicVolume(settings.musicVolume)
  }, [settings.musicVolume])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopMusic()
    }
  }, [])

  return null
}
