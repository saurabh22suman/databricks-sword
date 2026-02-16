/**
 * Validation Results Component
 * Displays validation check results with pass/fail status.
 */

import { cn } from "@/lib/utils"

type Validation = {
  checkName: string
  passed: boolean
  executedAt: string
  errorMessage?: string | null
}

type ValidationResultsProps = {
  validations: Validation[]
}

export function ValidationResults({
  validations,
}: ValidationResultsProps): React.ReactElement {
  const passedCount = validations.filter((v) => v.passed).length
  const totalCount = validations.length

  return (
    <div className="cut-corner bg-anime-900 border border-anime-700 p-6">
      <h2 className="font-heading text-2xl text-anime-cyan mb-3">
        ✓ Validation Results ({passedCount}/{totalCount})
      </h2>

      <ul className="space-y-3">
        {validations.map((validation, index) => (
          <li
            key={index}
            className={cn(
              "cut-corner border p-3",
              validation.passed
                ? "bg-anime-green/10 border-anime-green"
                : "bg-anime-accent/10 border-anime-accent"
            )}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">
                {validation.passed ? "✓" : "✗"}
              </span>
              <div className="flex-1">
                <p
                  className={cn(
                    "font-semibold",
                    validation.passed ? "text-anime-green" : "text-anime-accent"
                  )}
                >
                  {validation.checkName}
                </p>
                {validation.errorMessage && (
                  <p className="text-anime-300 text-sm mt-1">
                    {validation.errorMessage}
                  </p>
                )}
                <p className="text-anime-500 text-xs mt-1">
                  {new Date(validation.executedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {passedCount === totalCount && totalCount > 0 && (
        <div className="mt-4 p-3 cut-corner bg-anime-green/10 border border-anime-green">
          <p className="text-anime-green font-semibold">
            🎉 All checks passed! You can complete the mission.
          </p>
        </div>
      )}
    </div>
  )
}
