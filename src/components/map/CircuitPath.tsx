"use client"

/**
 * CircuitPath Component
 *
 * Renders prerequisite connection paths between map nodes.
 * Uses L-shaped routing with circuit-board aesthetic.
 * Animates with electricity flow effect when unlocked.
 */

import { TRACK_COLORS, type MapEdge, type MapNode } from "@/lib/missions/mapLayout"
import { cn } from "@/lib/utils"
import { useMemo } from "react"

/**
 * Props for CircuitPath component.
 */
type CircuitPathProps = {
  edge: MapEdge
  nodes: Map<string, MapNode>
  isUnlocked: boolean
  isActive?: boolean // Currently traversing this path
}

/**
 * Routing style for edges.
 */
type RoutingStyle = "direct" | "horizontal-first" | "vertical-first"

/**
 * Get the midpoint offset for L-shaped routing.
 */
function getRoutingStyle(from: MapNode, to: MapNode): RoutingStyle {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  // For short distances, use direct paths
  if (distance < 100) return "direct"

  // Choose routing based on relative positions to minimize path length
  // and create cleaner circuit-board aesthetics
  if (Math.abs(dx) > Math.abs(dy)) {
    return "horizontal-first"
  }
  return "vertical-first"
}

/**
 * Generate SVG path data for the edge.
 */
function generatePathData(
  from: MapNode,
  to: MapNode,
  nodeRadius: number = 28
): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  // Normalize direction vector
  const nx = dx / distance
  const ny = dy / distance

  // Start and end points (offset from center by node radius)
  const startX = from.x + nx * nodeRadius
  const startY = from.y + ny * nodeRadius
  const endX = to.x - nx * nodeRadius
  const endY = to.y - ny * nodeRadius

  const routing = getRoutingStyle(from, to)

  if (routing === "direct") {
    return `M ${startX} ${startY} L ${endX} ${endY}`
  }

  // L-shaped routing with curved corners
  const cornerRadius = 15

  if (routing === "horizontal-first") {
    const midX = startX + (endX - startX) * 0.5
    return `M ${startX} ${startY} 
            L ${midX - cornerRadius * Math.sign(endX - startX)} ${startY}
            Q ${midX} ${startY} ${midX} ${startY + cornerRadius * Math.sign(endY - startY)}
            L ${midX} ${endY - cornerRadius * Math.sign(endY - startY)}
            Q ${midX} ${endY} ${midX + cornerRadius * Math.sign(endX - startX)} ${endY}
            L ${endX} ${endY}`
  }

  // vertical-first
  const midY = startY + (endY - startY) * 0.5
  return `M ${startX} ${startY}
          L ${startX} ${midY - cornerRadius * Math.sign(endY - startY)}
          Q ${startX} ${midY} ${startX + cornerRadius * Math.sign(endX - startX)} ${midY}
          L ${endX - cornerRadius * Math.sign(endX - startX)} ${midY}
          Q ${endX} ${midY} ${endX} ${midY + cornerRadius * Math.sign(endY - startY)}
          L ${endX} ${endY}`
}

/**
 * Generate arrow marker for path end.
 */
function ArrowMarker({ id, color }: { id: string; color: string }): React.ReactElement {
  return (
    <marker
      id={id}
      markerWidth="8"
      markerHeight="6"
      refX="8"
      refY="3"
      orient="auto"
    >
      <polygon points="0 0, 8 3, 0 6" fill={color} />
    </marker>
  )
}

/**
 * Renders a circuit-board style path between two nodes.
 */
export function CircuitPath({
  edge,
  nodes,
  isUnlocked,
  isActive = false,
}: CircuitPathProps): React.ReactElement | null {
  const fromNode = nodes.get(edge.from)
  const toNode = nodes.get(edge.to)

  if (!fromNode || !toNode) return null

  const trackColors = edge.track ? TRACK_COLORS[edge.track] : TRACK_COLORS.de
  const pathData = useMemo(
    () => generatePathData(fromNode, toNode),
    [fromNode, toNode]
  )

  // Calculate path length for animation
  const pathId = `path-${edge.from}-${edge.to}`
  const gradientId = `gradient-${edge.from}-${edge.to}`
  const markerId = `arrow-${edge.from}-${edge.to}`

  return (
    <g className={cn(
      isUnlocked ? "circuit-trace" : "circuit-trace-dim",
      isActive && "circuit-trace-bright"
    )}>
      {/* Gradient for path */}
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={trackColors.stroke} stopOpacity={isUnlocked ? 0.6 : 0.2} />
          <stop offset="50%" stopColor={trackColors.fill} stopOpacity={isUnlocked ? 0.8 : 0.3} />
          <stop offset="100%" stopColor={trackColors.stroke} stopOpacity={isUnlocked ? 0.6 : 0.2} />
        </linearGradient>
        {isUnlocked && <ArrowMarker id={markerId} color={trackColors.stroke} />}
      </defs>

      {/* Background glow */}
      {isUnlocked && (
        <path
          d={pathData}
          fill="none"
          stroke={trackColors.fill}
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.15"
          style={{ filter: "blur(4px)" }}
        />
      )}

      {/* Main path */}
      <path
        id={pathId}
        d={pathData}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={isUnlocked ? 2 : 1}
        strokeLinecap="round"
        strokeDasharray={isUnlocked ? "none" : "4 4"}
        markerEnd={isUnlocked ? `url(#${markerId})` : undefined}
      />

      {/* Animated electricity flow (when unlocked) */}
      {isUnlocked && (
        <circle r="3" fill={trackColors.fill}>
          <animateMotion dur="2s" repeatCount="indefinite">
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
      )}

      {/* Additional spark effect for active paths */}
      {isActive && (
        <>
          <circle r="5" fill="white" opacity="0.8">
            <animateMotion dur="1.5s" repeatCount="indefinite">
              <mpath href={`#${pathId}`} />
            </animateMotion>
          </circle>
          <circle r="8" fill={trackColors.fill} opacity="0.3">
            <animateMotion dur="1.5s" repeatCount="indefinite" begin="0.2s">
              <mpath href={`#${pathId}`} />
            </animateMotion>
          </circle>
        </>
      )}
    </g>
  )
}

/**
 * Batch render multiple circuit paths.
 * Useful for rendering all edges at once.
 */
type CircuitPathsProps = {
  edges: MapEdge[]
  nodes: Map<string, MapNode>
  completedMissions: Set<string>
  currentMission?: string
}

export function CircuitPaths({
  edges,
  nodes,
  completedMissions,
  currentMission,
}: CircuitPathsProps): React.ReactElement {
  return (
    <g className="circuit-paths">
      {edges.map((edge) => {
        const isUnlocked =
          completedMissions.has(edge.from) || completedMissions.has(edge.to)
        const isActive = edge.to === currentMission && completedMissions.has(edge.from)

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
