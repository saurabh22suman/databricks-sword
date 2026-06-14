/**
 * @file state.ts
 * @description localStorage-backed flag for whether the user has completed
 * the onboarding tour. Used by the wizard controller to decide whether to
 * redirect new users, and by the settings page "Replay tour" link to reset
 * the flag before navigating to `/onboarding`.
 */

const STORAGE_KEY = "onboardingComplete"

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(STORAGE_KEY) === "true"
}

export function markOnboardingComplete(): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, "true")
}

export function resetOnboarding(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEY)
}
