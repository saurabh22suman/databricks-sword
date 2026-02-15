/**
 * Sound system types for the cyberpunk audio engine.
 */

/**
 * All available sound effect identifiers.
 * Each maps to a unique synthesized cyberpunk sound.
 */
export type SoundId =
  | "click"
  | "navigate"
  | "xp-gain"
  | "quiz-correct"
  | "quiz-incorrect"
  | "stage-complete"
  | "quiz-complete"
  | "challenge-complete"
  | "achievement-unlock"
  | "mission-complete"
  | "rank-up"

/**
 * Ambient music state.
 */
export type MusicState = "stopped" | "playing" | "fading-in" | "fading-out"
