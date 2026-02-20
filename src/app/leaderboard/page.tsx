"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

type LeaderboardEntry = {
  userId: string
  name: string | null
  image: string | null
  totalXp: number
  rank: {
    id: string
    title: string
  }
  missionsCompleted: number
  currentStreak: number
}

type LeaderboardResponse = {
  success: boolean
  entries?: LeaderboardEntry[]
  totalPlayers?: number
  error?: string
}

export default function LeaderboardPage(): React.ReactElement {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadLeaderboard(): Promise<void> {
      try {
        setLoading(true)
        const response = await fetch("/api/leaderboard", { cache: "no-store" })
        const data = (await response.json()) as LeaderboardResponse

        if (!response.ok || !data.success) {
          setError(data.error || "Failed to load leaderboard")
          return
        }

        setEntries(data.entries ?? [])
      } catch {
        setError("Failed to load leaderboard")
      } finally {
        setLoading(false)
      }
    }

    void loadLeaderboard()
  }, [])

  return (
    <div className="min-h-screen bg-anime-950 pt-24 pb-12 text-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-black italic tracking-tight text-white">Leaderboard</h1>
          <p className="mt-2 text-sm uppercase tracking-widest text-gray-400">
            Top operators by XP and mission completion
          </p>
        </div>

        {loading ? (
          <div className="cut-corner border border-anime-700 bg-anime-900 p-6 text-gray-300">
            Loading leaderboard...
          </div>
        ) : error ? (
          <div className="cut-corner border border-red-500/40 bg-red-500/10 p-6 text-red-200">
            {error}
          </div>
        ) : entries.length === 0 ? (
          <div className="cut-corner border border-anime-700 bg-anime-900 p-6 text-gray-300">
            No players yet. Be the first to complete a mission.
          </div>
        ) : (
          <div className="overflow-hidden cut-corner border border-anime-700 bg-anime-900">
            <ul className="divide-y divide-anime-800">
              {entries.map((entry, index) => (
                <li key={entry.userId} className="p-4 sm:p-5">
                  <Link
                    href={`/u/${entry.userId}`}
                    className="group flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 text-center font-mono text-sm text-anime-cyan">#{index + 1}</div>

                      {entry.image ? (
                        <img
                          src={entry.image}
                          alt={entry.name || "Player avatar"}
                          className="h-10 w-10 rounded-full border border-anime-700 object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-anime-700 bg-anime-800 text-sm text-gray-300">
                          {(entry.name || "U").charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <p className="font-semibold text-white group-hover:text-anime-cyan transition-colors">
                          {entry.name || "Unknown Operator"}
                        </p>
                        <p className="text-xs uppercase tracking-wide text-gray-400">{entry.rank.title}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm sm:min-w-[320px]">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">XP</p>
                        <p className="font-mono text-anime-cyan">{entry.totalXp.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">Missions</p>
                        <p className="font-mono text-gray-200">{entry.missionsCompleted}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">Streak</p>
                        <p className="font-mono text-gray-200">{entry.currentStreak}</p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
