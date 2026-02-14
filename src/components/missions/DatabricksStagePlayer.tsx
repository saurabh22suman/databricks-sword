"use client";

import type { BundleStatus } from "@/lib/databricks/types";
import { cn } from "@/lib/utils";
import { useState } from "react";

/**
 * Evaluation query for checking user's work in Databricks
 */
type EvaluationQuery = {
  description: string;
  sql: string;
  expectedResult: {
    rowCount?: number;
    value?: unknown;
  };
};

/**
 * Stage configuration for Databricks stages
 */
type DatabricksStageConfig = {
  id: string;
  title: string;
  type: string;
  instructions: string;
  objectives: string[];
  evaluationQueries?: EvaluationQuery[];
};

/**
 * Evaluation result from API
 */
type EvaluationResult = {
  queryIndex: number;
  description: string;
  passed: boolean;
  expected?: unknown;
  actual?: unknown;
  error?: string;
};

/**
 * Props for DatabricksStagePlayer component
 */
type DatabricksStagePlayerProps = {
  /** Mission slug for API calls */
  missionSlug: string;
  /** Stage ID for API calls */
  stageId: string;
  /** Stage configuration with instructions and objectives */
  stageConfig: DatabricksStageConfig;
  /** Current bundle deployment status */
  bundleStatus: BundleStatus;
  /** Workspace URL for external links */
  workspaceUrl?: string;
  /** Callback when stage is completed */
  onComplete: () => void;
  /** Callback when XP is awarded */
  onXpAward: (xp: number) => void;
  /** Callback when bundle status changes */
  onBundleStatusChange?: (status: BundleStatus) => void;
  /** Additional CSS classes */
  className?: string;
};

/**
 * Player for Databricks-enabled mission stages
 * 
 * Provides a 4-step workflow:
 * 1. Deploy - Deploy mission assets to Databricks
 * 2. Work - Instructions for working in Databricks
 * 3. Evaluate - Run validation queries against user's work
 * 4. Cleanup - Reset/destroy the workspace assets
 */
