/**
 * Field Operations Mission Briefing Page
 * Shows mission details and start button.
 */

import { getUserSandbox } from "@/app/api/user/helpers"
import { MissionBriefing } from "@/components/field-ops/MissionBriefing"
import { auth } from "@/lib/auth"
import { getIndustryConfig, isIndustryUnlocked } from "@/lib/field-ops/industries"
import type { Industry } from "@/lib/field-ops/types"
import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

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
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const params = await props.params
  const industry = params.industry as Industry

  // Validate industry
  try {
    const config = getIndustryConfig(industry)
    
    // Get user XP from sandbox
    let userXp = 0
    try {
      const sandbox = await getUserSandbox(session.user.id)
      if (sandbox) {
        userXp = sandbox.userStats.totalXp
      }
    } catch (error) {
      console.error("Error fetching user sandbox:", error)
    }

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
