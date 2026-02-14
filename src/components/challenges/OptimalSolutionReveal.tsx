/**
 * @file OptimalSolutionReveal.tsx
 * @description Reveals the optimal solution and explanation after a challenge attempt
 */

"use client"

import React, { useState } from "react"

export type OptimalSolutionRevealProps = {
  /** The optimal solution code */
  optimalSolution: string
  /** Explanation of why this solution is optimal */
  explanation: string
}

/**
 * OptimalSolutionReveal displays a hidden optimal solution that can be revealed by clicking.
 */
export function OptimalSolutionReveal({
  optimalSolution,
  explanation,
}: OptimalSolutionRevealProps): React.ReactElement {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="cut-corner border border-anime-700 bg-anime-900 p-6">
      {!revealed ? (
        <div className="text-center">
          <p className="text-anime-400 mb-4">
            Ready to see the optimal solution?
          </p>
          <button
            onClick={() => setRevealed(true)}
            className="px-6 py-3 rounded bg-anime-purple/20 text-anime-purple border border-anime-purple font-heading hover:bg-anime-purple/30 transition-colors"
          >
            Reveal Solution
          </button>
        </div>
      ) : (
        <div>
          <h4 className="font-heading text-lg font-bold text-anime-cyan mb-4">
            Optimal Solution
          </h4>
          <pre className="bg-anime-950 border border-anime-700 rounded p-4 mb-4 overflow-x-auto text-sm text-anime-300 font-mono">
            <code>{optimalSolution}</code>
          </pre>
          <h4 className="font-heading text-lg font-bold text-anime-yellow mb-2">
            Explanation
          </h4>
          <p className="text-anime-400">{explanation}</p>
        </div>
      )}
    </div>
  )
}
