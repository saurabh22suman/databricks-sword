"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

/**
 * Props for ConnectionStatus component
 */
type ConnectionStatusProps = {
  /** User ID to check status for */
  userId: string;
  /** Optional mission slug to check bundle status */
  missionSlug?: string;
  /** Whether to validate connection health */
  validate?: boolean;
  /** Callback when disconnect is clicked */
  onDisconnect?: () => void;
  /** Additional CSS classes */
  className?: string;
};

/**
 * API response shape
 */
type StatusResponse = {
  connected: boolean;
  workspaceUrl?: string;
  bundleStatus?: {
    status: "deployed" | "not-deployed" | "deploying" | "error";
    deployedAt?: string;
    error?: string;
  };
  connectionHealthy?: boolean;
  healthError?: string;
};

/**
 * Displays the current Databricks connection status
 * Optionally shows bundle deployment status and connection health
 */
export function ConnectionStatus({
  userId,
  missionSlug,
  validate,
  onDisconnect,
  className,
}: ConnectionStatusProps): React.ReactElement {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ userId });
        if (missionSlug) params.set("missionSlug", missionSlug);
        if (validate) params.set("validate", "true");

        const response = await fetch(`/api/databricks/status?${params}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to fetch status");
          return;
        }

        setStatus(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch status");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, [userId, missionSlug, validate]);

  if (isLoading) {
    return (
      <div className={cn("p-4 rounded-md bg-anime-900 border border-anime-700", className)}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-anime-cyan border-t-transparent rounded-full animate-spin" />
          <span className="text-anime-300">Loading connection status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-4 rounded-md bg-red-500/10 border border-red-500/30", className)}>
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className={cn("p-4 rounded-md bg-anime-900 border border-anime-700", className)}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-anime-500" />
          <span className="text-anime-300">Not connected to Databricks</span>
        </div>
      </div>
    );
  }

  // Extract workspace name from URL for display
  const workspaceName = status.workspaceUrl?.match(/https:\/\/([^/]+)/)?.[1] || status.workspaceUrl;

  return (
    <div className={cn("p-4 rounded-md bg-anime-900 border border-anime-700 space-y-3", className)}>
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-anime-green animate-pulse" />
          <span className="text-anime-100 font-medium">Connected</span>
        </div>
        {onDisconnect && (
          <button
            onClick={onDisconnect}
            className="text-sm text-anime-400 hover:text-red-400 transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>

      {/* Workspace URL */}
      <div className="text-sm text-anime-400">
        <span className="text-anime-cyan">{workspaceName}</span>
      </div>

      {/* Connection Health (if validate is true) */}
      {validate && status.connectionHealthy !== undefined && (
        <div className="flex items-center gap-2 text-sm">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              status.connectionHealthy ? "bg-anime-green" : "bg-red-500"
            )}
          />
          <span className={status.connectionHealthy ? "text-anime-green" : "text-red-400"}>
            {status.connectionHealthy ? "Healthy" : "Unhealthy"}
          </span>
          {status.healthError && (
            <span className="text-red-400 text-xs">({status.healthError})</span>
          )}
        </div>
      )}

      {/* Bundle Status (if missionSlug is provided) */}
      {status.bundleStatus && (
        <div className="pt-2 border-t border-anime-700">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-anime-400">Bundle:</span>
            <BundleStatusBadge status={status.bundleStatus.status} />
            {status.bundleStatus.deployedAt && (
              <span className="text-anime-500 text-xs">
                ({new Date(status.bundleStatus.deployedAt).toLocaleString()})
              </span>
            )}
          </div>
          {status.bundleStatus.error && (
            <p className="text-xs text-red-400 mt-1">{status.bundleStatus.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Badge component for bundle status display
 */
function BundleStatusBadge({ status }: { status: string }): React.ReactElement {
  const statusConfig = {
    deployed: { label: "Deployed", color: "bg-anime-green text-anime-950" },
    "not-deployed": { label: "Not Deployed", color: "bg-anime-500 text-anime-950" },
    deploying: { label: "Deploying...", color: "bg-anime-yellow text-anime-950" },
    error: { label: "Error", color: "bg-red-500 text-white" },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig["not-deployed"];

  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", config.color)}>
      {config.label}
    </span>
  );
}
