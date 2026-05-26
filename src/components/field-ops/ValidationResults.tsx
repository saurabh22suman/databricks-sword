/**
 * Validation Results Component
 * Displays validation check results with pass/fail status and real-time status indicators.
 */

import { cn } from "@/lib/utils"
import { RefreshCw, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react"

type ValidationStatus = "pending" | "running" | "passed" | "failed"

type Validation = {
  checkName: string
  passed: boolean
  executedAt: string
  errorMessage?: string | null
  status?: ValidationStatus
}

type ValidationResultsProps = {
  validations: Validation[]
  isLive?: boolean
}

export function ValidationResults({
  validations,
  isLive = false,
}: ValidationResultsProps): React.ReactElement {
  const passedCount = validations.filter((v) => v.passed).length
  const totalCount = validations.length
  const runningCount = validations.filter((v) => v.status === "running").length
  const pendingCount = validations.filter((v) => !v.executedAt || v.status === "pending").length

  // Determine visual status for each validation
  const getStatusIcon = (validation: Validation) => {
    if (validation.status === "running" || runningCount > 0) {
      return <Loader2 className="w-5 h-5 text-anime-cyan animate-spin" />
    }
    if (validation.passed) {
      return <CheckCircle className="w-5 h-5 text-anime-green" />
    }
    if (validation.executedAt && !validation.passed) {
      return <XCircle className="w-5 h-5 text-anime-accent" />
    }
    return <Clock className="w-5 h-5 text-anime-500" />
  }

  const getBackgroundColor = (validation: Validation) => {
    if (validation.status === "running") {
      return "bg-anime-cyan/10 border-anime-cyan"
    }
    if (validation.passed) {
      return "bg-anime-green/10 border-anime-green"
    }
    if (validation.executedAt && !validation.passed) {
      return "bg-anime-accent/10 border-anime-accent"
    }
    return "bg-anime-900/50 border-anime-700"
  }

  return (
    <div className="cut-corner bg-anime-900 border border-anime-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-2xl text-anime-cyan">
          ✓ Validation Results ({passedCount}/{totalCount})
        </h2>

        {/* Live status indicator */}
        {isLive && runningCount > 0 && (
          <div className="flex items-center gap-2 text-anime-cyan text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Running...
          </div>
        )}
        {isLive && pendingCount > 0 && runningCount === 0 && (
          <div className="flex items-center gap-2 text-anime-500 text-sm">
            <Clock className="w-4 h-4" />
            Pending
          </div>
        )}
        {isLive && pendingCount === 0 && runningCount === 0 && passedCount === totalCount && (
          <div className="flex items-center gap-2 text-anime-green text-sm">
            <CheckCircle className="w-4 h-4" />
            Complete
          </div>
        )}
      </div>

      <ul className="space-y-3">
        {validations.map((validation, index) => (
          <li
            key={index}
            className={cn(
              "cut-corner border p-3 transition-all",
              getBackgroundColor(validation)
            )}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">
                {validation.status === "running" ? "⏳" : validation.passed ? "✓" : validation.executedAt ? "✗" : "○"}
              </span>
              <div className="flex-1">
                <p
                  className={cn(
                    "font-semibold",
                    validation.passed ? "text-anime-green" : validation.executedAt ? "text-anime-accent" : "text-anime-400"
                  )}
                >
                  {validation.checkName}
                </p>

                {/* Show execution time if available */}
                {validation.executedAt && (
                  <p className="text-anime-500 text-xs mt-1">
                    {new Date(validation.executedAt).toLocaleTimeString()}
                  </p>
                )}

                {/* Show error message if failed */}
                {validation.errorMessage && (
                  <p className="text-anime-accent text-sm mt-2 font-mono">
                    {validation.errorMessage}
                  </p>
                )}
              </div>

              {/* Status indicator */}
              <div className="flex-shrink-0">
                {getStatusIcon(validation)}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Summary bar */}
      <div className="mt-4 pt-4 border-t border-anime-700">
        <div className="flex gap-4 text-sm">
          <span className="text-anime-green">
            ✓ {passedCount} passed
          </span>
          {runningCount > 0 && (
            <span className="text-anime-cyan">
              ⟳ {runningCount} running
            </span>
          )}
          <span className="text-anime-400">
            ○ {totalCount - passedCount - runningCount} remaining
          </span>
        </div>
      </div>
    </div>
  )
}
