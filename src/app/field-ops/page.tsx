/**
 * Field Operations List Page
 * Displays all 9 industries with unlock status.
 */

import { getUserSandbox } from "@/app/api/user/helpers"
import { ConnectionStatus } from "@/components/field-ops/ConnectionStatus"
import { IndustryCard } from "@/components/field-ops/IndustryCard"
import { auth } from "@/lib/auth"
import { MOCK_SESSION, isMockAuth } from "@/lib/auth/mockSession"
import { databricksConnections, getDb } from "@/lib/db"
import { getAllIndustries } from "@/lib/field-ops/industries"
import { eq } from "drizzle-orm"
import { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Field Operations | Databricks Sword",
  description: "Real-world Databricks deployments across 9 industries",
}

export default async function FieldOpsPage(): Promise<React.ReactElement> {
  const session = isMockAuth ? MOCK_SESSION : await auth()
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
    const connection = connections[0]
    isConnected = Boolean(connection && connection.catalogName?.trim() && connection.warehouseId?.trim())
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
            Real-world Databricks deployments across 9 industries
          </p>
        </div>

        {/* Cost/Time Info Banner */}
        <div className="mb-6 p-4 bg-anime-900/50 border border-anime-700 rounded-lg">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-anime-500">⏱️</span>
              <span className="text-anime-300">Est. time: 3-8 min per deployment</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-anime-500">💰</span>
              <span className="text-anime-300">Est. cost: ~$0.25-1.00 credit</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-anime-500">🧹</span>
              <span className="text-anime-300">Run /cleanup after use</span>
            </div>
          </div>
        </div>

        {/* Connection Status Banner */}
        <ConnectionStatus isConnected={isConnected} refreshOnInitialSync />

        {/* Info Section */}
        <div className="mt-8 cut-corner bg-anime-900 border border-anime-700 p-6">
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
      </div>
    </div>
  )
}
