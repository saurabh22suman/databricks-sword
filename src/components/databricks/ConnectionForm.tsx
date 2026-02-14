"use client";

import { cn } from "@/lib/utils";
import { useState, type FormEvent } from "react";

/**
 * Props for ConnectionForm component
 */
type ConnectionFormProps = {
  /** User ID for the connection */
  userId: string;
  /** Callback when connection is successful */
  onConnect: (workspaceUrl: string) => void;
  /** Additional CSS classes */
  className?: string;
};

/**
 * Form for connecting to a Databricks workspace
 * Validates workspace URL and PAT before submitting to API
 */
export function ConnectionForm({
  userId,
  onConnect,
  className,
}: ConnectionFormProps): React.ReactElement {
  const [workspaceUrl, setWorkspaceUrl] = useState("");
  const [pat, setPat] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    workspaceUrl?: string;
    pat?: string;
  }>({});

  const validateForm = (): boolean => {
    const errors: { workspaceUrl?: string; pat?: string } = {};

    // Validate workspace URL
    if (!workspaceUrl.trim()) {
      errors.workspaceUrl = "Workspace URL is required";
    } else if (
      !workspaceUrl.match(
        /^https:\/\/.*\.(cloud\.databricks\.com|azuredatabricks\.net|gcp\.databricks\.com)/
      )
    ) {
      errors.workspaceUrl = "Invalid Databricks workspace URL";
    }

    // Validate PAT
    if (!pat.trim()) {
      errors.pat = "Personal Access Token is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/databricks/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceUrl,
          pat,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to connect");
        return;
      }

      onConnect(data.workspaceUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("space-y-4", className)}
    >
      {/* Workspace URL Field */}
      <div className="space-y-1">
        <label
          htmlFor="workspace-url"
          className="block text-sm font-medium text-anime-200"
        >
          Workspace URL
        </label>
        <input
          id="workspace-url"
          type="url"
          value={workspaceUrl}
          onChange={(e) => {
            setWorkspaceUrl(e.target.value);
            setValidationErrors((prev) => ({ ...prev, workspaceUrl: undefined }));
          }}
          placeholder="https://dbc-abc123.cloud.databricks.com"
          className={cn(
            "w-full px-3 py-2 rounded-md border bg-anime-900 text-anime-100",
            "placeholder:text-anime-500 focus:outline-none focus:ring-2",
            validationErrors.workspaceUrl
              ? "border-red-500 focus:ring-red-500"
              : "border-anime-700 focus:ring-anime-cyan"
          )}
          disabled={isLoading}
        />
        {validationErrors.workspaceUrl && (
          <p className="text-sm text-red-400">{validationErrors.workspaceUrl}</p>
        )}
      </div>

      {/* PAT Field */}
      <div className="space-y-1">
        <label
          htmlFor="pat"
          className="block text-sm font-medium text-anime-200"
        >
          Personal Access Token
        </label>
        <input
          id="pat"
          type="password"
          value={pat}
          onChange={(e) => {
            setPat(e.target.value);
            setValidationErrors((prev) => ({ ...prev, pat: undefined }));
          }}
          placeholder="dapi_..."
          className={cn(
            "w-full px-3 py-2 rounded-md border bg-anime-900 text-anime-100",
            "placeholder:text-anime-500 focus:outline-none focus:ring-2",
            validationErrors.pat
              ? "border-red-500 focus:ring-red-500"
              : "border-anime-700 focus:ring-anime-cyan"
          )}
          disabled={isLoading}
        />
        {validationErrors.pat && (
          <p className="text-sm text-red-400">{validationErrors.pat}</p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          "w-full py-2 px-4 rounded-md font-medium transition-colors",
          "bg-anime-accent text-white hover:bg-anime-accent/80",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "focus:outline-none focus:ring-2 focus:ring-anime-accent focus:ring-offset-2 focus:ring-offset-anime-900"
        )}
      >
        {isLoading ? "Connecting..." : "Connect"}
      </button>

      {/* Help Text */}
      <p className="text-xs text-anime-400">
        Your PAT is encrypted at rest and never logged. 
        <a 
          href="https://docs.databricks.com/en/dev-tools/auth/pat.html" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-anime-cyan hover:underline ml-1"
        >
          How to create a PAT
        </a>
      </p>
    </form>
  );
}
