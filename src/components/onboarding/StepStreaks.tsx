/**
 * @file StepStreaks.tsx
 * @description Onboarding step 3: explain the daily streak + freeze system.
 */
export function StepStreaks(): React.ReactElement {
  return (
    <div>
      <div className="font-mono text-xs tracking-widest text-anime-cyan mb-2">
        [ STEP 3 / 4 ]
      </div>
      <h1
        id="onboarding-title"
        className="font-heading text-3xl font-black text-anime-100 mb-4"
      >
        Daily Streaks
      </h1>
      <p className="text-anime-300 font-mono mb-4 leading-relaxed">
        Complete a mission every day to build a streak. Longer streaks
        multiply your XP (up to 2x).
      </p>
      <p className="text-anime-300 font-mono mb-4 leading-relaxed">
        Missed a day? Use a{" "}
        <span className="text-anime-cyan">❄️ streak freeze</span> to keep it
        alive. You start with 2 freezes.
      </p>
      <p className="text-anime-500 font-mono text-sm">
        Skip 2+ days in a row and your streak resets to 1.
      </p>
    </div>
  )
}
