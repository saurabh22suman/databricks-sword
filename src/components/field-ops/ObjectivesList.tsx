/**
 * Objectives List Component
 * Displays mission objectives with checkboxes.
 */

import { cn } from "@/lib/utils"

type ObjectivesListProps = {
  objectives: string[]
  completed: boolean[]
}

export function ObjectivesList({
  objectives,
  completed,
}: ObjectivesListProps): React.ReactElement {
  return (
    <ul className="space-y-3">
      {objectives.map((objective, index) => {
        const isCompleted = completed[index] || false
        
        return (
          <li key={index} className="flex items-start gap-3">
            <div
              className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                isCompleted
                  ? "bg-anime-green border-anime-green"
                  : "border-anime-700"
              )}
            >
              {isCompleted && (
                <span className="text-anime-950 text-sm font-bold">✓</span>
              )}
            </div>
            <span
              className={cn(
                "text-anime-300",
                isCompleted && "line-through opacity-60"
              )}
            >
              {objective}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
