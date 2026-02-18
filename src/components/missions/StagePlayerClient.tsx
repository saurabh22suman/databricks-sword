/**
 * @file StagePlayerClient.tsx
 * @description Client wrapper that renders the correct stage component
 * and handles stage completion navigation. Solves the Server/Client
 * boundary issue where event handlers cannot be passed from Server Components.
 * Supports dual mode: simulated (pattern matching) and Databricks (real execution).
 * Integrates ArchitectureDiagram for diagram stages and SideQuestModal for
 * OSS deep-dive side quests between stage transitions.
 */

"use client";

import {
    ArchitectureDiagram,
    CompareChallenge,
    DatabricksStagePlayer,
    DragDropChallenge,
    FillBlankChallenge,
    FreeTextChallenge,
    MissionBriefing,
    MissionDebrief,
    MissionQuiz,
    SideQuestModal,
} from "@/components/missions";
import type { BundleStatus } from "@/lib/databricks/types";
import { awardStageXp } from "@/lib/gamification/xpService";
import type {
    BriefingConfig,
    CompareConfig,
    DebriefConfig,
    DiagramConfig,
    DragDropConfig,
    FillBlankConfig,
    FreeTextConfig,
    QuizConfig,
} from "@/lib/missions";
import { updateSandbox } from "@/lib/sandbox";
import { useSyncNow } from "@/components/auth";
import { playSound } from "@/lib/sound";
import { useRouter } from "next/navigation";
import React, { useCallback, useState } from "react";

/** Side quest with loaded content, ready for the modal */
export type SideQuestWithContent = {
  id: string;
  title: string;
  description: string;
  ossProject: string;
  trigger: "before" | "after";
  parentStageId: string;
  type: string;
  xpBonus: number;
  optional: boolean;
  content: {
    questions: {
      id: string;
      question: string;
      options: string[];
      correctAnswer: number;
      explanation: string;
    }[];
    passingScore: number;
  };
};

/** Union of all possible stage config types */
type StageConfig =
  | BriefingConfig
  | DiagramConfig
  | DragDropConfig
  | FillBlankConfig
  | FreeTextConfig
  | QuizConfig
  | CompareConfig
  | DebriefConfig;

export type StagePlayerClientProps = {
  /** The stage type to render */
  stageType: string;
  /** The parsed stage config JSON (serializable) */
  config: StageConfig;
  /** Estimated minutes (passed to briefing stage) */
  estimatedMinutes?: number;
  /** URL to navigate to on completion (next stage or missions list) */
  nextUrl: string;
  /** Current mission ID */
  missionId: string;
  /** Current stage ID */
  stageId: string;
  /** Base XP reward for this stage (from mission config) */
  stageXpReward?: number;
  /** Execution mode: simulated (default) or databricks */
  executionMode?: "simulated" | "databricks";
  /** Current bundle deployment status (for databricks mode) */
  bundleStatus?: BundleStatus;
  /** Workspace URL for opening Databricks (for databricks mode) */
  workspaceUrl?: string;
  /** Side quests with loaded content for this mission */
  sideQuests?: SideQuestWithContent[];
};

/** Stage types that support Databricks mode */
const CODE_STAGE_TYPES = ["drag-drop", "fill-blank", "free-text", "code"];

/**
 * Client-side stage player that renders the correct component for each
 * stage type and provides navigation on completion.
 * Supports dual mode: simulated (pattern matching) and Databricks (real execution).
 * Shows side quest modals between stage transitions when applicable.
 */
