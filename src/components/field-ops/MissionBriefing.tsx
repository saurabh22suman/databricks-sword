/**
 * Mission Briefing Component
 * Displays mission overview and start button.
 */

"use client"

import type { Industry, IndustryConfig } from "@/lib/field-ops/types"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { DeploymentLoader } from "./DeploymentLoader"
import { ObjectivesList } from "./ObjectivesList"

type MissionBriefingProps = {
  industry: Industry
  config: IndustryConfig
}

export function MissionBriefing({
  industry,
  config,
}: MissionBriefingProps): React.ReactElement {
  const router = useRouter()
  const [isDeploying, setIsDeploying] = useState(false)
  const [showLoader, setShowLoader] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Track deployment status
  const deploymentResult = useRef<{ success: boolean; error?: string } | null>(null)
  const loaderComplete = useRef(false)

  const handleDeploy = async () => {
    setIsDeploying(true)
    setShowLoader(true)
    setError(null)
    deploymentResult.current = null
    loaderComplete.current = false

    try {
      const response = await fetch("/api/field-ops/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry }),
      })

      const data = await response.json()

      if (!response.ok) {
        deploymentResult.current = { success: false, error: data.error || "Deployment failed" }
        // If loader already complete, show error immediately
        if (loaderComplete.current) {
          setShowLoader(false)
          setError(deploymentResult.current.error!)
          setIsDeploying(false)
        }
        return
      }

      deploymentResult.current = { success: true }
      
      // If loader already complete, redirect immediately
      if (loaderComplete.current) {
        router.push(`/field-ops/${industry}/active`)
      }
    } catch (err) {
      deploymentResult.current = { 
        success: false, 
        error: err instanceof Error ? err.message : "Deployment failed" 
      }
      if (loaderComplete.current) {
        setShowLoader(false)
        setError(deploymentResult.current.error!)
        setIsDeploying(false)
      }
    }
  }

  const handleLoaderComplete = () => {
    loaderComplete.current = true
    
    // Check if API already returned
    if (deploymentResult.current) {
      if (deploymentResult.current.success) {
        router.push(`/field-ops/${industry}/active`)
      } else {
        setShowLoader(false)
        setError(deploymentResult.current.error!)
        setIsDeploying(false)
      }
    }
    // If API hasn't returned yet, wait for it
  }

  return (
    <>
      {showLoader && (
        <DeploymentLoader 
          industry={config.title} 
          onComplete={handleLoaderComplete}
        />
      )}
      
      <div className="py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <a
              href="/field-ops"
              className="text-anime-cyan hover:text-anime-accent mb-4 inline-block"
            >
            ← Back to Field Operations
          </a>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-6xl">{config.emoji}</span>
            <div>
              <h1 className="font-heading text-4xl text-anime-cyan">
                {config.title}
              </h1>
              <p className="text-anime-300 text-lg">{config.description}</p>
            </div>
          </div>
        </div>

        {/* Scenario */}
        <div className="cut-corner bg-anime-900 border border-anime-700 p-6 mb-6">
          <h2 className="font-heading text-2xl text-anime-cyan mb-3">
            📋 Scenario
          </h2>
          <p className="text-anime-300 leading-relaxed">
            {config.scenario}
          </p>
        </div>

        {/* Objectives */}
        <div className="cut-corner bg-anime-900 border border-anime-700 p-6 mb-6">
          <h2 className="font-heading text-2xl text-anime-cyan mb-3">
            🎯 Objectives
          </h2>
          <ObjectivesList objectives={config.objectives} completed={[]} />
        </div>

        {/* What Gets Deployed */}
        <div className="cut-corner bg-anime-900 border border-anime-700 p-6 mb-6">
          <h2 className="font-heading text-2xl text-anime-cyan mb-3">
            📦 What Gets Deployed
          </h2>
          <ul className="space-y-2 text-anime-300">
            <li>• 3 schemas: bronze, silver, gold</li>
            <li>• Sample data files ({config.industry} domain)</li>
            <li>• Notebook templates (some incomplete/broken)</li>
            <li>• Validation queries for automated checking</li>
          </ul>
        </div>

        {/* Stats & CTA */}
        <div className="flex items-center justify-between cut-corner bg-anime-900 border border-anime-700 p-6 mb-6">
          <div className="flex gap-8">
            <div>
              <p className="text-anime-500 text-sm">XP Reward</p>
              <p className="text-anime-green font-semibold text-xl">
                +{config.xpReward.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-anime-500 text-sm">Estimated Time</p>
              <p className="text-anime-100 font-semibold text-xl">
                {config.estimatedMinutes} min
              </p>
            </div>
          </div>

          <button
            onClick={handleDeploy}
            disabled={isDeploying}
            className="cut-corner bg-anime-cyan hover:bg-anime-accent text-anime-950 font-semibold px-8 py-3 text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeploying ? "Deploying..." : "🚀 Deploy Mission"}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="cut-corner bg-anime-accent/10 border border-anime-accent p-4">
            <p className="text-anime-accent">{error}</p>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
