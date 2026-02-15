/**
 * @file Sound Effects & Music System
 * @description Public API for playing cyberpunk sound effects and ambient music.
 *
 * Uses the Web Audio API to synthesize sounds procedurally.
 * Respects the user's `sfxEnabled` and `musicEnabled` settings.
 * No audio files needed.
 *
 * @example
 * ```ts
 * import { playSound, startMusic, stopMusic } from "@/lib/sound"
 * playSound("achievement-unlock")
 * startMusic()   // ambient cyberpunk background
 * stopMusic()    // fade out
 * ```
 */

export type { SoundId, MusicState } from "./types"
import { cyberSoundEngine } from "./engine"
import { ambientMusic } from "./music"
import type { MusicState, SoundId } from "./types"

/**
 * Read sfxEnabled directly from localStorage without subscribing.
 * Avoids importing the full settings module for a one-shot check.
 */
function isSfxEnabled(): boolean {
  if (typeof window === "undefined") return false
  try {
    const raw = localStorage.getItem("dbsword-settings")
    if (raw) {
      const parsed = JSON.parse(raw) as { sfxEnabled?: boolean }
      return parsed.sfxEnabled !== false
    }
  } catch {
    // Corrupted — default to enabled
  }
  return true // default
}

/**
 * Read musicEnabled directly from localStorage.
 */
function isMusicEnabled(): boolean {
  if (typeof window === "undefined") return false
  try {
    const raw = localStorage.getItem("dbsword-settings")
    if (raw) {
      const parsed = JSON.parse(raw) as { musicEnabled?: boolean }
      return parsed.musicEnabled !== false
    }
  } catch {
    // Corrupted — default to enabled
  }
  return true // default
}

/**
 * Play a cyberpunk sound effect.
 *
 * Checks the user's sfxEnabled setting before producing audio.
 * Safe to call from any client context — silently no-ops on the server
 * or when audio is disabled.
 *
 * @param id - The sound effect to play
 */
export function playSound(id: SoundId): void {
  if (!isSfxEnabled()) return
  cyberSoundEngine.play(id)
}

/**
 * Start the ambient background music.
 * Fades in over 2 seconds. Respects musicEnabled setting.
 * Safe to call multiple times — no-ops if already playing.
 */
export function startMusic(): void {
  if (!isMusicEnabled()) return
  ambientMusic.start()
}

/**
 * Stop the ambient background music.
 * Fades out over 2 seconds, then releases audio resources.
 */
export function stopMusic(): void {
  ambientMusic.stop()
}

/**
 * Set the background music volume.
 * @param level - 0–100 slider value (0 = silent, 100 = max)
 */
export function setMusicVolume(level: number): void {
  ambientMusic.setVolume(level)
}

/**
 * Get the current state of background music playback.
 */
export function getMusicState(): MusicState {
  return ambientMusic.getState()
}