export function StagePlayerClient({
  stageType,
  config,
  estimatedMinutes,
  nextUrl,
  missionId,
  stageId,
  stageXpReward = 0,
  executionMode = "simulated",
  bundleStatus,
  workspaceUrl,
  sideQuests = [],
}: StagePlayerClientProps): React.ReactElement {
  const router = useRouter();
  const { syncNow } = useSyncNow();
  const [activeSideQuest, setActiveSideQuest] = useState<SideQuestWithContent | null>(null);

  /** Navigate to the next stage */
  const navigateNext = useCallback((): void => {
    router.push(nextUrl);
  }, [router, nextUrl]);

  /** Check for "after" side quests for the current stage, or navigate */
  const handleComplete = useCallback((_result?: unknown): void => {
    // Play stage completion sound
    playSound("stage-complete")

    // Award XP for stage completion and immediately push to server
    if (stageXpReward > 0) {
      awardStageXp(missionId, stageId, stageXpReward);
      void syncNow();
    }

    // Check for "after" side quest triggered by this stage
    const afterQuest = sideQuests.find(
      (sq) => sq.parentStageId === stageId && sq.trigger === "after",
    );

    if (afterQuest) {
      setActiveSideQuest(afterQuest);
    } else {
      navigateNext();
    }
  }, [stageId, stageXpReward, missionId, sideQuests, navigateNext]);

  const handleXpAward = (_xp: number): void => {
    // XP is now handled by awardStageXp in handleComplete
  };

  /** Quiz completion — persist quiz score then proceed */
  const handleQuizComplete = useCallback((result?: { percentage?: number }): void => {
    if (result?.percentage !== undefined) {
      updateSandbox((data) => {
        const mp = data.missionProgress[missionId]
        if (!mp) return data
        const sp = mp.stageProgress[stageId] ?? {
          completed: false,
          xpEarned: 0,
          codeAttempts: [],
          hintsUsed: 0,
        }
        return {
          ...data,
          missionProgress: {
            ...data.missionProgress,
            [missionId]: {
              ...mp,
              stageProgress: {
                ...mp.stageProgress,
                [stageId]: { ...sp, quizScore: result.percentage },
              },
            },
          },
        }
      })
    }
    handleComplete(result)
  }, [missionId, stageId, handleComplete]);

  /** Side quest completed — award XP and continue */
  const handleSideQuestComplete = useCallback((xpAwarded: number): void => {
    playSound("stage-complete")
    void xpAwarded; // XP already awarded to sandbox in side quest component
    setActiveSideQuest(null);
    navigateNext();
  }, [navigateNext]);

  /** Side quest skipped — continue to next stage */
  const handleSideQuestSkip = useCallback((): void => {
    setActiveSideQuest(null);
    navigateNext();
  }, [navigateNext]);

  /** Side quest modal closed — continue to next stage */
  const handleSideQuestClose = useCallback((): void => {
    setActiveSideQuest(null);
    navigateNext();
  }, [navigateNext]);

  // Use DatabricksStagePlayer for code stages in databricks mode
  if (executionMode === "databricks" && CODE_STAGE_TYPES.includes(stageType)) {
    // Extract instructions/objectives from config if available
    const instructions = "description" in config 
      ? (config as { description: string }).description 
      : "";
    const objectives = "correctOrder" in config
      ? (config as { correctOrder: string[] }).correctOrder.map((id) => `Complete step ${id}`)
      : [];

    return (
      <>
        <DatabricksStagePlayer
          missionSlug={missionId}
          stageId={stageId}
          stageConfig={{
            id: stageId,
            title: stageType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            type: stageType,
            instructions,
            objectives,
          }}
          bundleStatus={bundleStatus || "not-deployed"}
          workspaceUrl={workspaceUrl}
          onComplete={handleComplete}
          onXpAward={handleXpAward}
        />
        {activeSideQuest && (
          <SideQuestModal
            sideQuest={{
              id: activeSideQuest.id,
              title: activeSideQuest.title,
              description: `Deep dive into ${activeSideQuest.ossProject}`,
              xpReward: activeSideQuest.xpBonus,
              type: activeSideQuest.type as "quiz" | "diagram" | "code",
              content: activeSideQuest.content,
            }}
            isOpen={true}
            onSkip={handleSideQuestSkip}
            onComplete={handleSideQuestComplete}
            onClose={handleSideQuestClose}
          />
        )}
      </>
    );
  }

  /** Render the side quest modal overlay (shared across all stage types) */
  const sideQuestOverlay = activeSideQuest ? (
    <SideQuestModal
      sideQuest={{
        id: activeSideQuest.id,
        title: activeSideQuest.title,
        description: `Deep dive into ${activeSideQuest.ossProject}`,
        xpReward: activeSideQuest.xpBonus,
        type: activeSideQuest.type as "quiz" | "diagram" | "code",
        content: activeSideQuest.content,
      }}
      isOpen={true}
      onSkip={handleSideQuestSkip}
      onComplete={handleSideQuestComplete}
      onClose={handleSideQuestClose}
    />
  ) : null;

  switch (stageType) {
    case "briefing":
      return (
        <>
          <MissionBriefing
            config={config as BriefingConfig}
            estimatedMinutes={estimatedMinutes}
            onStart={handleComplete}
          />
          {sideQuestOverlay}
        </>
      );

    case "drag-drop":
      return (
        <>
          <DragDropChallenge
            config={config as DragDropConfig}
            onComplete={handleComplete}
          />
          {sideQuestOverlay}
        </>
      );

    case "fill-blank":
      return (
        <>
          <FillBlankChallenge
            config={config as FillBlankConfig}
            onComplete={handleComplete}
          />
          {sideQuestOverlay}
        </>
      );

    case "free-text":
      return (
        <>
          <FreeTextChallenge
            config={config as FreeTextConfig}
            onComplete={handleComplete}
          />
          {sideQuestOverlay}
        </>
      );

    case "quiz":
      return (
        <>
          <MissionQuiz
            config={config as QuizConfig}
            onComplete={handleQuizComplete}
          />
          {sideQuestOverlay}
        </>
      );

    case "debrief":
      return (
        <>
          <MissionDebrief
            config={config as DebriefConfig}
            nextMissionId={undefined}
            onComplete={handleComplete}
          />
          {sideQuestOverlay}
        </>
      );

    case "diagram":
      return (
        <>
          <ArchitectureDiagram
            config={config as DiagramConfig}
            onComplete={handleComplete}
          />
          {sideQuestOverlay}
        </>
      );

    case "compare":
      return (
        <>
          <CompareChallenge
            config={config as CompareConfig}
            onComplete={handleComplete}
          />
          {sideQuestOverlay}
        </>
      );

    default:
      return (
        <div className="cut-corner border border-anime-accent bg-anime-accent/10 p-8">
          <h2 className="font-heading text-2xl font-bold text-anime-accent mb-4">
            Unknown Stage Type
          </h2>
          <p className="text-anime-400">
            Stage type &quot;{stageType}&quot; is not recognized.
          </p>
        </div>
      );
  }
}
