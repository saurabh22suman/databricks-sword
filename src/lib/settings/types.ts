/**
 * Settings types — shared across the app for user preferences.
 */

/**
 * User preferences persisted in localStorage under `dbsword-settings`.
 */
export type UserSettings = {
  /** Whether sound effects (XP gain, achievement unlock) are enabled */
  sfxEnabled: boolean
  /** Whether decorative animations (Lottie, glitch, hologram) are enabled */
  animationsEnabled: boolean
  /** Font size for code editor textareas (10–24px) */
  codeEditorFontSize: number
  /** Whether hint buttons are shown in challenges */
  showHints: boolean
}

/** localStorage key for user settings */
export const SETTINGS_STORAGE_KEY = "dbsword-settings"

/** Default settings for new users */
export const DEFAULT_SETTINGS: UserSettings = {
  sfxEnabled: true,
  animationsEnabled: true,
  codeEditorFontSize: 14,
  showHints: true,
}
