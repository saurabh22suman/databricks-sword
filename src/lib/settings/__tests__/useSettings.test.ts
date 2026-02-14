import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from "../types"
import { getSettingValue, useSettings } from "../useSettings"

describe("useSettings", () => {
  let store: Record<string, string>

  beforeEach(() => {
    store = {}
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key]
      }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns default settings when localStorage is empty", () => {
    const { result } = renderHook(() => useSettings())
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
  })

  it("returns persisted settings from localStorage", () => {
    store[SETTINGS_STORAGE_KEY] = JSON.stringify({
      sfxEnabled: false,
      codeEditorFontSize: 20,
    })

    const { result } = renderHook(() => useSettings())
    expect(result.current.settings.sfxEnabled).toBe(false)
    expect(result.current.settings.codeEditorFontSize).toBe(20)
    // Defaults for unset keys
    expect(result.current.settings.animationsEnabled).toBe(true)
    expect(result.current.settings.showHints).toBe(true)
  })

  it("updateSetting persists to localStorage and updates state", () => {
    const { result } = renderHook(() => useSettings())

    act(() => {
      result.current.updateSetting("sfxEnabled", false)
    })

    expect(result.current.settings.sfxEnabled).toBe(false)
    expect(localStorage.setItem).toHaveBeenCalledWith(
      SETTINGS_STORAGE_KEY,
      expect.stringContaining('"sfxEnabled":false'),
    )
  })

  it("updateSetting preserves other settings", () => {
    const { result } = renderHook(() => useSettings())

    act(() => {
      result.current.updateSetting("codeEditorFontSize", 18)
    })

    expect(result.current.settings.codeEditorFontSize).toBe(18)
    expect(result.current.settings.sfxEnabled).toBe(true)
    expect(result.current.settings.animationsEnabled).toBe(true)
    expect(result.current.settings.showHints).toBe(true)
  })

  it("resetSettings restores defaults and writes to localStorage", () => {
    const { result } = renderHook(() => useSettings())

    act(() => {
      result.current.updateSetting("sfxEnabled", false)
      result.current.updateSetting("showHints", false)
    })

    expect(result.current.settings.sfxEnabled).toBe(false)
    expect(result.current.settings.showHints).toBe(false)

    act(() => {
      result.current.resetSettings()
    })

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
  })

  it("handles corrupted localStorage gracefully", () => {
    store[SETTINGS_STORAGE_KEY] = "not-valid-json"

    const { result } = renderHook(() => useSettings())
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
  })
})

describe("getSettingValue", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn().mockReturnValue(
        JSON.stringify({ sfxEnabled: false, codeEditorFontSize: 22 }),
      ),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("reads a single setting value", () => {
    expect(getSettingValue("sfxEnabled")).toBe(false)
    expect(getSettingValue("codeEditorFontSize")).toBe(22)
  })

  it("returns default for unset keys", () => {
    expect(getSettingValue("showHints")).toBe(true)
    expect(getSettingValue("animationsEnabled")).toBe(true)
  })
})
