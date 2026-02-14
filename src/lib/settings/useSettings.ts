"use client"

import { useCallback, useSyncExternalStore } from "react"
import {
    DEFAULT_SETTINGS,
    SETTINGS_STORAGE_KEY,
    type UserSettings,
} from "./types"

/**
 * Read settings from localStorage, merging with defaults for missing keys.
 */
function readSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<UserSettings>) }
    }
  } catch {
    // Corrupted data — fall back to defaults
  }
  return DEFAULT_SETTINGS
}

/**
 * Persist settings to localStorage.
 */
function writeSettings(settings: UserSettings): void {
  if (typeof window === "undefined") return
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}

/* ---------------------------------------------------------------------------
 * Tiny pub/sub so multiple `useSettings()` hooks stay in sync within
 * the same page without needing a React context provider.
 * --------------------------------------------------------------------------- */

type Listener = () => void
const listeners = new Set<Listener>()

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emitChange(): void {
  for (const listener of listeners) {
    listener()
  }
}

/** Snapshot for `useSyncExternalStore` — returns a stable JSON string. */
function getSnapshot(): string {
  return JSON.stringify(readSettings())
}

function getServerSnapshot(): string {
  return JSON.stringify(DEFAULT_SETTINGS)
}

/**
 * useSettings — Read & update user preferences from any client component.
 *
 * Uses `useSyncExternalStore` to keep all consumers in sync when
 * settings change (even across components on the same page).
 *
 * @example
 * ```tsx
 * const { settings, updateSetting } = useSettings()
 * if (!settings.animationsEnabled) return null
 * ```
 */
export function useSettings(): {
  settings: UserSettings
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void
  resetSettings: () => void
} {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const settings: UserSettings = JSON.parse(snapshot) as UserSettings

  const updateSetting = useCallback(
    <K extends keyof UserSettings>(key: K, value: UserSettings[K]): void => {
      const current = readSettings()
      const next = { ...current, [key]: value }
      writeSettings(next)
      emitChange()
    },
    [],
  )

  const resetSettings = useCallback((): void => {
    writeSettings(DEFAULT_SETTINGS)
    emitChange()
  }, [])

  return { settings, updateSetting, resetSettings }
}

/**
 * Read a single setting value without subscribing to changes.
 * Useful in non-React contexts or one-shot reads.
 */
export function getSettingValue<K extends keyof UserSettings>(key: K): UserSettings[K] {
  return readSettings()[key]
}
