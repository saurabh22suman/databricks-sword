/**
 * @file motion.ts
 * @description Helpers for persisting the user's motion preference.
 *
 * - `getStoredMotionPreference` / `setStoredMotionPreference` persist an
 *   explicit user override in `localStorage` under the `reduceMotion` key.
 *
 * The CSS layer responds to `(prefers-reduced-motion: reduce)` directly via
 * the @media block in `globals.css`. The user override sets
 * `data-reduce-motion="true"` on the `<html>` element so the same CSS can
 * also fire for users who want reduced motion regardless of OS settings.
 */

export type MotionPreference = "system" | "reduce" | "no-preference"

const STORAGE_KEY = "reduceMotion"

export function getStoredMotionPreference(): MotionPreference {
  if (typeof window === "undefined") return "system"
  const value = window.localStorage.getItem(STORAGE_KEY)
  if (value === "true") return "reduce"
  if (value === "false") return "no-preference"
  return "system"
}

export function setStoredMotionPreference(pref: MotionPreference): void {
  if (typeof window === "undefined") return
  if (pref === "system") {
    window.localStorage.removeItem(STORAGE_KEY)
    return
  }
  window.localStorage.setItem(STORAGE_KEY, pref === "reduce" ? "true" : "false")
}

