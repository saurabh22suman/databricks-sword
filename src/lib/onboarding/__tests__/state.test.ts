import { describe, it, expect, beforeEach } from "vitest"
import { isOnboardingComplete, markOnboardingComplete, resetOnboarding } from "../state"

describe("onboarding state", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("returns false when not set", () => {
    expect(isOnboardingComplete()).toBe(false)
  })

  it("returns true after marking complete", () => {
    markOnboardingComplete()
    expect(isOnboardingComplete()).toBe(true)
  })

  it("resets to false", () => {
    markOnboardingComplete()
    resetOnboarding()
    expect(isOnboardingComplete()).toBe(false)
  })
})
