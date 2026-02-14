import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "System Updates",
  description: "Changelog and version history for Databricks Sword platform",
}

/**
 * Version update entry type
 */
type UpdateEntry = {
  version: string
  date: string
  type: "major" | "minor" | "patch"
  title: string
  changes: {
    category: "feature" | "fix" | "improvement" | "content"
    description: string
  }[]
}

/**
 * Changelog data - newest first
 */
const UPDATES: UpdateEntry[] = [
  {
    version: "1.2.0",
    date: "2026-02-14",
    type: "minor",
    title: "Enhanced Learning Experience",
    changes: [
      { category: "feature", description: "Added 'Think about it' instructions to all drag-drop stages for better guidance" },
      { category: "feature", description: "Shuffled quiz options, drag-drop blocks, and fill-blank options for variety" },
      { category: "feature", description: "Added learnings section to all interactive stages (quiz, drag-drop, fill-blank)" },
      { category: "fix", description: "Fixed quiz scoring - now correctly handles both string and index-based answers" },
      { category: "fix", description: "Fixed score display showing correct count during quiz progression" },
      { category: "improvement", description: "Added undo functionality to diagram stages" },
      { category: "improvement", description: "Added instructions panel to diagram stages" },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-02-10",
    type: "minor",
    title: "Mission System Launch",
    changes: [
      { category: "feature", description: "Launched 20 story-driven missions across 10 industries" },
      { category: "feature", description: "Added medallion architecture progression: Bronze → Silver → Gold" },
      { category: "feature", description: "Implemented stage types: briefing, diagram, drag-drop, fill-blank, quiz, debrief" },
      { category: "content", description: "Created comprehensive mission content for all Databricks features" },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-02-01",
    type: "major",
    title: "Initial Platform Launch",
    changes: [
      { category: "feature", description: "Core gamification system with 8 military ranks and XP progression" },
      { category: "feature", description: "Challenge library with 50+ standalone challenges" },
      { category: "feature", description: "Spaced repetition (SM-2) for long-term knowledge retention" },
      { category: "feature", description: "Daily Forge streak system with multipliers" },
      { category: "feature", description: "Dark cyberpunk/anime theme with neon accents" },
      { category: "feature", description: "Browser-first progress with cloud sync on login" },
    ],
  },
]

/**
 * Get category badge styles
 */
function getCategoryStyles(category: UpdateEntry["changes"][0]["category"]): string {
  switch (category) {
    case "feature":
      return "bg-anime-cyan/20 text-anime-cyan border-anime-cyan/30"
    case "fix":
      return "bg-anime-accent/20 text-anime-accent border-anime-accent/30"
    case "improvement":
      return "bg-anime-purple/20 text-anime-purple border-anime-purple/30"
    case "content":
      return "bg-anime-yellow/20 text-anime-yellow border-anime-yellow/30"
    default:
      return "bg-anime-700 text-anime-300 border-anime-600"
  }
}

/**
 * Get version type badge styles
 */
function getVersionStyles(type: UpdateEntry["type"]): string {
  switch (type) {
    case "major":
      return "bg-anime-accent/20 text-anime-accent border-anime-accent"
    case "minor":
      return "bg-anime-cyan/20 text-anime-cyan border-anime-cyan"
    case "patch":
      return "bg-anime-700 text-anime-300 border-anime-600"
    default:
      return "bg-anime-700 text-anime-300 border-anime-600"
  }
}

/**
 * Updates/Changelog page
 */
export default function UpdatesPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-anime-950">
      {/* Header */}
      <div className="bg-anime-900 border-b border-anime-700">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-anime-cyan rounded-full animate-pulse" />
            <span className="text-anime-cyan text-xs uppercase tracking-widest font-mono">
              System Changelog
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tight text-white mb-4">
            System <span className="text-anime-accent">Updates</span>
          </h1>
          <p className="text-anime-300 max-w-2xl">
            Track all changes, improvements, and new features added to the Databricks Sword platform.
            Each update brings you closer to Lakehouse mastery.
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="container mx-auto px-4 py-12">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-anime-cyan via-anime-accent to-anime-purple transform md:-translate-x-1/2" />

          {UPDATES.map((update, index) => (
            <div
              key={update.version}
              className={`relative mb-12 md:mb-16 ${
                index % 2 === 0 ? "md:pr-1/2 md:text-right" : "md:pl-1/2 md:ml-auto"
              }`}
            >
              {/* Timeline dot */}
              <div
                className={`absolute left-0 md:left-1/2 w-4 h-4 rounded-full border-2 transform -translate-x-1/2 ${
                  index === 0
                    ? "bg-anime-cyan border-anime-cyan shadow-neon-cyan"
                    : "bg-anime-900 border-anime-700"
                }`}
              />

              {/* Content card */}
              <div
                className={`ml-8 md:ml-0 ${
                  index % 2 === 0 ? "md:mr-12" : "md:ml-12"
                }`}
              >
                <div className="bg-anime-900 border border-anime-700 rounded-lg p-6 hover:border-anime-cyan/50 transition-colors">
                  {/* Version header */}
                  <div className={`flex items-center gap-4 mb-4 ${index % 2 === 0 ? "md:justify-end" : ""}`}>
                    <span
                      className={`px-3 py-1 text-sm font-mono font-bold border rounded ${getVersionStyles(
                        update.type
                      )}`}
                    >
                      v{update.version}
                    </span>
                    <span className="text-anime-400 text-sm font-mono">
                      {update.date}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className={`text-xl font-bold text-white mb-4 ${index % 2 === 0 ? "md:text-right" : ""}`}>
                    {update.title}
                  </h3>

                  {/* Changes list */}
                  <ul className={`space-y-3 ${index % 2 === 0 ? "md:text-left" : ""}`}>
                    {update.changes.map((change, changeIndex) => (
                      <li key={changeIndex} className="flex items-start gap-3">
                        <span
                          className={`shrink-0 px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold border rounded ${getCategoryStyles(
                            change.category
                          )}`}
                        >
                          {change.category}
                        </span>
                        <span className="text-anime-300 text-sm">
                          {change.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="text-center mt-16 pt-8 border-t border-anime-700">
          <p className="text-anime-400 mb-6">
            Want to see what&apos;s coming next? Check out our roadmap or join the community.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/missions"
              className="px-6 py-3 bg-anime-accent text-white font-bold rounded hover:bg-anime-accent/80 transition-colors"
            >
              Start Training
            </Link>
            <Link
              href="/challenges"
              className="px-6 py-3 border border-anime-cyan text-anime-cyan font-bold rounded hover:bg-anime-cyan/10 transition-colors"
            >
              View Challenges
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
