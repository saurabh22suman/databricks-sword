"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";

/**
 * Execution mode for mission stages
 */
export type ExecutionMode = "simulated" | "databricks";

/**
 * Props for the ModeToggle component
 */
type ModeToggleProps = {
  /** Whether Databricks mode is enabled for this mission */
  databricksEnabled: boolean;
  /** Current execution mode */
  mode: ExecutionMode;
  /** Callback when mode changes */
  onModeChange: (mode: ExecutionMode) => void;
  /** Whether user has connected a Databricks workspace */
  databricksConnected: boolean;
  /** Additional CSS classes */
  className?: string;
};

/**
 * Toggle between Simulated and Real Databricks execution modes
 * 
 * Real Databricks mode is disabled when:
 * - Mission has databricksEnabled: false
 * - User has no workspace connected
 */
export function ModeToggle({
  databricksEnabled,
  mode,
  onModeChange,
  databricksConnected,
  className,
}: ModeToggleProps): React.ReactElement {
  const realDisabled = !databricksEnabled || !databricksConnected;

  const getDisabledReason = (): string | null => {
    if (!databricksEnabled) return "Coming soon";
    if (!databricksConnected) return "Connect workspace";
    return null;
  };

  const disabledReason = getDisabledReason();

  return (
    <div
      role="group"
      aria-label="Execution mode"
      className={cn(
        "flex items-center gap-2 p-1 rounded-lg bg-anime-900 border border-anime-700",
        className
      )}
    >
      {/* Simulated Mode Button */}
      <button
        onClick={() => onModeChange("simulated")}
        className={cn(
          "px-4 py-2 rounded-md font-medium text-sm transition-all",
          mode === "simulated"
            ? "bg-anime-cyan/20 text-anime-cyan border border-anime-cyan shadow-neon-cyan"
            : "text-anime-400 hover:text-anime-200 hover:bg-anime-800"
        )}
      >
        Simulated
      </button>

      {/* Real Databricks Mode Button */}
      <div className="relative flex items-center">
        <button
          onClick={() => !realDisabled && onModeChange("databricks")}
          disabled={realDisabled}
          className={cn(
            "px-4 py-2 rounded-md font-medium text-sm transition-all",
            mode === "databricks"
              ? "bg-anime-green/20 text-anime-green border border-anime-green shadow-neon-green"
              : realDisabled
                ? "text-anime-500 cursor-not-allowed opacity-50"
                : "text-anime-400 hover:text-anime-200 hover:bg-anime-800"
          )}
        >
          Real Databricks
        </button>

        {/* Disabled reason indicator */}
        {disabledReason && (
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
            {!databricksConnected && databricksEnabled ? (
              <Link
                href="/profile#databricks"
                className="text-xs text-anime-cyan hover:underline"
              >
                Connect workspace
              </Link>
            ) : (
              <span className="text-xs text-anime-500">{disabledReason}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
