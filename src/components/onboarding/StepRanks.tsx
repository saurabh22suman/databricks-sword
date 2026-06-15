/**
 * @file StepRanks.tsx
 * @description Onboarding step 2: explain the XP + rank progression system.
 */
const RANKS: { emoji: string; label: string; threshold: string; accent: string }[] = [
  { emoji: "🥉", label: "Bronze", threshold: "0 XP", accent: "border-anime-cyan/30" },
  { emoji: "🥈", label: "Silver", threshold: "1,000 XP", accent: "border-anime-cyan/30" },
  { emoji: "🥇", label: "Gold", threshold: "5,000 XP", accent: "border-anime-cyan/30" },
  { emoji: "💎", label: "Diamond", threshold: "25,000 XP", accent: "border-anime-accent/30" },
]

export function StepRanks(): React.ReactElement {
  return (
    <div>
      <div className="font-mono text-xs tracking-widest text-anime-cyan mb-2">
        [ STEP 2 / 4 ]
      </div>
      <h1
        id="onboarding-title"
        className="font-heading text-3xl font-black text-anime-100 mb-4"
      >
        Ranks &amp; XP
      </h1>
      <p className="text-anime-300 font-mono mb-6 leading-relaxed">
        Every mission you complete earns XP. XP unlocks higher ranks. Each rank
        has its own badge and unlocks new perks.
      </p>
      <div className="grid grid-cols-2 gap-2 text-sm font-mono">
        {RANKS.map((r) => (
          <div
            key={r.label}
            className={`cut-corner border ${r.accent} bg-anime-950/50 p-3`}
          >
            <div className="text-2xl mb-1">{r.emoji}</div>
            <div className="text-anime-100 font-bold">{r.label}</div>
            <div className="text-anime-500 text-xs">{r.threshold}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
