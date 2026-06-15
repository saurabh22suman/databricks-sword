"use client"

/**
 * @file OnboardingFlow.tsx
 * @description 4-step onboarding wizard for new operators. Step state is
 * local; completion is persisted via markOnboardingComplete() so the
 * settings page can "Replay tour" by clearing the flag.
 */
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { markOnboardingComplete } from "@/lib/onboarding/state"
import { StepPickMission } from "./StepPickMission"
import { StepRanks } from "./StepRanks"
import { StepStreaks } from "./StepStreaks"
import { StepWelcome } from "./StepWelcome"

const STEPS = ["welcome", "ranks", "streaks", "pick"] as const
type Step = (typeof STEPS)[number]

export function OnboardingFlow(): React.ReactElement {
  const [step, setStep] = useState<Step>("welcome")
  const router = useRouter()

  const complete = () => {
    markOnboardingComplete()
    router.push("/")
  }

  const skip = () => complete()
  const next = () => {
    if (step === "welcome") setStep("ranks")
    else if (step === "ranks") setStep("streaks")
    else if (step === "streaks") setStep("pick")
    else complete()
  }
  const back = () => {
    if (step === "ranks") setStep("welcome")
    else if (step === "streaks") setStep("ranks")
    else if (step === "pick") setStep("streaks")
  }

  // Keyboard shortcuts: Enter -> next, Escape -> skip. Ignored when focus is
  // inside a form control so users can still type or activate buttons.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA" || tag === "A" || target.isContentEditable) {
          return
        }
      }
      if (e.key === "Enter") {
        e.preventDefault()
        next()
      } else if (e.key === "Escape") {
        e.preventDefault()
        skip()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const currentIdx = STEPS.indexOf(step)
  const total = STEPS.length

  return (
    <div
      className="bg-anime-950 min-h-screen flex items-center justify-center px-4 py-12"
    >
      <section
        className="cut-corner border-2 border-anime-cyan/50 bg-anime-900 max-w-2xl w-full p-8"
        role="dialog"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-step-indicator"
      >
        {/* Progress bar + skip */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2" role="tablist" aria-label="Onboarding progress">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-2 w-8 ${i <= currentIdx ? "bg-anime-cyan" : "bg-anime-700"}`}
                aria-current={i === currentIdx ? "step" : undefined}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={skip}
            className="text-anime-500 hover:text-anime-300 text-sm font-mono"
          >
            Skip
          </button>
        </div>

        {step === "welcome" && <StepWelcome />}
        {step === "ranks" && <StepRanks />}
        {step === "streaks" && <StepStreaks />}
        {step === "pick" && <StepPickMission />}

        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={back}
            disabled={step === "welcome"}
            className="px-4 py-2 border border-anime-500 text-anime-300 font-mono disabled:opacity-30 hover:bg-anime-800 disabled:cursor-not-allowed"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={next}
            className="px-4 py-2 bg-anime-cyan text-anime-950 font-mono font-bold hover:bg-anime-cyan/80"
          >
            {step === "pick" ? "Finish" : "Next →"}
          </button>
        </div>

        <div
          id="onboarding-step-indicator"
          className="text-anime-500 text-xs font-mono text-center mt-4"
        >
          Step {currentIdx + 1} of {total}
        </div>
      </section>
    </div>
  )
}
