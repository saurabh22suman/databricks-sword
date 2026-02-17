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
 * Validates workspace URL, PAT, warehouse ID, and catalog before submitting to API
 */
export function ConnectionForm({
  userId,
  onConnect,
  className,
}: ConnectionFormProps): React.ReactElement {
  const [workspaceUrl, setWorkspaceUrl] = useState("");
  const [pat, setPat] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [catalogName, setCatalogName] = useState("dev");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    workspaceUrl?: string;
    pat?: string;
    warehouseId?: string;
    catalogName?: string;
  }>({});

  const validateForm = (): boolean => {
    const errors: { workspaceUrl?: string; pat?: string; warehouseId?: string; catalogName?: string } = {};

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

    // Validate Warehouse ID (optional but recommended)
    if (warehouseId.trim() && !warehouseId.match(/^[a-f0-9]{16}$/i)) {
      errors.warehouseId = "Invalid warehouse ID format (should be 16 hex characters)";
    }

    // Validate catalog name
    if (!catalogName.trim()) {
      errors.catalogName = "Catalog name is required";
    } else if (!catalogName.match(/^[a-z_][a-z0-9_]*$/i)) {
      errors.catalogName = "Invalid catalog name (use letters, numbers, underscores)";
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
          warehouseId: warehouseId.trim() || undefined,
          catalogName,
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
        <p className="text-xs text-anime-500">
          <a 
            href="https://docs.databricks.com/en/dev-tools/auth/pat.html" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-anime-cyan hover:underline"
          >
            How to create a PAT
          </a>
        </p>
      </div>

      {/* SQL Warehouse ID Field */}
      <div className="space-y-1">
        <label
          htmlFor="warehouse-id"
          className="block text-sm font-medium text-anime-200"
        >
          SQL Warehouse ID
          <span className="ml-1 text-anime-500 font-normal">(for validation queries)</span>
        </label>
        <input
          id="warehouse-id"
          type="text"
          value={warehouseId}
          onChange={(e) => {
            setWarehouseId(e.target.value);
            setValidationErrors((prev) => ({ ...prev, warehouseId: undefined }));
          }}
          placeholder="b4d816135a346c2e"
          className={cn(
            "w-full px-3 py-2 rounded-md border bg-anime-900 text-anime-100 font-mono",
            "placeholder:text-anime-500 focus:outline-none focus:ring-2",
            validationErrors.warehouseId
              ? "border-red-500 focus:ring-red-500"
              : "border-anime-700 focus:ring-anime-cyan"
          )}
          disabled={isLoading}
        />
        {validationErrors.warehouseId && (
          <p className="text-sm text-red-400">{validationErrors.warehouseId}</p>
        )}
        <p className="text-xs text-anime-500">
          Find in SQL Warehouses → Click warehouse → Copy ID from Overview tab
        </p>
      </div>

      {/* Catalog Name Field */}
      <div className="space-y-1">
        <label
          htmlFor="catalog-name"
          className="block text-sm font-medium text-anime-200"
        >
          Catalog Name
        </label>
        <input
          id="catalog-name"
          type="text"
          value={catalogName}
          onChange={(e) => {
            setCatalogName(e.target.value);
            setValidationErrors((prev) => ({ ...prev, catalogName: undefined }));
          }}
          placeholder="dev"
          className={cn(
            "w-full px-3 py-2 rounded-md border bg-anime-900 text-anime-100 font-mono",
            "placeholder:text-anime-500 focus:outline-none focus:ring-2",
            validationErrors.catalogName
              ? "border-red-500 focus:ring-red-500"
              : "border-anime-700 focus:ring-anime-cyan"
          )}
          disabled={isLoading}
        />
        {validationErrors.catalogName && (
          <p className="text-sm text-red-400">{validationErrors.catalogName}</p>
        )}
        <p className="text-xs text-anime-500">
          Default is &quot;dev&quot; for Free Edition. Check in Catalog Explorer.
        </p>
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

      {/* Security Note */}
      <p className="text-xs text-anime-400 text-center">
        Your credentials are encrypted at rest and never logged.
      </p>
    </form>
  );
}
