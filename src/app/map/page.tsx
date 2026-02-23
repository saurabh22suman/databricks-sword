import { MissionMap } from "@/components/map"
import { auth } from "@/lib/auth"
import { getAllIndustries } from "@/lib/field-ops/industries"
import { getAllMissions } from "@/lib/missions"
import { Metadata } from "next"

/**
 * Map page metadata.
 */
export const metadata: Metadata = {
  title: "Mission Map | Databricks Sword",
  description: "Interactive circuit-board map showing all missions and Field Operations progression paths.",
}

/**
 * Mission Map Page
 *
 * Server component that loads missions and field ops data,
 * then renders the interactive MissionMap client component.
 */
export default async function MapPage(): Promise<React.ReactElement> {
  const sessionPromise = auth()
  const [missions, fieldOps, session] = await Promise.all([
    getAllMissions(),
    Promise.resolve(getAllIndustries()),
    sessionPromise,
  ])
  const isGuest = !session?.user

  return (
    <main className="h-[calc(100vh-4rem)] w-full overflow-hidden mt-16">
      <MissionMap missions={missions} fieldOps={fieldOps} isGuest={isGuest} />
    </main>
  )
}
