"use client"

/**
 * FlowArrow Component
 *
 * Renders prerequisite connection arrows between pipeline nodes.
 * Uses smooth bezier curves for a clean DLT-inspired data flow look.
 * Arrows flow left-to-right with subtle animated particles when unlocked.
 */

import { TRACK_COLORS, type MapEdge, type MapNode } from "@/lib/missions/mapLayout"
import { cn } from "@/lib/utils"
import { useMemo } from "react"

/**
 * Props for a single FlowArrow.
 */
type FlowArrowProps = {
  edge: MapEdge
  nodes: Map<string, MapNode>
  isUnlocked: boolean
  isActive?: boolean
}

/**
 * Node radius for offset calculation.
 */
const NODE_RADIUS = 32

/**
 * Generate smooth bezier path between two nodes.
 * Horizontal-first for the pipeline flow aesthetic.
 */
function generateFlowPath(from: MapNode, to: MapNode): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  // Normalize and offset start/end by node radius
  const nx = dx / dist
  const ny = dy / dist
  const sx = from.x + nx * NODE_RADIUS
  const sy = from.y + ny * NODE_RADIUS
  const ex = to.x - nx * NODE_RADIUS
  const ey = to.y - ny * NODE_RADIUS

  // Short distance: straight line
  if (dist < 120) {
    return `M ${sx} ${sy} L ${ex} ${ey}`
  }

  // Horizontal flow curve — control points pull toward the horizontal
  const cpOffset = Math.min(Math.abs(dx) * 0.45, 120)
  const cp1x = sx + cpOffset
  const cp1y = sy
  const cp2x = ex - cpOffset
  const cp2y = ey

  return `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${ex} ${ey}`
}

/**
 * Renders one flow-arrow between two nodes.
 */
export function CircuitPath({
  edge,
  nodes,
  isUnlocked,
  isActive = false,
}: FlowArrowProps): React.ReactElement | null {
  const fromNode = nodes.get(edge.from)
  const toNode = nodes.get(edge.to)

  if (!fromNode || !toNode) return null

  const trackColors = edge.track ? TRACK_COLORS[edge.track] : TRACK_COLORS.de
  const pathData = useMemo(() => generateFlowPath(fromNode, toNode), [fromNode, toNode])

  const pathId = `flow-${edge.from}-${edge.to}`
  const markerId = `arrow-${edge.from}-${edge.to}`

  return (
    <g
      className={cn(
        "flow-arrow",
        !isUnlocked && "flow-arrow-dim",
        isActive && "flow-arrow-active"
      )}
    >
      {/* Arrow marker */}
      <defs>
        <marker
          id={markerId}
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 8 3, 0 6"
            fill={isUnlocked ? trackColors.stroke : "var(--anime-700)"}
            opacity={isUnlocked ? 0.8 : 0.3}
          />
        </marker>
      </defs>

      {/* Background glow */}
      {isUnlocked && (
        <path
          d={pathData}
          fill="none"
          stroke={trackColors.fill}
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.08"
          style={{ filter: "blur(3px)" }}
        />
      )}

      {/* Main path */}
      <path
        id={pathId}
        d={pathData}
        fill="none"
        stroke={isUnlocked ? trackColors.stroke : "var(--anime-700)"}
        strokeWidth={isUnlocked ? 1.5 : 1}
        strokeLinecap="round"
        strokeDasharray={isUnlocked ? "none" : "4 6"}
        opacity={isUnlocked ? 0.6 : 0.2}
        markerEnd={`url(#${markerId})`}
      />

      {/* Animated particle (when unlocked) */}
      {isUnlocked && (
        <circle r="2.5" fill={trackColors.fill} opacity="0.7">
          <animateMotion dur="3s" repeatCount="indefinite">
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
      )}

      {/* Brighter spark for active paths */}
      {isActive && (
        <circle r="4" fill="white" opacity="0.6">
          <animateMotion dur="2s" repeatCount="indefinite">
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
      )}
    </g>
  )
}

/**
 * Batch render multiple flow arrows.
 */
type CircuitPathsProps = {
  edges: MapEdge[]
  nodes: Map<string, MapNode>
  completedMissions: Set<string>
  currentMission?: string
}

/**
 * Renders all flow arrows for the pipeline map.
 */
export function CircuitPaths({
  edges,
  nodes,
  completedMissions,
  currentMission,
}: CircuitPathsProps): React.ReactElement {
  return (
    <g className="flow-arrows">
      {edges.map((edge) => {
        const isUnlocked =
          completedMissions.has(edge.from) || completedMissions.has(edge.to)
        const isActive =
          edge.to === currentMission && completedMissions.has(edge.from)

        return (
          <CircuitPath
            key={`${edge.from}-${edge.to}`}
            edge={edge}
            nodes={nodes}
            isUnlocked={isUnlocked}
            isActive={isActive}
          />
        )
      })}
    </g>
  )
}
