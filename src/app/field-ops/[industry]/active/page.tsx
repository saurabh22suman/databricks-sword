/**
 * Active Mission Page
 * Shows deployed mission with validation and cleanup controls.
 */

import { ActiveMission } from "@/components/field-ops/ActiveMission"
import { auth } from "@/lib/auth"
import { fieldOpsDeployments, getDb, users } from "@/lib/db"
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
  const session = await auth()
  if (!session?.user?.email) {
    redirect("/auth/signin")
  }

  // Get user
  const db = getDb()
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1)

  if (!user) {
    redirect("/auth/signin")
  }

  const params = await props.params
  const industry = params.industry as Industry

  // Get the most recent non-terminal deployment
  const [deployment] = await db
    .select()
    .from(fieldOpsDeployments)
    .where(
      and(
        eq(fieldOpsDeployments.userId, user.id),
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

  const config = getIndustryConfig(industry)

  return (
    <ActiveMission
      deploymentId={deployment.id}
      industry={industry}
      config={config}
    />
  )
}
