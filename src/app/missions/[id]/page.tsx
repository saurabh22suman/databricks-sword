/**
 * @file page.tsx
 * @description Mission detail page - displays mission briefing
 */

import { Badge } from "@/components/ui"
import { MissionStartWrapper } from "@/components/missions/MissionStartWrapper"
import { PrerequisiteGate } from "@/components/missions/PrerequisiteGate"
import type { BriefingConfig } from "@/lib/missions"
import { getMission, getStageConfig } from "@/lib/missions"
import { getUserCompletedMissions } from "@/lib/missions/serverHelpers"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

interface MissionPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({
  params,
}: MissionPageProps): Promise<Metadata> {
  const { id } = await params;
  const mission = await getMission(id);

  if (!mission) {
    return {
      title: "Mission Not Found | Databricks Sword",
    };
  }

  return {
    title: `${mission.title} | Databricks Sword`,
    description: mission.description,
  };
}

/**
 * Mission detail page component
 *
 * Displays the mission briefing with narrative, objectives, and learning goals.
 * "Start Mission" button navigates to the first stage.
 */
export default async function MissionPage({
  params,
}: MissionPageProps): Promise<React.ReactElement> {
  const { id } = await params
  const mission = await getMission(id)

  if (!mission) {
    notFound()
  }

  // Get briefing stage
  const briefingStage = mission.stages.find(
    (stage) => stage.type === "briefing",
  )

  if (!briefingStage) {
    // Fallback if no briefing stage (shouldn't happen in valid missions)
    return (
      <div className="cyber-grid min-h-screen flex items-center justify-center bg-anime-950">
        <div className="text-center">
          <h1 className="mb-4 font-heading text-2xl font-bold text-anime-accent">
            Error: Invalid Mission Structure
          </h1>
          <p className="text-anime-400">
            This mission is missing a briefing stage.
          </p>
        </div>
      </div>
    )
  }

  // Load briefing config — the JSON may contain full BriefingConfig fields
  // or just { mdxContent: "briefing.mdx" }. Build a fallback from mission data.
  const rawConfig = await getStageConfig<BriefingConfig & { mdxContent?: string }>(
    id,
    briefingStage.configFile,
  )

  // For the mission overview page, show summary WITHOUT the full narrative
  // The narrative will be shown in the briefing stage itself
  const briefingConfig: BriefingConfig = {
    // Empty string - narrative will only show in the briefing stage
    narrative: "",
    objective: rawConfig.objective || `Complete the ${mission.title} mission to earn ${mission.xpReward} XP.`,
    learningGoals: rawConfig.learningGoals || mission.primaryFeatures,
    industryContext: rawConfig.industryContext,
  }

  // Short description for the overview page
  const missionDescription = mission.description

  // First stage ID for navigation
  const firstStageId = mission.stages[0].id

  // Get completed missions from the user's server-side sandbox snapshot
  const completedMissions = await getUserCompletedMissions()

  return (
    <PrerequisiteGate
      missionId={id}
      completedMissions={completedMissions}
    >
      <div className="cyber-grid min-h-screen bg-anime-950 pt-20">
        <div className="grain-overlay pointer-events-none fixed inset-0" />

        <div className="container relative z-10 mx-auto px-4 py-16">
          {/* Mission Header */}
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-4">
              <a
                href="/missions"
                className="text-anime-cyan transition-colors hover:text-anime-purple"
              >
                ← Back to Missions
              </a>
            </div>

            <div className="cut-corner border border-anime-700 bg-anime-900 p-8">
              <div className="mb-4 flex items-start justify-between gap-6">{/*Rest of content stays the same*/}
              <div className="flex-1">
                <h1 className="font-heading text-4xl font-bold text-anime-100 mb-2">
                  {mission.title}
                </h1>
                <p className="text-anime-400 text-lg">{mission.subtitle}</p>
              </div>

              {/* Rank Badge */}
              <div
                className={`cut-corner px-6 py-3 font-heading text-2xl font-bold ${
                  mission.rank === "S"
                    ? "bg-anime-accent/20 text-anime-accent border-2 border-anime-accent"
                    : mission.rank === "A"
                      ? "bg-anime-purple/20 text-anime-purple border-2 border-anime-purple"
                      : "bg-anime-cyan/20 text-anime-cyan border-2 border-anime-cyan"
                }`}
              >
                {mission.rank}
              </div>
            </div>

            {/* Mission Meta */}
            <div className="flex items-center gap-6 text-sm text-anime-500">
              <span>🏢 {mission.industry}</span>
              <span>⏱️ {mission.estimatedMinutes} min</span>
              <span>⭐ {mission.xpReward} XP</span>
              <span>
                {mission.stages.length} stages
              </span>
            </div>
          </div>
        </div>

        {/* Mission Description */}
        <div className="container relative z-10 mx-auto px-4 mb-8">
          <p className="text-anime-300 text-lg leading-relaxed">
            {missionDescription}
          </p>
        </div>

        {/* Prerequisites */}
        {mission.prerequisites && mission.prerequisites.length > 0 && (
          <div className="container relative z-10 mx-auto px-4 mb-6">
            <div className="border-l-2 border-anime-700 pl-4">
              <h3 className="text-sm uppercase tracking-wider text-anime-500 mb-2">
                Prerequisites
              </h3>
              <div className="flex flex-wrap gap-2">
                {mission.prerequisites.map((prereq) => (
                  <Badge key={prereq} variant="default">
                    {prereq}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Primary Features */}
        {mission.primaryFeatures && mission.primaryFeatures.length > 0 && (
          <div className="container relative z-10 mx-auto px-4 mb-6">
            <div className="border-l-2 border-anime-700 pl-4">
              <h3 className="text-sm uppercase tracking-wider text-anime-500 mb-2">
                Primary Features
              </h3>
              <div className="flex flex-wrap gap-2">
                {mission.primaryFeatures.map((feature) => (
                  <Badge key={feature} variant="intermediate">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Achievements */}
        {mission.achievements && mission.achievements.length > 0 && (
          <div className="container relative z-10 mx-auto px-4 mb-6">
            <div className="border-l-2 border-anime-700 pl-4">
              <h3 className="text-sm uppercase tracking-wider text-anime-500 mb-2">
                Achievements
              </h3>
              <div className="flex flex-wrap gap-2">
                {mission.achievements.map((achievement) => (
                  <Badge key={achievement} variant="advanced">
                    {achievement}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mission Briefing */}
        <MissionStartWrapper
          config={briefingConfig}
          estimatedMinutes={mission.estimatedMinutes}
          missionId={mission.id}
          firstStageId={firstStageId}
          firstStageTitle={mission.stages[0].title}
        />
      </div>
    </div>
    </PrerequisiteGate>
  )
}
