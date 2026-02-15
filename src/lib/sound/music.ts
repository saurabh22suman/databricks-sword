/**
 * @file music.ts
 * @description Generative cyberpunk ambient music engine.
 *
 * Produces a subtle, evolving background soundtrack using Web Audio API:
 * - **Deep sub-bass drone** — slow-moving sine wave (40–60 Hz)
 * - **Soft pad chords** — filtered, detuned saw/sine layers with slow LFO
 * - **Slow arpeggio** — gentle bell-like notes cycling through a scale
 * - **Atmospheric texture** — filtered noise that breathes in and out
 *
 * Everything is generated procedurally. The music evolves slowly so it
 * never feels repetitive. Volume is very low — it's background ambiance,
 * not a soundtrack that competes with the UI.
 *
 * Respects `musicEnabled` setting. Fades in/out smoothly (2 sec).
 */

import type { MusicState } from "./types"

/** Overall music volume — very quiet, just enough to set the mood */
const DEFAULT_MUSIC_VOLUME = 0.06

/** Maximum volume level (user slider at 100%) */
const MAX_MUSIC_VOLUME = 0.15

/** Fade duration in seconds */
const FADE_DURATION = 2.0

/** How often the arpeggiator plays a note (seconds) */
const ARP_INTERVAL = 2.4

/** Pentatonic minor scale frequencies in octave 4 (cyberpunk/dark feel) */
const SCALE = [
  261.63, // C4
  293.66, // D4
  311.13, // Eb4
  392.0,  // G4
  466.16, // Bb4
  523.25, // C5
  587.33, // D5
  622.25, // Eb5
]

/**
 * Generative ambient music engine.
 * Call `start()` after a user gesture. Call `stop()` to fade out.
 */
class AmbientMusicEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private state: MusicState = "stopped"
  /** User-facing volume 0–100, mapped to 0–MAX_MUSIC_VOLUME */
  private volume: number = DEFAULT_MUSIC_VOLUME

  // Active audio nodes (for cleanup)
  private droneOsc: OscillatorNode | null = null
  private padOscs: OscillatorNode[] = []
  private noiseSource: AudioBufferSourceNode | null = null
  private noiseLfo: OscillatorNode | null = null
  private arpTimer: ReturnType<typeof setInterval> | null = null
  private allGains: GainNode[] = []
  private allNodes: AudioNode[] = []

  /** Current state of music playback */
  getState(): MusicState {
    return this.state
  }

  /**
   * Set the music volume.
   * @param level - 0–100 slider value
   */
  setVolume(level: number): void {
    const clamped = Math.max(0, Math.min(100, level))
    this.volume = (clamped / 100) * MAX_MUSIC_VOLUME

    // Apply immediately if playing
    if (this.masterGain && this.ctx && (this.state === "playing" || this.state === "fading-in")) {
      const t = this.ctx.currentTime
      this.masterGain.gain.cancelScheduledValues(t)
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t)
      this.masterGain.gain.linearRampToValueAtTime(this.volume, t + 0.3)
    }
  }

  /**
   * Start the ambient music. Fades in over 2 seconds.
   * Safe to call multiple times — will no-op if already playing.
   */
  start(): void {
    if (this.state === "playing" || this.state === "fading-in") return

    try {
      this.initContext()
      this.state = "fading-in"

      const ctx = this.ctx!
      const master = this.masterGain!
      const t = ctx.currentTime

      // Fade in
      master.gain.setValueAtTime(0, t)
      master.gain.linearRampToValueAtTime(this.volume, t + FADE_DURATION)

      // Start all layers
      this.startDrone(ctx, t)
      this.startPad(ctx, t)
      this.startNoise(ctx, t)
      this.startArpeggiator(ctx)

      setTimeout(() => {
        if (this.state === "fading-in") this.state = "playing"
      }, FADE_DURATION * 1000)
    } catch {
      this.state = "stopped"
    }
  }

  /**
   * Stop the ambient music. Fades out over 2 seconds, then cleans up.
   */
  stop(): void {
    if (this.state === "stopped" || this.state === "fading-out") return

    this.state = "fading-out"

    if (this.ctx && this.masterGain) {
      const t = this.ctx.currentTime
      this.masterGain.gain.cancelScheduledValues(t)
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t)
      this.masterGain.gain.linearRampToValueAtTime(0, t + FADE_DURATION)
    }

    setTimeout(() => {
      this.cleanup()
      this.state = "stopped"
    }, FADE_DURATION * 1000 + 100)
  }

  // ---------------------------------------------------------------------------
  // Context management
  // ---------------------------------------------------------------------------

  private initContext(): void {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = 0
      this.masterGain.connect(this.ctx.destination)
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume()
    }
  }

  private cleanup(): void {
    if (this.arpTimer) {
      clearInterval(this.arpTimer)
      this.arpTimer = null
    }

    // Stop all oscillators
    const stopNode = (node: AudioNode | null): void => {
      try {
        if (node && "stop" in node && typeof node.stop === "function") {
          (node as OscillatorNode).stop()
        }
      } catch {
        // Already stopped
      }
    }

    stopNode(this.droneOsc)
    this.droneOsc = null

    this.padOscs.forEach(stopNode)
    this.padOscs = []

    stopNode(this.noiseSource)
    this.noiseSource = null

    stopNode(this.noiseLfo)
    this.noiseLfo = null

    this.allNodes.forEach((node) => {
      try { node.disconnect() } catch { /* ok */ }
    })
    this.allNodes = []
    this.allGains = []

    // Close audio context
    if (this.ctx && this.ctx.state !== "closed") {
      void this.ctx.close()
    }
    this.ctx = null
    this.masterGain = null
  }

  // ---------------------------------------------------------------------------
  // Music layers
  // ---------------------------------------------------------------------------

  /**
   * Deep sub-bass drone — a very low sine wave that slowly undulates.
   */
  private startDrone(ctx: AudioContext, t: number): void {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(48, t) // ~halfway between C1 and C2

    // Slow frequency drift via LFO
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.type = "sine"
    lfo.frequency.value = 0.08 // Very slow wobble
    lfoGain.gain.value = 4 // ±4 Hz drift
    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency)
    lfo.start(t)

    gain.gain.value = 0.8

    osc.connect(gain)
    gain.connect(this.masterGain!)

    osc.start(t)

    this.droneOsc = osc
    this.allNodes.push(osc, gain, lfo, lfoGain)
    this.allGains.push(gain)
  }

  /**
   * Soft pad layer — minor chord (Cm7) with detuned voices and
   * a slow-moving lowpass filter for a breathing effect.
   */
  private startPad(ctx: AudioContext, t: number): void {
    // Cm7 voicing: C3, Eb3, G3, Bb3
    const padFreqs = [130.81, 155.56, 196.0, 233.08]

    const padBus = ctx.createGain()
    padBus.gain.value = 0.5

    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.value = 600
    filter.Q.value = 1

    // Slow filter sweep via LFO
    const filterLfo = ctx.createOscillator()
    const filterLfoGain = ctx.createGain()
    filterLfo.type = "sine"
    filterLfo.frequency.value = 0.05 // Breathes every ~20 seconds
    filterLfoGain.gain.value = 300 // 300–900 Hz sweep range
    filterLfo.connect(filterLfoGain)
    filterLfoGain.connect(filter.frequency)
    filterLfo.start(t)

    padFreqs.forEach((freq) => {
      // Two detuned voices per note for chorus
      for (const detune of [-1.5, 1.5]) {
        const osc = ctx.createOscillator()
        osc.type = "sawtooth"
        osc.frequency.value = freq + detune

        osc.connect(filter)
        osc.start(t)

        this.padOscs.push(osc)
        this.allNodes.push(osc)
      }
    })

    filter.connect(padBus)
    padBus.connect(this.masterGain!)

    this.allNodes.push(filter, padBus, filterLfo, filterLfoGain)
    this.allGains.push(padBus)
  }

  /**
   * Atmospheric noise texture — filtered white noise with slow LFO
   * modulating the gain so it "breathes" in and out.
   */
  private startNoise(ctx: AudioContext, t: number): void {
    // Create a long noise buffer (10 seconds, looped)
    const length = ctx.sampleRate * 10
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch)
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1
      }
    }

    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true

    // Heavy lowpass filter — only the low rumble comes through
    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.value = 400
    filter.Q.value = 0.5

    // Breathing gain via LFO
    const gain = ctx.createGain()
    gain.gain.value = 0.3

    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.type = "sine"
    lfo.frequency.value = 0.12 // Breath cycle ~8 seconds
    lfoGain.gain.value = 0.15 // Subtle volume undulation
    lfo.connect(lfoGain)
    lfoGain.connect(gain.gain)
    lfo.start(t)

    src.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain!)

    src.start(t)

    this.noiseSource = src
    this.noiseLfo = lfo
    this.allNodes.push(src, filter, gain, lfo, lfoGain)
    this.allGains.push(gain)
  }

  /**
   * Slow arpeggiator — plays one bell-like note every few seconds,
   * picked from the pentatonic minor scale. Creates a meditative,
   * evolving melody that never repeats exactly.
   */
  private startArpeggiator(ctx: AudioContext): void {
    let noteIndex = 0

    const playArpNote = (): void => {
      if (this.state !== "playing" && this.state !== "fading-in") return
      if (!this.ctx || this.ctx.state === "closed") return

      const t = ctx.currentTime
      // Pick note — mostly sequential, sometimes random jump
      if (Math.random() > 0.7) {
        noteIndex = Math.floor(Math.random() * SCALE.length)
      } else {
        noteIndex = (noteIndex + 1) % SCALE.length
      }
      const freq = SCALE[noteIndex]

      // Bell-like tone: triangle + inharmonic partial
      const osc = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "triangle"
      osc.frequency.value = freq

      osc2.type = "sine"
      osc2.frequency.value = freq * 2.76 // Bell partial

      const osc2Gain = ctx.createGain()
      osc2Gain.gain.value = 0.2
      osc2.connect(osc2Gain)

      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.5, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.05, t + 0.8)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0)

      osc.connect(gain)
      osc2Gain.connect(gain)
      gain.connect(this.masterGain!)

      osc.start(t)
      osc2.start(t)
      osc.stop(t + 2.1)
      osc2.stop(t + 2.1)
    }

    // Play first note after a brief delay
    setTimeout(playArpNote, 1000)

    // Continue on interval with slight randomness
    this.arpTimer = setInterval(() => {
      const jitter = (Math.random() - 0.5) * 800 // ±400ms jitter
      setTimeout(playArpNote, jitter)
    }, ARP_INTERVAL * 1000)
  }
}

/**
 * Singleton ambient music engine instance.
 */
export const ambientMusic = new AmbientMusicEngine()
