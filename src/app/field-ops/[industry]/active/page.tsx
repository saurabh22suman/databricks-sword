/**
 * Active Mission Page
 * Shows deployed mission with validation and cleanup controls.
 */

import { ActiveMission } from "@/components/field-ops/ActiveMission"
import { auth } from "@/lib/auth"
import { MOCK_SESSION, isMockAuth } from "@/lib/auth/mockSession"
import { fieldOpsDeployments, getDb } from "@/lib/db"
import { loadFieldOpsContent } from "@/lib/field-ops/content"
import { getIndustryConfig } from "@/lib/field-ops/industries"
import type { Industry } from "@/lib/field-ops/types"
import { and, desc, eq, notInArray } from "drizzle-orm"
import { Metadata } from "next"
import { redirect } from "next/navigation"

type PageProps = {
  params: Promise<{ industry: string }>
}

export const metadata: Metadata = {
  title: "Active Mission | Field Operations",
}

export default async function ActiveMissionPage(
  props: PageProps
): Promise<React.ReactElement> {
  const session = isMockAuth ? MOCK_SESSION : await auth()
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const userId = session.user.id

  // Get user deployments
  const db = getDb()

  const params = await props.params
  const industry = params.industry as Industry

  // Get the most recent non-terminal deployment
  const [deployment] = await db
    .select()
    .from(fieldOpsDeployments)
    .where(
      and(
        eq(fieldOpsDeployments.userId, userId),
        eq(fieldOpsDeployments.industry, industry),
        notInArray(fieldOpsDeployments.status, ["cleaned_up", "completed", "failed"])
      )
    )
    .orderBy(desc(fieldOpsDeployments.createdAt))
    .limit(1)

  if (!deployment) {
    // No active deployment - redirect to briefing
    redirect(`/field-ops/${industry}`)
  }

  const [config, mission] = await Promise.all([
    Promise.resolve(getIndustryConfig(industry)),
    loadFieldOpsContent(industry),
  ])

  return (
    <ActiveMission
      deploymentId={deployment.id}
      industry={industry}
      config={config}
      mission={{
        objectives: mission.objectives,
        hints: mission.hints,
        hintsInNotebooks: mission.hintsInNotebooks,
        hintsNote: mission.hintsNote,
        validations: mission.validations.map((validation) => ({
          checkKey: validation.checkKey,
          checkName: validation.checkName,
        })),
      }}
    />
  )
}
