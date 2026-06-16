/**
 * @file StagePlayerClient.tsx
 * @description Client wrapper that renders the correct stage component
 * and handles stage completion navigation. Solves the Server/Client
 * boundary issue where event handlers cannot be passed from Server Components.
 * Supports dual mode: simulated (pattern matching) and Databricks (real execution).
 * Integrates ArchitectureDiagram for diagram stages and SideQuestModal for
 * OSS deep-dive side quests between stage transitions.
 *
 * Uses dynamic imports for code-splitting stage challenge components
 * to reduce initial bundle size and improve TTI.
 */

"use client";

import { useSyncNow } from "@/components/auth";
import { SideQuestModal } from "@/components/missions";
import type { BundleStatus } from "@/lib/databricks/types";
import { awardMissionXp, awardStageXp } from "@/lib/gamification/xpService";
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
import { loadSandbox, updateSandbox } from "@/lib/sandbox";
import { playSound } from "@/lib/sound";
import { useRouter } from "next/navigation";
import React, { useCallback, useState } from "react";
import dynamic from "next/dynamic";

/**
 * Dynamic imports for stage challenge components.
 * Loaded on-demand to reduce initial bundle size.
 * Each component is code-split and only loaded when its stage type is needed.
 */
const MissionBriefing = dynamic(
  () => import("@/components/missions/MissionBriefing").then((mod) => mod.MissionBriefing),
  { ssr: false, loading: () => <div className="p-8 text-anime-400">Loading briefing...</div> }
)

const MissionQuiz = dynamic(
  () => import("@/components/missions/MissionQuiz").then((mod) => mod.MissionQuiz),
  { ssr: false, loading: () => <div className="p-8 text-anime-400">Loading quiz...</div> }
)

const MissionDebrief = dynamic(
  () => import("@/components/missions/MissionDebrief").then((mod) => mod.MissionDebrief),
  { ssr: false, loading: () => <div className="p-8 text-anime-400">Loading debrief...</div> }
)

const DragDropChallenge = dynamic(
  () => import("@/components/missions/DragDropChallenge").then((mod) => mod.DragDropChallenge),
  { ssr: false, loading: () => <div className="p-8 text-anime-400">Loading challenge...</div> }
)

const FillBlankChallenge = dynamic(
  () => import("@/components/missions/FillBlankChallenge").then((mod) => mod.FillBlankChallenge),
  { ssr: false, loading: () => <div className="p-8 text-anime-400">Loading challenge...</div> }
)

const FreeTextChallenge = dynamic(
  () => import("@/components/missions/FreeTextChallenge").then((mod) => mod.FreeTextChallenge),
  { ssr: false, loading: () => <div className="p-8 text-anime-400">Loading challenge...</div> }
)

const ArchitectureDiagram = dynamic(
  () => import("@/components/missions/ArchitectureDiagram").then((mod) => mod.ArchitectureDiagram),
  { ssr: false, loading: () => <div className="p-8 text-anime-400">Loading diagram...</div> }
)

const CompareChallenge = dynamic(
  () => import("@/components/missions/CompareChallenge").then((mod) => mod.CompareChallenge),
  { ssr: false, loading: () => <div className="p-8 text-anime-400">Loading comparison...</div> }
)

const DatabricksStagePlayer = dynamic(
  () => import("@/components/missions/DatabricksStagePlayer").then((mod) => mod.DatabricksStagePlayer),
  { ssr: false, loading: () => <div className="p-8 text-anime-400">Loading Databricks stage...</div> }
)

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
  /** Whether this is the final stage in the mission */
  isFinalStage?: boolean;
  /** Base XP reward for mission completion */
  missionXpReward?: number;
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
const CODE_STAGE_TYPES = ["drag-drop", "fill-blank", "free-text", "fix-bug", "code"];

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
  isFinalStage = false,
  missionXpReward = 0,
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
  const handleComplete = useCallback(async (_result?: unknown): Promise<void> => {
    // Play stage completion sound
    playSound("stage-complete")

    // Award XP for stage completion and mission completion (final stage only)
    if (stageXpReward > 0) {
      // Get hintsUsed and attempts from sandbox progress for accurate bonus calculation
      const sandbox = loadSandbox()
      const stageProgress = sandbox?.missionProgress[missionId]?.stageProgress[stageId]
      const hintsUsed = stageProgress?.hintsUsed ?? 0
      const attempts = stageProgress?.codeAttempts.length ?? 1

      await awardStageXp(missionId, stageId, stageXpReward, { attempts, hintsUsed });
    }
    if (isFinalStage && missionXpReward > 0) {
      await awardMissionXp(missionId, missionXpReward);
    }

    // Sync to server BEFORE navigating - must await to prevent data loss
    if (stageXpReward > 0 || (isFinalStage && missionXpReward > 0)) {
      await syncNow();
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
  }, [stageId, stageXpReward, missionId, isFinalStage, missionXpReward, sideQuests, navigateNext, syncNow]);

  const handleXpAward = (_xp: number): void => {
    // XP is now handled by awardStageXp in handleComplete
  };

  /** Quiz completion — persist quiz score, only continue when passed */
  const handleQuizComplete = useCallback((result?: { percentage?: number; passed?: boolean }): void => {
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

    if (result?.passed) {
      handleComplete(result)
    }
  }, [missionId, stageId, handleComplete]);

  /** Side quest completed — persist mission progress and continue */
  const handleSideQuestComplete = useCallback(async (xpAwarded: number): Promise<void> => {
    playSound("stage-complete")

    const completedQuestId = activeSideQuest?.id
    if (completedQuestId && xpAwarded > 0) {
      updateSandbox((data) => {
        const missionProgress = data.missionProgress[missionId] ?? {
          started: true,
          completed: false,
          stageProgress: {},
          sideQuestsCompleted: [],
          totalXpEarned: 0,
        }

        const sideQuestsCompleted = missionProgress.sideQuestsCompleted.includes(completedQuestId)
          ? missionProgress.sideQuestsCompleted
          : [...missionProgress.sideQuestsCompleted, completedQuestId]

        const shouldAwardXp = !missionProgress.sideQuestsCompleted.includes(completedQuestId)
        const xpToAward = shouldAwardXp ? xpAwarded : 0

        return {
          ...data,
          missionProgress: {
            ...data.missionProgress,
            [missionId]: {
              ...missionProgress,
              started: true,
              sideQuestsCompleted,
              totalXpEarned: missionProgress.totalXpEarned + xpToAward,
            },
          },
          userStats: {
            ...data.userStats,
            totalXp: data.userStats.totalXp + xpToAward,
          },
        }
      })
      // Must await sync to prevent data loss on navigation
      await syncNow()
    }

    setActiveSideQuest(null);
    navigateNext();
  }, [activeSideQuest, missionId, navigateNext, syncNow]);

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
    case "fix-bug":
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
