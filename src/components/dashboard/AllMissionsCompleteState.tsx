import Link from "next/link"

/**
 * Empty state shown on the dashboard when the operator has completed every
 * started mission. Replaces the generic "No mission in progress" prompt
 * (which would otherwise be misleading for returning players who have
 * finished all available content).
 */
export function AllMissionsCompleteState() {
  return (
    <section
      aria-labelledby="all-complete-heading"
      data-testid="all-missions-complete-state"
      className="cut-corner border border-anime-accent/40 bg-anime-accent/5 p-6 text-center"
    >
      <h2
        id="all-complete-heading"
        className="text-xl font-heading font-bold text-anime-100 mb-2"
      >
        All missions complete
      </h2>
      <p className="text-anime-400 font-mono text-sm mb-4">
        You&apos;ve cleared every mission in your track. Tackle a challenge or
        explore a Field Op to keep earning XP.
      </p>
      <Link
        href="/challenges"
        className="inline-block px-6 py-2 bg-anime-accent text-anime-950 font-mono font-bold cut-corner hover:bg-anime-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anime-accent"
      >
        Browse Challenges →
      </Link>
    </section>
  )
}
