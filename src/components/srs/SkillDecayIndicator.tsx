import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import type { SkillDecay } from "@/lib/srs"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import React from "react"

interface SkillDecayIndicatorProps {
  /** Skill decay data to display */
  skillDecayData: SkillDecay[]
  /** Whether to show filter controls */
  showFilters?: boolean
  /** Current filter level */
  filterLevel?: "none" | "mild" | "moderate" | "severe"
  /** Handler for reviewing a skill */
  onReviewSkill: (skillId: string) => void
  /** Handler for viewing skill details */
  onViewDetails: (skillId: string) => void
  /** Handler for refreshing data */
  onRefresh: () => void
  /** Handler for filter changes */
  onFilterChange?: (level?: "none" | "mild" | "moderate" | "severe") => void
}

export type { SkillDecayIndicatorProps }

const DECAY_LEVEL_CONFIG = {
  severe: {
    label: "SEVERE",
    color: "border-anime-accent text-anime-accent",
    bgColor: "bg-anime-accent/10",
    badgeVariant: "advanced" as const,
    priority: 4
  },
  moderate: {
    label: "MODERATE", 
    color: "border-anime-yellow text-anime-yellow",
    bgColor: "bg-anime-yellow/10",
    badgeVariant: "intermediate" as const,
    priority: 3
  },
  mild: {
    label: "MILD",
    color: "border-anime-cyan text-anime-cyan",
    bgColor: "bg-anime-cyan/10",
    badgeVariant: "intermediate" as const,
    priority: 2
  },
  none: {
    label: "GOOD",
    color: "border-anime-green text-anime-green",
    bgColor: "bg-anime-green/10", 
    badgeVariant: "beginner" as const,
    priority: 1
  }
}

const ACTION_CONFIG = {
  relearn: { label: "Relearn", variant: "advanced" as const },
  practice: { label: "Practice", variant: "intermediate" as const },
  review: { label: "Review", variant: "default" as const },
  none: { label: "Good", variant: "beginner" as const }
}

/**
 * Skill decay indicator with visual decay levels and recommendations
 * Shows knowledge retention estimates and recommended actions
 */
export function SkillDecayIndicator({
  skillDecayData,
  showFilters = false,
  filterLevel,
  onReviewSkill,
  onViewDetails,
  onRefresh,
  onFilterChange
}: SkillDecayIndicatorProps): React.ReactElement {
  // Filter and sort skills by decay priority
  const filteredSkills = filterLevel
    ? skillDecayData.filter(skill => skill.decayLevel === filterLevel)
    : skillDecayData

  const sortedSkills = [...filteredSkills].sort((a, b) => 
    DECAY_LEVEL_CONFIG[b.decayLevel].priority - DECAY_LEVEL_CONFIG[a.decayLevel].priority
  )

  // Empty state
  if (skillDecayData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-center space-y-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-5xl"
        >
          📊
        </motion.div>
        <div className="space-y-2">
          <h3 className="text-lg font-heading text-anime-cyan">No Skill Decay Data</h3>
          <p className="text-anime-accent">Complete some missions to track your knowledge retention.</p>
        </div>
        <Button variant="primary" onClick={onRefresh}>
          Get Started
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-heading text-anime-cyan">Skill Decay Monitor</h2>
          <p className="text-sm text-anime-accent">
            Knowledge retention across {skillDecayData.length} skills
          </p>
        </div>
        <Button variant="outline" onClick={onRefresh} size="sm">
          🔄 Refresh
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-2 p-4 bg-anime-800 rounded-lg">
          <span className="text-sm text-anime-cyan font-mono">FILTER:</span>
          <Button
            variant={!filterLevel ? "primary" : "outline"}
            size="sm"
            onClick={() => onFilterChange?.()}
          >
            All Levels
          </Button>
          {Object.entries(DECAY_LEVEL_CONFIG).map(([level, config]) => (
            <Button
              key={level}
              variant={filterLevel === level ? "primary" : "outline"}
              size="sm"
              onClick={() => onFilterChange?.(level as any)}
            >
              {config.label}
            </Button>
          ))}
        </div>
      )}

      {/* Skills Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {sortedSkills.map((skill) => {
          const decayConfig = DECAY_LEVEL_CONFIG[skill.decayLevel]
          const actionConfig = ACTION_CONFIG[skill.recommendedAction]

          return (
            <motion.div
              key={skill.skillId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "skill-decay-item p-4 rounded-lg border-2 cut-corner",
                "bg-anime-900 backdrop-blur-sm transition-all duration-300",
                "hover:shadow-neon-cyan group",
                decayConfig.color
              )}
            >
              {/* Skill Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-1">
                  <h3 className="font-heading text-anime-cyan">{skill.skillName}</h3>
                  <div className="text-xs text-anime-accent">
                    Last practiced: {skill.daysSinceLastPractice} days ago
                  </div>
                </div>
                <Badge variant={decayConfig.badgeVariant} className="text-xs">
                  {decayConfig.label}
                </Badge>
              </div>

              {/* Retention Progress */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-anime-cyan font-mono">RETENTION</span>
                  <span className="text-anime-accent">{skill.retentionEstimate}%</span>
                </div>
                <div 
                  className="w-full bg-anime-800 rounded-full h-2 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={skill.retentionEstimate}
                  aria-valuemax={100}
                >
                  <motion.div
                    className={cn(
                      "h-full transition-all duration-500",
                      skill.retentionEstimate >= 80 ? "bg-anime-green" :
                      skill.retentionEstimate >= 60 ? "bg-anime-cyan" :
                      skill.retentionEstimate >= 40 ? "bg-anime-yellow" :
                      "bg-anime-accent"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${skill.retentionEstimate}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                </div>
              </div>

              {/* Card Statistics */}
              <div className="flex items-center justify-between mb-4 p-2 bg-anime-800 rounded">
                <div className="text-center">
                  <div className="text-xs text-anime-cyan font-mono">DUE</div>
                  <div className="text-lg font-bold text-anime-accent">{skill.cardsDue}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-anime-cyan font-mono">TOTAL</div>
                  <div className="text-lg font-bold text-anime-accent">{skill.relatedCards}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-anime-cyan font-mono">RATIO</div>
                  <div className="text-lg font-bold text-anime-accent">
                    {skill.cardsDue}/{skill.relatedCards}
                  </div>
                </div>
              </div>

              {/* Recommended Action */}
              <div className="space-y-2 mb-4">
                <div className="text-xs text-anime-cyan font-mono">RECOMMENDED ACTION</div>
                <Badge variant={actionConfig.variant}>
                  {actionConfig.label}
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {skill.recommendedAction !== "none" && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onReviewSkill(skill.skillId)}
                    className="flex-1"
                  >
                    🎯 Review
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(skill.skillId)}
                >
                  📊 Details
                </Button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {filteredSkills.length === 0 && skillDecayData.length > 0 && (
        <div className="text-center text-anime-accent py-8">
          No skills found with {filterLevel} decay level.
        </div>
      )}
    </div>
  )
}