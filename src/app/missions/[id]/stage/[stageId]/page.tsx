/**
 * @file page.tsx
 * @description Stage player - loads stage data server-side, delegates rendering to client.
 * Also loads side quest content for any side quests defined in the mission.
 */

import type { SideQuestWithContent } from "@/components/missions";
import type { StagePlayerClientProps } from "@/components/missions/StagePlayerClient";
import { StagePlayerClient } from "@/components/missions/StagePlayerClient";
import { getMission, getStageConfig } from "@/lib/missions";
import { buildQuizWithRecall, loadRecallPool } from "@/lib/missions/quizRecall";
import type { QuizConfig } from "@/lib/missions/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface StagePageProps {
  params: Promise<{
    id: string;
    stageId: string;
  }>;
}

export async function generateMetadata({
  params,
}: StagePageProps): Promise<Metadata> {
  const { id, stageId } = await params;
  const mission = await getMission(id);

  if (!mission) {
    return {
      title: "Mission Not Found | Databricks Sword",
    };
  }

  const stage = mission.stages.find((s) => s.id === stageId);

  return {
    title: `${mission.title} - ${stage?.type || "Stage"} | Databricks Sword`,
    description: mission.description,
  };
}

/**
 * Stage player page (Server Component)
 *
 * Loads stage config server-side and passes serializable data
 * to StagePlayerClient for interactive rendering.
 */
export default async function StagePage({
  params,
}: StagePageProps): Promise<React.ReactElement> {
  const { id, stageId } = await params;
  const mission = await getMission(id);

  if (!mission) {
    notFound();
  }

  const currentStageIndex = mission.stages.findIndex((s) => s.id === stageId);
  const currentStage = mission.stages[currentStageIndex];

  if (!currentStage) {
    notFound();
  }

  const nextStage = mission.stages[currentStageIndex + 1];
  const nextUrl = nextStage
    ? `/missions/${mission.id}/stage/${nextStage.id}`
    : `/missions`;

  // Load stage config server-side (pure data, serializable)
  let config = await getStageConfig<StagePlayerClientProps["config"]>(
    id,
    currentStage.configFile
  );

  // For quiz stages, mix in recall questions from other missions based on rank
  if (currentStage.type === "quiz") {
    const quizConfig = config as QuizConfig;
    const recallPool = await loadRecallPool(mission.id);
    const mixedQuestions = buildQuizWithRecall(
      quizConfig.questions,
      recallPool,
      mission.rank as "B" | "A" | "S",
    );
    config = {
      ...quizConfig,
      questions: mixedQuestions,
    } as StagePlayerClientProps["config"];
  }

  // Load side quest content for quests associated with this mission
  const sideQuestsWithContent: SideQuestWithContent[] = [];
  for (const sq of mission.sideQuests) {
    try {
      const content = await getStageConfig<{
        questions: {
          id: string;
          question: string;
          options: string[];
          correctAnswer: number;
          explanation: string;
        }[];
        passingScore: number;
      }>(id, sq.configFile);

      sideQuestsWithContent.push({
        id: sq.id,
        title: sq.title,
        description: `Deep dive into ${sq.ossProject}`,
        ossProject: sq.ossProject,
        trigger: sq.trigger,
        parentStageId: sq.parentStageId,
        type: sq.type,
        xpBonus: sq.xpBonus,
        optional: sq.optional,
        content,
      });
    } catch {
      // Skip side quests with missing content files
      console.warn(`Side quest content not found: ${sq.configFile}`);
    }
  }

  return (
    <div className="min-h-screen bg-anime-950 cyber-grid pt-20">
      <div className="grain-overlay fixed inset-0 pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Stage Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <a
              href={`/missions/${mission.id}`}
              className="text-anime-cyan hover:text-anime-purple transition-colors"
            >
              ← Back to Mission
            </a>

            {/* Stage Progress */}
            <div className="text-sm text-anime-500">
              Stage {currentStageIndex + 1} of {mission.stages.length}
            </div>
          </div>

          <h1 className="font-heading text-3xl font-bold text-anime-100 mb-2">
            {mission.title}
          </h1>

          {/* Stage Type Badge */}
          <div className="inline-block px-3 py-1 rounded-full bg-anime-cyan/20 text-anime-cyan text-xs font-medium uppercase tracking-wider">
            {currentStage.type}
          </div>
        </div>

        {/* Stage Content — rendered client-side */}
        <StagePlayerClient
          stageType={currentStage.type}
          config={config}
          estimatedMinutes={mission.estimatedMinutes}
          nextUrl={nextUrl}
          missionId={mission.id}
          stageId={currentStage.id}
          sideQuests={sideQuestsWithContent}
        />
      </div>
    </div>
  );
}
