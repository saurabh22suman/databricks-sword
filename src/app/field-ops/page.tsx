/**
 * Field Operations List Page
 * Displays all 8 industries with unlock status.
 */

import { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAllIndustries } from "@/lib/field-ops/industries"
import { IndustryCard } from "@/components/field-ops/IndustryCard"
import { ConnectionStatus } from "@/components/field-ops/ConnectionStatus"

export const metadata: Metadata = {
  title: "Field Operations | Databricks Sword",
  description: "Real-world Databricks deployments across 8 industries",
}

export default async function FieldOpsPage(): Promise<React.ReactElement> {
  const session = await auth()
  if (!session?.user?.email) {
    redirect("/auth/signin")
  }

  const industries = getAllIndustries()

  // TODO: Get user XP from profile
  const userXp = 0

  // TODO: Check if Databricks is connected
  const isConnected = false

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
