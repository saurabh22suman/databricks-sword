import { getUserSandbox } from "@/app/api/user/helpers"
import { getDb } from "@/lib/db/client"
import { users } from "@/lib/db/schema"
import { getRankForXp } from "@/lib/gamification/ranks"
import { eq } from "drizzle-orm"

type PageProps = {
  params: Promise<{ userId: string }>
}

export const dynamic = "force-dynamic"

export default async function PublicUserPage({ params }: PageProps): Promise<React.ReactElement> {
  const { userId } = await params

  const [user] = await getDb()
    .select({
      id: users.id,
      name: users.name,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    return (
      <div className="min-h-screen bg-anime-950 pt-24 pb-12 text-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="cut-corner border border-anime-700 bg-anime-900 p-6 text-gray-300">
            User not found.
          </div>
        </div>
      </div>
    )
  }

  const sandbox = await getUserSandbox(user.id)

  if (!sandbox) {
    return (
      <div className="min-h-screen bg-anime-950 pt-24 pb-12 text-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="cut-corner border border-anime-700 bg-anime-900 p-6">
            <div className="flex items-center gap-4">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || "User avatar"}
                  className="h-14 w-14 rounded-full border border-anime-700 object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-anime-700 bg-anime-800 text-lg text-gray-300">
                  {(user.name || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-white">{user.name || "Unknown Operator"}</h1>
                <p className="text-sm text-gray-400">No public progress snapshot available.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const totalXp = sandbox.userStats.totalXp
  const rank = getRankForXp(totalXp)

  return (
    <div className="min-h-screen bg-anime-950 pt-24 pb-12 text-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="cut-corner border border-anime-700 bg-anime-900 p-6">
          <div className="flex items-center gap-4">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || "User avatar"}
                className="h-14 w-14 rounded-full border border-anime-700 object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-anime-700 bg-anime-800 text-lg text-gray-300">
                {(user.name || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">{user.name || "Unknown Operator"}</h1>
              <p className="text-sm uppercase tracking-widest text-gray-400">Public Profile</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded border border-anime-800 bg-anime-950 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Rank</p>
              <p className="mt-1 font-semibold text-anime-cyan">{rank.title}</p>
            </div>
            <div className="rounded border border-anime-800 bg-anime-950 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">XP</p>
              <p className="mt-1 font-mono text-gray-200">{totalXp.toLocaleString()}</p>
            </div>
            <div className="rounded border border-anime-800 bg-anime-950 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Missions</p>
              <p className="mt-1 font-mono text-gray-200">{sandbox.userStats.totalMissionsCompleted}</p>
            </div>
            <div className="rounded border border-anime-800 bg-anime-950 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Current Streak</p>
              <p className="mt-1 font-mono text-gray-200">{sandbox.streakData.currentStreak}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
