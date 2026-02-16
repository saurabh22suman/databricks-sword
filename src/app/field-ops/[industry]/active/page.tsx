/**
 * Active Mission Page
 * Shows deployed mission with validation and cleanup controls.
 */

import { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getDb, users, fieldOpsDeployments } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { getIndustryConfig } from "@/lib/field-ops/industries"
import { ActiveMission } from "@/components/field-ops/ActiveMission"
import type { Industry } from "@/lib/field-ops/types"

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

  // Get active deployment
  const [deployment] = await db
    .select()
    .from(fieldOpsDeployments)
    .where(
      and(
        eq(fieldOpsDeployments.userId, user.id),
        eq(fieldOpsDeployments.industry, industry)
      )
    )
    .orderBy(fieldOpsDeployments.createdAt)
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
