"use client";

import { cn } from "@/lib/utils";

/**
 * Stage info for the tracker.
 */
type StageInfo = {
  id: string;
  title: string;
  type: string;
};

/**
 * Props for the StageTracker component.
 */
export type StageTrackerProps = {
  stages: StageInfo[];
  currentStageId: string;
  completedStageIds: string[];
  missionId: string;
  onNavigate: (stageId: string) => void;
};

/**
 * A horizontal progress bar showing all stages in a mission.
 * Completed stages are clickable, current stage is highlighted, upcoming are dimmed.
 */
export function StageTracker({
  stages,
  currentStageId,
  completedStageIds,
  onNavigate,
}: StageTrackerProps): React.ReactElement {
  const getStageStatus = (stageId: string): "completed" | "current" | "upcoming" => {
    if (completedStageIds.includes(stageId)) return "completed";
    if (stageId === currentStageId) return "current";
    return "upcoming";
  };

  const handleClick = (stageId: string) => {
    const status = getStageStatus(stageId);
    if (status === "completed" || status === "current") {
      onNavigate(stageId);
    }
  };

  return (
    <div data-testid="stage-tracker" className="w-full py-4">
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => {
          const status = getStageStatus(stage.id);
          const isLast = index === stages.length - 1;

          return (
            <div key={stage.id} className="flex items-center flex-1">
              {/* Stage Node */}
              <button
                onClick={() => handleClick(stage.id)}
                disabled={status === "upcoming"}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 transition-all duration-200",
                  status === "completed" && "cursor-pointer",
                  status === "current" && "cursor-default",
                  status === "upcoming" && "cursor-not-allowed opacity-50"
                )}
              >
                {/* Stage Number Circle */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                    "border-2 transition-all duration-200",
                    status === "completed" && "bg-anime-green/20 border-anime-green text-anime-green",
                    status === "current" && "bg-anime-cyan/20 border-anime-cyan text-anime-cyan shadow-neon-cyan",
                    status === "upcoming" && "bg-anime-700/20 border-anime-700 text-anime-500"
                  )}
                >
                  {index + 1}
                </div>

                {/* Stage Title */}
                <span
                  className={cn(
                    "text-xs text-center max-w-[80px] truncate",
                    status === "completed" && "text-anime-green",
                    status === "current" && "text-anime-cyan font-medium",
                    status === "upcoming" && "text-anime-500"
                  )}
                >
                  {stage.title}
                </span>
              </button>

              {/* Connector Line */}
              {!isLast && (
                <div
                  className={cn(
                    "connector flex-1 h-0.5 mx-1",
                    status === "completed" ? "bg-anime-green" : "bg-anime-700"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
