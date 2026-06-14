import Link from "next/link"

/**
 * Empty state shown on the dashboard when the user has not yet started any
 * mission. Steers them to the canonical "first mission" entry point.
 */
export function NoMissionEmptyState() {
  return (
    <section
      aria-labelledby="empty-state-heading"
      data-testid="no-mission-empty-state"
      className="cut-corner border border-anime-accent/40 bg-anime-accent/5 p-6 text-center"
    >
      <h2
        id="empty-state-heading"
        className="text-xl font-heading font-bold text-anime-100 mb-2"
      >
        No mission in progress
      </h2>
      <p className="text-anime-400 font-mono text-sm mb-4">
        Start your first mission to earn XP and unlock ranks.
      </p>
      <Link
        href="/missions/lakehouse-fundamentals"
        className="inline-block px-6 py-2 bg-anime-accent text-anime-950 font-mono font-bold cut-corner hover:bg-anime-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anime-accent"
      >
        Start First Mission →
      </Link>
    </section>
  )
}
