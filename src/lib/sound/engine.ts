/**
 * @file engine.ts
 * @description Web Audio API cyberpunk sound engine — game-quality SFX.
 *
 * Every sound uses layered oscillators, convolution-style reverb,
 * filtered noise textures, and proper ADSR envelopes to produce
 * polished game-like audio feedback. No audio files needed.
 *
 * The AudioContext is lazily initialized on first play to comply
 * with browser autoplay policies requiring a user gesture.
 */

import type { SoundId } from "./types"

/** Master volume for all SFX (0–1). Kept moderate so music can coexist. */
const MASTER_VOLUME = 0.25

/**
 * Singleton cyberpunk sound engine using the Web Audio API.
 * Creates rich procedural sounds for each game event.
 */
class CyberSoundEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private reverbNode: ConvolverNode | null = null

  /**
   * Lazily initialise AudioContext on first interaction.
   */
  private ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = MASTER_VOLUME
      this.masterGain.connect(this.ctx.destination)

      // Build a short impulse-response reverb for spatial depth
      this.reverbNode = this.buildReverb(this.ctx, 0.8, 2)
      this.reverbNode.connect(this.masterGain)
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume()
    }
    return this.ctx
  }

  /** Master output node */
  private get out(): GainNode {
    this.ensureContext()
    return this.masterGain!
  }

  /** Reverb send bus */
  private get reverb(): ConvolverNode {
    this.ensureContext()
    return this.reverbNode!
  }

  /**
   * Build a synthetic impulse-response buffer for convolution reverb.
   * Produces a natural-sounding room reverb with exponential decay.
   */
  private buildReverb(ctx: AudioContext, decay: number, duration: number): ConvolverNode {
    const length = ctx.sampleRate * duration
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch)
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay * 3)
      }
    }
    const convolver = ctx.createConvolver()
    convolver.buffer = impulse
    return convolver
  }

  /**
   * Create a filtered noise burst — useful as a transient click or impact.
   */
  private noiseShot(
    ctx: AudioContext,
    t: number,
    duration: number,
    freq: number,
    q: number,
    volume: number,
    dest: AudioNode,
    filterType: BiquadFilterType = "bandpass",
  ): void {
    const len = Math.max(1, Math.floor(ctx.sampleRate * duration))
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1
    }
    const src = ctx.createBufferSource()
    src.buffer = buf

    const filter = ctx.createBiquadFilter()
    filter.type = filterType
    filter.frequency.value = freq
    filter.Q.value = q

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration)

    src.connect(filter)
    filter.connect(gain)
    gain.connect(dest)

    src.start(t)
    src.stop(t + duration)
  }

  /**
   * Play a sound effect by ID.
   */
  play(id: SoundId): void {
    try {
      switch (id) {
        case "click":
          this.playClick()
          break
        case "navigate":
          this.playNavigate()
          break
        case "xp-gain":
          this.playXpGain()
          break
        case "quiz-correct":
          this.playQuizCorrect()
          break
        case "quiz-incorrect":
          this.playQuizIncorrect()
          break
        case "stage-complete":
          this.playStageComplete()
          break
        case "quiz-complete":
          this.playQuizComplete()
          break
        case "challenge-complete":
          this.playChallengeComplete()
          break
        case "achievement-unlock":
          this.playAchievementUnlock()
          break
        case "mission-complete":
          this.playMissionComplete()
          break
        case "rank-up":
          this.playRankUp()
          break
      }
    } catch {
      // Sound is non-critical — swallow errors silently
    }
  }

  // ---------------------------------------------------------------------------
  // Sound design — each method crafts a distinct, game-quality sound
  // ---------------------------------------------------------------------------

  /**
   * Click — short metallic tap, like tapping a cyber-terminal glass panel.
   * Filtered noise transient + very brief high sine ping.
   */
  private playClick(): void {
    const ctx = this.ensureContext()
    const t = ctx.currentTime

    // Metallic tap — high-frequency bandpass noise burst (20ms)
    this.noiseShot(ctx, t, 0.02, 6000, 4, 0.08, this.out, "bandpass")

    // Glass ping — fast decay sine at 3200 Hz
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.setValueAtTime(3200, t)
    osc.frequency.exponentialRampToValueAtTime(2400, t + 0.03)
    gain.gain.setValueAtTime(0.06, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
    osc.connect(gain)
    gain.connect(this.out)
    osc.start(t)
    osc.stop(t + 0.05)
  }

  /**
   * Navigate — soft filtered whoosh like a holographic panel sliding.
   * Rising noise sweep + subtle tonal tail.
   */
  private playNavigate(): void {
    const ctx = this.ensureContext()
    const t = ctx.currentTime

    // Whoosh — bandpass noise with sweeping center frequency
    const len = Math.floor(ctx.sampleRate * 0.15)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1
    }
    const src = ctx.createBufferSource()
    src.buffer = buf

    const filter = ctx.createBiquadFilter()
    filter.type = "bandpass"
    filter.frequency.setValueAtTime(800, t)
    filter.frequency.exponentialRampToValueAtTime(4000, t + 0.08)
    filter.frequency.exponentialRampToValueAtTime(1500, t + 0.15)
    filter.Q.value = 2

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.07, t + 0.03)
    gain.gain.linearRampToValueAtTime(0.05, t + 0.08)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15)

    src.connect(filter)
    filter.connect(gain)
    gain.connect(this.out)
    src.start(t)
    src.stop(t + 0.16)

    // Subtle tone tail — barely audible sine glide
    const osc = ctx.createOscillator()
    const toneGain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.setValueAtTime(600, t + 0.04)
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.12)
    toneGain.gain.setValueAtTime(0.02, t + 0.04)
    toneGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14)
    osc.connect(toneGain)
    toneGain.connect(this.out)
    osc.start(t + 0.04)
    osc.stop(t + 0.15)
  }

  /**
   * XP Gain — satisfying coin/crystal pickup. Bright metallic chime
   * with harmonic overtones and a reverb tail.
   * Think: collecting a gem in a game.
   */
  private playXpGain(): void {
    const ctx = this.ensureContext()
    const t = ctx.currentTime

    // Main chime — triangle wave for a bell-like quality
    const fundamentals = [1318.5, 1760] // E6, A6 — bright interval
    fundamentals.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "triangle"
      osc.frequency.value = freq

      const start = t + i * 0.06
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.12, start + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.02, start + 0.15)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35)

      osc.connect(gain)
      gain.connect(this.out)
      // Send a bit to reverb for sparkle
      const reverbSend = ctx.createGain()
      reverbSend.gain.value = 0.15
      gain.connect(reverbSend)
      reverbSend.connect(this.reverb)

      osc.start(start)
      osc.stop(start + 0.36)
    })

    // Sparkle transient — high noise pop
    this.noiseShot(ctx, t, 0.015, 8000, 3, 0.06, this.out, "highpass")
  }

  /**
   * Quiz Correct — warm affirming two-note rise (perfect 4th interval).
   * Sine + soft triangle harmonics, brief reverb shimmer.
   */
  private playQuizCorrect(): void {
    const ctx = this.ensureContext()
    const t = ctx.currentTime

    const notes = [
      { freq: 880, start: 0, type: "sine" as OscillatorType },       // A5
      { freq: 1174.66, start: 0.08, type: "sine" as OscillatorType }, // D6 (perfect 4th up)
    ]

    notes.forEach(({ freq, start, type }) => {
      const osc = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = type
      osc.frequency.value = freq

      // Slight detuned double for warmth
      osc2.type = "triangle"
      osc2.frequency.value = freq * 1.003

      const s = t + start
      gain.gain.setValueAtTime(0, s)
      gain.gain.linearRampToValueAtTime(0.1, s + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.02, s + 0.12)
      gain.gain.exponentialRampToValueAtTime(0.001, s + 0.25)

      osc.connect(gain)
      osc2.connect(gain)
      gain.connect(this.out)

      const reverbSend = ctx.createGain()
      reverbSend.gain.value = 0.1
      gain.connect(reverbSend)
      reverbSend.connect(this.reverb)

      osc.start(s)
      osc2.start(s)
      osc.stop(s + 0.26)
      osc2.stop(s + 0.26)
    })
  }

  /**
   * Quiz Incorrect — low buzz with descending pitch. Feels wrong but
   * not punishing. Short filtered sawtooth with a thud.
   */
  private playQuizIncorrect(): void {
    const ctx = this.ensureContext()
    const t = ctx.currentTime

    // Low thud — filtered noise
    this.noiseShot(ctx, t, 0.06, 200, 2, 0.1, this.out, "lowpass")

    // Descending buzz
    const osc = ctx.createOscillator()
    const filter = ctx.createBiquadFilter()
    const gain = ctx.createGain()

    osc.type = "sawtooth"
    osc.frequency.setValueAtTime(300, t)
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.2)

    filter.type = "lowpass"
    filter.frequency.setValueAtTime(1200, t)
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.2)
    filter.Q.value = 2

    gain.gain.setValueAtTime(0.07, t)
    gain.gain.linearRampToValueAtTime(0.09, t + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.out)

    osc.start(t)
    osc.stop(t + 0.22)
  }

  /**
   * Stage Complete — ascending 4-note arpeggio with bell timbre.
   * Each note: triangle + sine harmonic. Short reverb tail.
   */
  private playStageComplete(): void {
    const ctx = this.ensureContext()
    const t = ctx.currentTime

    // C5 → E5 → G5 → C6  (major arpeggio)
    const notes = [523.25, 659.25, 783.99, 1046.5]

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "triangle"
      osc.frequency.value = freq

      // Bell partial — 2.76x harmonic gives a glassy sound
      osc2.type = "sine"
      osc2.frequency.value = freq * 2.76

      const s = t + i * 0.09
      gain.gain.setValueAtTime(0, s)
      gain.gain.linearRampToValueAtTime(0.1, s + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.02, s + 0.2)
      gain.gain.exponentialRampToValueAtTime(0.001, s + 0.4)

      const mix = ctx.createGain()
      mix.gain.value = 0.4 // harmonic is quieter
      osc2.connect(mix)

      osc.connect(gain)
      mix.connect(gain)
      gain.connect(this.out)

      // Reverb send for tail
      const reverbSend = ctx.createGain()
      reverbSend.gain.value = 0.12
      gain.connect(reverbSend)
      reverbSend.connect(this.reverb)

      osc.start(s)
      osc2.start(s)
      osc.stop(s + 0.41)
      osc2.stop(s + 0.41)
    })

    // Completion sparkle — soft noise pop at end
    this.noiseShot(ctx, t + 0.3, 0.04, 6000, 2, 0.04, this.out, "highpass")
  }

  /**
   * Quiz Complete — sustained major chord with soft pad quality.
   * Sine cluster with detuning for chorus effect + reverb bloom.
   */
  private playQuizComplete(): void {
    const ctx = this.ensureContext()
    const t = ctx.currentTime

    const chord = [523.25, 659.25, 783.99] // C5-E5-G5

    chord.forEach((freq) => {
      // Each chord voice: two slightly detuned oscillators for thickness
      for (let d = -1; d <= 1; d += 2) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = "sine"
        osc.frequency.value = freq + d * 1.5 // ±1.5 Hz detune

        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.06, t + 0.04)
        gain.gain.linearRampToValueAtTime(0.05, t + 0.3)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7)

        osc.connect(gain)
        gain.connect(this.out)

        // Heavy reverb send for pad-like bloom
        const reverbSend = ctx.createGain()
        reverbSend.gain.value = 0.25
        gain.connect(reverbSend)
        reverbSend.connect(this.reverb)

        osc.start(t)
        osc.stop(t + 0.71)
      }
    })

    // High shimmer — delayed octave ping
    const shimmer = ctx.createOscillator()
    const shimmerGain = ctx.createGain()
    shimmer.type = "triangle"
    shimmer.frequency.value = 1046.5 // C6
    shimmerGain.gain.setValueAtTime(0.03, t + 0.15)
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
    shimmer.connect(shimmerGain)
    shimmerGain.connect(this.reverb)
    shimmer.start(t + 0.15)
    shimmer.stop(t + 0.51)
  }

  /**
   * Challenge Complete — rising sweep into bright chord pop.
   * Filtered sawtooth rise → chord hit → reverb tail.
   */
  private playChallengeComplete(): void {
    const ctx = this.ensureContext()
    const t = ctx.currentTime

    // Rising sweep (0–250ms)
    const sweep = ctx.createOscillator()
    const sweepFilter = ctx.createBiquadFilter()
    const sweepGain = ctx.createGain()

    sweep.type = "sawtooth"
    sweep.frequency.setValueAtTime(200, t)
    sweep.frequency.exponentialRampToValueAtTime(800, t + 0.25)

    sweepFilter.type = "lowpass"
    sweepFilter.frequency.setValueAtTime(400, t)
    sweepFilter.frequency.exponentialRampToValueAtTime(3000, t + 0.25)
    sweepFilter.Q.value = 4

    sweepGain.gain.setValueAtTime(0.05, t)
    sweepGain.gain.linearRampToValueAtTime(0.08, t + 0.15)
    sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28)

    sweep.connect(sweepFilter)
    sweepFilter.connect(sweepGain)
    sweepGain.connect(this.out)
    sweep.start(t)
    sweep.stop(t + 0.29)

    // Bright chord pop at 200ms — C6+E6+G6 (bell timbre)
    const chordFreqs = [1046.5, 1318.5, 1568]
    const chordTime = t + 0.2

    chordFreqs.forEach((freq) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "triangle"
      osc.frequency.value = freq

      gain.gain.setValueAtTime(0, chordTime)
      gain.gain.linearRampToValueAtTime(0.08, chordTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.01, chordTime + 0.2)
      gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 0.4)

      osc.connect(gain)
      gain.connect(this.out)

      const rs = ctx.createGain()
      rs.gain.value = 0.2
      gain.connect(rs)
      rs.connect(this.reverb)

      osc.start(chordTime)
      osc.stop(chordTime + 0.41)
    })

    // Impact noise at chord hit
    this.noiseShot(ctx, chordTime, 0.02, 5000, 3, 0.06, this.out, "bandpass")
  }

  /**
   * Achievement Unlock — layered fanfare with metallic shimmer.
   * Impact → ascending bell notes → sustained chord → reverb bloom.
   * The "you earned something special" moment.
   */
  private playAchievementUnlock(): void {
    const ctx = this.ensureContext()
    const t = ctx.currentTime

    // Impact hit — noise burst
    this.noiseShot(ctx, t, 0.04, 3000, 2, 0.1, this.out, "bandpass")

    // Bell fanfare — 3 ascending notes with metallic timbre
    const fanfareNotes = [880, 1174.66, 1760] // A5, D6, A6
    fanfareNotes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const harmonic = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "triangle"
      osc.frequency.value = freq

      harmonic.type = "sine"
      harmonic.frequency.value = freq * 3 // 3rd harmonic for bell

      const s = t + 0.04 + i * 0.1

      const harmonicGain = ctx.createGain()
      harmonicGain.gain.value = 0.15
      harmonic.connect(harmonicGain)

      gain.gain.setValueAtTime(0, s)
      gain.gain.linearRampToValueAtTime(0.1, s + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.02, s + 0.2)
      gain.gain.exponentialRampToValueAtTime(0.001, s + 0.5)

      osc.connect(gain)
      harmonicGain.connect(gain)
      gain.connect(this.out)

      const rs = ctx.createGain()
      rs.gain.value = 0.2
      gain.connect(rs)
      rs.connect(this.reverb)

      osc.start(s)
      harmonic.start(s)
      osc.stop(s + 0.51)
      harmonic.stop(s + 0.51)
    })

    // Sustained pad chord at the end — C6+E6 (warm pad bloom)
    const padTime = t + 0.35
    ;[1046.5, 1318.5].forEach((freq) => {
      for (let d = -1; d <= 1; d += 2) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = "sine"
        osc.frequency.value = freq + d * 1.2

        gain.gain.setValueAtTime(0, padTime)
        gain.gain.linearRampToValueAtTime(0.035, padTime + 0.1)
        gain.gain.exponentialRampToValueAtTime(0.001, padTime + 0.6)

        osc.connect(gain)
        gain.connect(this.reverb)

        osc.start(padTime)
        osc.stop(padTime + 0.61)
      }
    })
  }

  /**
   * Mission Complete — epic orchestral moment.
   * Low sweep → impact → triumphant ascending chord → long reverb tail.
   * The biggest reward sound after mission-complete.
   */
  private playMissionComplete(): void {
    const ctx = this.ensureContext()
    const t = ctx.currentTime

    // Low sweep build-up (0–400ms)
    const sweep = ctx.createOscillator()
    const sweepFilter = ctx.createBiquadFilter()
    const sweepGain = ctx.createGain()

    sweep.type = "sawtooth"
    sweep.frequency.setValueAtTime(100, t)
    sweep.frequency.exponentialRampToValueAtTime(600, t + 0.4)

    sweepFilter.type = "lowpass"
    sweepFilter.frequency.setValueAtTime(200, t)
    sweepFilter.frequency.exponentialRampToValueAtTime(2500, t + 0.4)
    sweepFilter.Q.value = 5

    sweepGain.gain.setValueAtTime(0.04, t)
    sweepGain.gain.linearRampToValueAtTime(0.1, t + 0.3)
    sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45)

    sweep.connect(sweepFilter)
    sweepFilter.connect(sweepGain)
    sweepGain.connect(this.out)
    sweep.start(t)
    sweep.stop(t + 0.46)

    // Impact noise at 350ms
    this.noiseShot(ctx, t + 0.35, 0.05, 4000, 2, 0.12, this.out, "bandpass")

    // Triumphant chord: C5-E5-G5-B5-C6 (major 7th)
    const chord = [523.25, 659.25, 783.99, 987.77, 1046.5]
    const chordTime = t + 0.38

    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = i % 2 === 0 ? "triangle" : "sine"
      osc.frequency.value = freq

      osc2.type = "sine"
      osc2.frequency.value = freq * 1.002 // Chorus

      gain.gain.setValueAtTime(0, chordTime)
      gain.gain.linearRampToValueAtTime(0.06, chordTime + 0.02)
      gain.gain.linearRampToValueAtTime(0.05, chordTime + 0.4)
      gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 0.9)

      osc.connect(gain)
      osc2.connect(gain)
      gain.connect(this.out)

      const rs = ctx.createGain()
      rs.gain.value = 0.3
      gain.connect(rs)
      rs.connect(this.reverb)

      osc.start(chordTime)
      osc2.start(chordTime)
      osc.stop(chordTime + 0.91)
      osc2.stop(chordTime + 0.91)
    })

    // High shimmer tail — delayed octave harmonics
    const shimmerTime = t + 0.7
    ;[2093, 2637, 3136].forEach((freq) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = freq

      gain.gain.setValueAtTime(0.015, shimmerTime)
      gain.gain.exponentialRampToValueAtTime(0.001, shimmerTime + 0.5)

      osc.connect(gain)
      gain.connect(this.reverb)

      osc.start(shimmerTime)
      osc.stop(shimmerTime + 0.51)
    })
  }

  /**
   * Rank Up — the most dramatic sound in the system.
   * Sub-bass rumble → dramatic sweep → impact → power chord → cascading bells → long reverb.
   * Think: levelling up in a JRPG, that epic moment.
   */
  private playRankUp(): void {
    const ctx = this.ensureContext()
    const t = ctx.currentTime

    // Sub-bass rumble (0–500ms)
    const sub = ctx.createOscillator()
    const subGain = ctx.createGain()
    sub.type = "sine"
    sub.frequency.setValueAtTime(40, t)
    sub.frequency.linearRampToValueAtTime(60, t + 0.5)
    subGain.gain.setValueAtTime(0.08, t)
    subGain.gain.linearRampToValueAtTime(0.12, t + 0.3)
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
    sub.connect(subGain)
    subGain.connect(this.out)
    sub.start(t)
    sub.stop(t + 0.56)

    // Dramatic filtered sweep (200–600ms)
    const sweep = ctx.createOscillator()
    const sweepFilter = ctx.createBiquadFilter()
    const sweepGain = ctx.createGain()

    sweep.type = "sawtooth"
    sweep.frequency.setValueAtTime(80, t + 0.2)
    sweep.frequency.exponentialRampToValueAtTime(1200, t + 0.55)

    sweepFilter.type = "lowpass"
    sweepFilter.frequency.setValueAtTime(150, t + 0.2)
    sweepFilter.frequency.exponentialRampToValueAtTime(6000, t + 0.55)
    sweepFilter.Q.value = 6

    sweepGain.gain.setValueAtTime(0.05, t + 0.2)
    sweepGain.gain.linearRampToValueAtTime(0.12, t + 0.45)
    sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6)

    sweep.connect(sweepFilter)
    sweepFilter.connect(sweepGain)
    sweepGain.connect(this.out)
    sweep.start(t + 0.2)
    sweep.stop(t + 0.61)

    // Impact burst at 550ms
    this.noiseShot(ctx, t + 0.55, 0.06, 3000, 2, 0.14, this.out, "bandpass")

    // Power chord: C4-G4-C5-E5-G5 with sawtooth + sine layers
    const powerChord = [261.63, 392, 523.25, 659.25, 783.99]
    const chordTime = t + 0.55

    powerChord.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = i < 2 ? "sawtooth" : "triangle"
      osc.frequency.value = freq

      osc2.type = "sine"
      osc2.frequency.value = freq * 1.004

      const filter = ctx.createBiquadFilter()
      filter.type = "lowpass"
      filter.frequency.value = 3000
      filter.Q.value = 1

      gain.gain.setValueAtTime(0, chordTime)
      gain.gain.linearRampToValueAtTime(0.06, chordTime + 0.02)
      gain.gain.linearRampToValueAtTime(0.05, chordTime + 0.5)
      gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 1.0)

      osc.connect(filter)
      osc2.connect(filter)
      filter.connect(gain)
      gain.connect(this.out)

      const rs = ctx.createGain()
      rs.gain.value = 0.25
      gain.connect(rs)
      rs.connect(this.reverb)

      osc.start(chordTime)
      osc2.start(chordTime)
      osc.stop(chordTime + 1.01)
      osc2.stop(chordTime + 1.01)
    })

    // Cascading bell notes (700ms–1200ms) — descending then resolving up
    const bells = [
      { freq: 2093, time: 0.7 },   // C7
      { freq: 1760, time: 0.8 },   // A6
      { freq: 1568, time: 0.9 },   // G6
      { freq: 2093, time: 1.0 },   // C7 — resolve up
      { freq: 2637, time: 1.1 },   // E7 — final sparkle
    ]

    bells.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "triangle"
      osc.frequency.value = freq

      const s = t + time
      gain.gain.setValueAtTime(0, s)
      gain.gain.linearRampToValueAtTime(0.04, s + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.005, s + 0.15)
      gain.gain.exponentialRampToValueAtTime(0.001, s + 0.35)

      osc.connect(gain)
      gain.connect(this.reverb) // Bells go through reverb only for distance

      osc.start(s)
      osc.stop(s + 0.36)
    })
  }
}

/**
 * Singleton instance of the sound engine.
 * Created lazily — the AudioContext is only initialized on first play().
 */
export const cyberSoundEngine = new CyberSoundEngine()
