/**
 * Field Operations Mission Briefing Page
 * Shows mission details and start button.
 */

import { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getIndustryConfig, isIndustryUnlocked } from "@/lib/field-ops/industries"
import { MissionBriefing } from "@/components/field-ops/MissionBriefing"
import type { Industry } from "@/lib/field-ops/types"

type PageProps = {
  params: Promise<{ industry: string }>
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params
  const industry = params.industry as Industry
  const config = getIndustryConfig(industry)

  return {
    title: `${config.title} | Field Operations`,
    description: config.description,
  }
}

export default async function IndustryMissionPage(
  props: PageProps
): Promise<React.ReactElement> {
  const session = await auth()
  if (!session?.user?.email) {
    redirect("/auth/signin")
  }

  const params = await props.params
  const industry = params.industry as Industry

  // Validate industry
  try {
    const config = getIndustryConfig(industry)
    
    // TODO: Get user XP from profile
    const userXp = 0

    // Check if unlocked
    if (!isIndustryUnlocked(industry, userXp)) {
      return (
        <div className="min-h-screen bg-anime-950 flex items-center justify-center">
          <div className="cut-corner bg-anime-900 border border-anime-700 p-8 max-w-md text-center">
            <span className="text-6xl mb-4 block">🔒</span>
            <h1 className="font-heading text-2xl text-anime-cyan mb-2">
              Industry Locked
            </h1>
            <p className="text-anime-300 mb-4">
              Requires {config.xpRequired.toLocaleString()} XP to unlock
            </p>
            <a
              href="/field-ops"
              className="inline-block cut-corner bg-anime-cyan hover:bg-anime-accent text-anime-950 font-semibold px-6 py-2 transition-colors"
            >
              Back to Field Ops
            </a>
          </div>
        </div>
      )
    }

    return <MissionBriefing industry={industry} config={config} />
  } catch (error) {
    notFound()
  }
}