export function DatabricksStagePlayer({
  missionSlug,
  stageId,
  stageConfig,
  bundleStatus,
  workspaceUrl,
  onComplete,
  onXpAward,
  onBundleStatusChange,
  className,
}: DatabricksStagePlayerProps): React.ReactElement {
  const [isDeploying, setIsDeploying] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isDestroying, setIsDestroying] = useState(false);
  const [showConfirmDestroy, setShowConfirmDestroy] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[] | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  const notebookPath = `/dbsword/${missionSlug}/exercise`;
  const isDeployed = bundleStatus === "deployed";

  /**
   * Deploy mission assets to Databricks
   */
  const handleDeploy = async (): Promise<void> => {
    setIsDeploying(true);
    setDeployError(null);

    try {
      const response = await fetch("/api/databricks/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionSlug }),
      });

      const data = await response.json();

      if (!response.ok) {
        setDeployError(data.error || "Deployment failed");
        return;
      }

      onBundleStatusChange?.(data.status);
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : "Deployment failed");
    } finally {
      setIsDeploying(false);
    }
  };

  /**
   * Evaluate user's work in Databricks
   */
  const handleEvaluate = async (): Promise<void> => {
    setIsEvaluating(true);
    setEvaluationError(null);
    setEvaluationResults(null);

    try {
      const response = await fetch("/api/databricks/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionSlug, stageId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setEvaluationError(data.error || "Evaluation failed");
        return;
      }

      setEvaluationResults(data.results);

      if (data.allPassed) {
        onComplete();
        if (data.xpAwarded) {
          onXpAward(data.xpAwarded);
        }
      }
    } catch (err) {
      setEvaluationError(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setIsEvaluating(false);
    }
  };

  /**
   * Destroy/reset workspace assets
   */
  const handleDestroy = async (): Promise<void> => {
    setIsDestroying(true);

    try {
      const response = await fetch("/api/databricks/destroy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionSlug }),
      });

      const data = await response.json();

      if (response.ok) {
        onBundleStatusChange?.(data.status);
        setEvaluationResults(null);
      }
    } catch {
      // Silently fail for cleanup
    } finally {
      setIsDestroying(false);
      setShowConfirmDestroy(false);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stage Header */}
      <div className="border-b border-anime-700 pb-4">
        <h2 className="text-xl font-heading text-anime-100">{stageConfig.title}</h2>
        <p className="text-anime-400 mt-1">{stageConfig.instructions}</p>
      </div>

      {/* Step 1: Deploy */}
      {!isDeployed && (
        <section className="space-y-4">
          <h3 className="text-lg font-medium text-anime-200">
            Step 1: Deploy Mission Assets to Databricks
          </h3>
          <p className="text-anime-400 text-sm">
            Deploy the mission's schema, data, and exercise notebook to your Databricks workspace.
          </p>

          <button
            onClick={handleDeploy}
            disabled={isDeploying}
            className={cn(
              "px-6 py-3 rounded-md font-medium transition-all",
              "bg-anime-accent text-white hover:bg-anime-accent/80",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "shadow-neon-red hover:shadow-neon-red/50"
            )}
          >
            {isDeploying ? "Deploying..." : "Deploy Mission Assets"}
          </button>

          {deployError && (
            <p className="text-red-400 text-sm">{deployError}</p>
          )}

          {/* Deployment Overlay */}
          {isDeploying && (
            <div
              data-testid="deployment-overlay"
              className="fixed inset-0 bg-anime-950/90 flex items-center justify-center z-50 animate-glitch"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 border-4 border-anime-cyan border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-anime-cyan text-lg font-medium">Deploying to Databricks...</p>
                <p className="text-anime-400 text-sm">Initializing schema and uploading data</p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Step 2: Work in Databricks */}
      {isDeployed && (
        <section className="space-y-4">
          <h3 className="text-lg font-medium text-anime-200">
            Step 2: Work in Databricks
          </h3>

          {/* Notebook Path */}
          <div className="bg-anime-900 border border-anime-700 rounded-md p-4 space-y-3">
            <div>
              <span className="text-anime-400 text-sm">Notebook Path:</span>
              <code className="block mt-1 text-anime-cyan font-mono">{notebookPath}</code>
            </div>

            {workspaceUrl && (
              <a
                href={`${workspaceUrl}#notebook${notebookPath}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-anime-cyan hover:underline"
              >
                Open in Databricks →
              </a>
            )}
          </div>

          {/* Objectives Checklist */}
          <div className="space-y-2">
            <h4 className="text-anime-300 font-medium">Objectives:</h4>
            <ul className="space-y-2">
              {stageConfig.objectives.map((objective, index) => (
                <li key={index} className="flex items-start gap-2 text-anime-400">
                  <span className="text-anime-500 mt-0.5">□</span>
                  {objective}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Step 3: Evaluate */}
      {isDeployed && (
        <section className="space-y-4">
          <h3 className="text-lg font-medium text-anime-200">
            Step 3: Evaluate Your Results
          </h3>

          <button
            onClick={handleEvaluate}
            disabled={isEvaluating}
            className={cn(
              "px-6 py-3 rounded-md font-medium transition-all",
              "bg-anime-cyan text-anime-950 hover:bg-anime-cyan/80",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isEvaluating ? "Evaluating..." : "Evaluate My Results"}
          </button>

          {evaluationError && (
            <p className="text-red-400 text-sm">{evaluationError}</p>
          )}

          {/* Evaluation Results */}
          {evaluationResults && (
            <div className="space-y-3">
              {evaluationResults.map((result) => (
                <div
                  key={result.queryIndex}
                  className={cn(
                    "p-4 rounded-md border",
                    result.passed
                      ? "bg-anime-green/10 border-anime-green text-anime-green"
                      : "bg-red-500/10 border-red-500 text-red-400"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span>{result.passed ? "✓" : "✗"}</span>
                    <span>{result.description}</span>
                  </div>
                  {result.error && (
                    <p className="text-sm mt-1 opacity-80">{result.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Step 4: Cleanup */}
      {isDeployed && (
        <section className="space-y-4 pt-4 border-t border-anime-700">
          <h3 className="text-lg font-medium text-anime-200">
            Step 4: Cleanup (Optional)
          </h3>

          <button
            onClick={() => setShowConfirmDestroy(true)}
            disabled={isDestroying}
            className={cn(
              "px-4 py-2 rounded-md text-sm transition-all",
              "border border-anime-500 text-anime-400 hover:border-red-500 hover:text-red-400"
            )}
          >
            Reset Workspace
          </button>

          {/* Confirmation Modal */}
          {showConfirmDestroy && (
            <div className="fixed inset-0 bg-anime-950/90 flex items-center justify-center z-50">
              <div className="bg-anime-900 border border-anime-700 rounded-lg p-6 max-w-md space-y-4">
                <h4 className="text-lg font-medium text-anime-100">
                  Are you sure?
                </h4>
                <p className="text-anime-400 text-sm">
                  This will remove the mission's schema, data, and notebook from your workspace.
                  Your progress in this app will be preserved.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowConfirmDestroy(false)}
                    className="px-4 py-2 rounded-md text-anime-400 hover:text-anime-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDestroy}
                    disabled={isDestroying}
                    className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600"
                  >
                    {isDestroying ? "Destroying..." : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
