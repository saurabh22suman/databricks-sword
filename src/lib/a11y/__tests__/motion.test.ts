import { describe, it, expect, beforeEach } from "vitest"
import { getStoredMotionPreference, setStoredMotionPreference } from "../motion"

describe("motion preferences", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("returns 'system' when nothing is stored", () => {
    expect(getStoredMotionPreference()).toBe("system")
  })

  it("returns stored 'reduce' value", () => {
    localStorage.setItem("reduceMotion", "true")
    expect(getStoredMotionPreference()).toBe("reduce")
  })

  it("returns stored 'no-preference' value", () => {
    localStorage.setItem("reduceMotion", "false")
    expect(getStoredMotionPreference()).toBe("no-preference")
  })

  it("persists 'reduce' to localStorage", () => {
    setStoredMotionPreference("reduce")
    expect(localStorage.getItem("reduceMotion")).toBe("true")
  })

  it("persists 'no-preference' to localStorage", () => {
    setStoredMotionPreference("no-preference")
    expect(localStorage.getItem("reduceMotion")).toBe("false")
  })

  it("removes storage key when set to 'system'", () => {
    setStoredMotionPreference("reduce")
    setStoredMotionPreference("system")
    expect(localStorage.getItem("reduceMotion")).toBeNull()
  })
})
