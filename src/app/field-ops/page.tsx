/**
 * Field Operations List Page
 * Displays all 8 industries with unlock status.
 */

import { getUserSandbox } from "@/app/api/user/helpers"
import { ConnectionStatus } from "@/components/field-ops/ConnectionStatus"
import { IndustryCard } from "@/components/field-ops/IndustryCard"
import { auth } from "@/lib/auth"
import { databricksConnections, getDb } from "@/lib/db"
import { getAllIndustries } from "@/lib/field-ops/industries"
import { eq } from "drizzle-orm"
import { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Field Operations | Databricks Sword",
  description: "Real-world Databricks deployments across 8 industries",
}

export default async function FieldOpsPage(): Promise<React.ReactElement> {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const userId = session.user.id
  const industries = getAllIndustries()

  // Get user XP from sandbox
  let userXp = 0
  try {
    const sandbox = await getUserSandbox(userId)
    if (sandbox) {
      userXp = sandbox.userStats.totalXp
    }
  } catch (error) {
    console.error("Error fetching user sandbox:", error)
  }

  // Check if Databricks is connected
  let isConnected = false
  try {
    const connections = await getDb()
      .select()
      .from(databricksConnections)
      .where(eq(databricksConnections.userId, userId))
    isConnected = connections.length > 0
  } catch (error) {
    console.error("Error checking Databricks connection:", error)
  }

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-4xl text-anime-cyan mb-2">
            ⚡ Field Operations
          </h1>
          <p className="text-anime-300 text-lg">
            Real-world Databricks deployments across 8 industries
          </p>
        </div>

        {/* Connection Status Banner */}
        <ConnectionStatus isConnected={isConnected} />

        {/* Industries Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
          {industries.map((industry) => (
            <IndustryCard
              key={industry.industry}
              industry={industry}
              userXp={userXp}
              isConnected={isConnected}
            />
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-12 cut-corner bg-anime-900 border border-anime-700 p-6">
          <h2 className="font-heading text-2xl text-anime-cyan mb-4">
            How It Works
          </h2>
          <ul className="space-y-2 text-anime-300">
            <li>• Connect your Databricks workspace in Settings</li>
            <li>• Unlock industries progressively by earning XP</li>
            <li>• Deploy real data pipelines to your workspace</li>
            <li>• Fix broken notebooks and complete objectives</li>
            <li>• Validate your work with automated checks</li>
            <li>• Earn XP and badges for completion</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
