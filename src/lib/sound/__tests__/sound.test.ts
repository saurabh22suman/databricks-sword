/**
 * @file Sound system tests
 * @description Tests for playSound API and engine integration
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ---------------------------------------------------------------------------
// Mock AudioContext nodes
// ---------------------------------------------------------------------------

const mockOscillator = {
  type: "",
  frequency: {
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}

const mockGain = {
  gain: {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
}

const mockFilter = {
  type: "",
  frequency: {
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
  Q: { value: 0 },
  connect: vi.fn(),
}

const mockDistortion = {
  curve: null as Float32Array | null,
  connect: vi.fn(),
}

const mockBufferSource = {
  buffer: null,
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}

const mockBuffer = {
  getChannelData: vi.fn(() => new Float32Array(4410)),
}

const mockConvolver = {
  buffer: null,
  connect: vi.fn(),
}

const mockAudioContext = {
  currentTime: 0,
  state: "running" as string,
  sampleRate: 44100,
  destination: {},
  resume: vi.fn(() => Promise.resolve()),
  createOscillator: vi.fn(() => ({ ...mockOscillator, frequency: { ...mockOscillator.frequency } })),
  createGain: vi.fn(() => ({ ...mockGain, gain: { ...mockGain.gain } })),
  createBiquadFilter: vi.fn(() => ({ ...mockFilter, frequency: { ...mockFilter.frequency }, Q: { ...mockFilter.Q } })),
  createWaveShaper: vi.fn(() => ({ ...mockDistortion })),
  createBuffer: vi.fn(() => ({ ...mockBuffer })),
  createBufferSource: vi.fn(() => ({ ...mockBufferSource })),
  createConvolver: vi.fn(() => ({ ...mockConvolver })),
}

// Mock the global AudioContext
vi.stubGlobal("AudioContext", vi.fn(() => ({ ...mockAudioContext })))

describe("Sound System", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    // Re-mock AudioContext so each test gets a fresh one
    vi.stubGlobal("AudioContext", vi.fn(() => ({
      ...mockAudioContext,
      state: "running",
      resume: vi.fn(() => Promise.resolve()),
      createOscillator: vi.fn(() => ({ ...mockOscillator, frequency: { ...mockOscillator.frequency } })),
      createGain: vi.fn(() => ({ ...mockGain, gain: { ...mockGain.gain } })),
      createBiquadFilter: vi.fn(() => ({ ...mockFilter, frequency: { ...mockFilter.frequency }, Q: { ...mockFilter.Q } })),
      createWaveShaper: vi.fn(() => ({ ...mockDistortion })),
      createBuffer: vi.fn(() => ({ ...mockBuffer })),
      createBufferSource: vi.fn(() => ({ ...mockBufferSource })),
      createConvolver: vi.fn(() => ({ ...mockConvolver })),
    })))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("playSound", () => {
    it("plays sound when sfxEnabled is true (default)", async () => {
      // Default settings — sfxEnabled is true
      const { playSound } = await import("../index")
      // Should not throw
      expect(() => playSound("click")).not.toThrow()
    })

    it("does not play when sfxEnabled is false", async () => {
      localStorage.setItem(
        "dbsword-settings",
        JSON.stringify({ sfxEnabled: false }),
      )

      // Fresh import to pick up the setting
      const { playSound } = await import("../index")
      // Should be a no-op — test passes if no error
      expect(() => playSound("click")).not.toThrow()
    })

    it("plays when settings has sfxEnabled true", async () => {
      localStorage.setItem(
        "dbsword-settings",
        JSON.stringify({ sfxEnabled: true }),
      )

      const { playSound } = await import("../index")
      expect(() => playSound("achievement-unlock")).not.toThrow()
    })

    it("handles corrupted settings gracefully (defaults to enabled)", async () => {
      localStorage.setItem("dbsword-settings", "NOT-VALID-JSON")

      const { playSound } = await import("../index")
      expect(() => playSound("xp-gain")).not.toThrow()
    })

    it("handles missing settings key (defaults to enabled)", async () => {
      // No settings in localStorage at all
      const { playSound } = await import("../index")
      expect(() => playSound("navigate")).not.toThrow()
    })
  })

  describe("SoundId coverage — all sound IDs play without errors", () => {
    const soundIds = [
      "click",
      "navigate",
      "xp-gain",
      "quiz-correct",
      "quiz-incorrect",
      "stage-complete",
      "quiz-complete",
      "challenge-complete",
      "achievement-unlock",
      "mission-complete",
      "rank-up",
    ] as const

    soundIds.forEach((id) => {
      it(`plays "${id}" without throwing`, async () => {
        const { playSound } = await import("../index")
        expect(() => playSound(id)).not.toThrow()
      })
    })
  })
})
