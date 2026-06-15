/**
 * @file StepWelcome.tsx
 * @description Onboarding step 1: introduction to Databricks Sword.
 */
export function StepWelcome(): React.ReactElement {
  return (
    <div>
      <div className="font-mono text-xs tracking-widest text-anime-cyan mb-2">
        [ STEP 1 / 4 ]
      </div>
      <h1
        id="onboarding-title"
        className="font-heading text-3xl font-black text-anime-100 mb-4"
      >
        Welcome, Operator
      </h1>
      <p className="text-anime-300 font-mono mb-4 leading-relaxed">
        Master the Databricks ecosystem through gamified missions. Earn XP,
        climb the ranks, build streaks, and unlock the full power of the
        Lakehouse.
      </p>
      <p className="text-anime-500 font-mono text-sm">
        This tour takes about 60 seconds. You can skip anytime.
      </p>
    </div>
  )
}
