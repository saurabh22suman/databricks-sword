"use client"

/**
 * MapNode Component
 *
 * Renders a single mission or Field Ops node on the map.
 * Visual states: locked, available, in-progress, completed.
 * Shows tooltip on hover, navigates on click.
 */

import { INDUSTRY_CONFIGS } from "@/lib/field-ops/industries"
import { RANK_COLORS, TRACK_COLORS, type MapNode as MapNodeType } from "@/lib/missions/mapLayout"
import { TRACKS } from "@/lib/missions/tracks"
import type { MissionRank } from "@/lib/missions/types"
import { cn } from "@/lib/utils"
import { Check, Lock, Play } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useRef, useState } from "react"

/**
 * Node state for visual rendering.
 */
export type NodeState = "locked" | "available" | "in-progress" | "completed"

/**
 * Props for MapNode component.
 */
type MapNodeProps = {
  node: MapNodeType
  state: NodeState
  title: string
  rank?: MissionRank
  xpRequired?: number
  xpReward?: number
  estimatedMinutes?: number
  progress?: number // 0-100 for in-progress
  onClick?: () => void
}

/**
 * Node radius constants.
 */
const NODE_RADIUS = {
  mission: 28,
  "field-ops": 32,
}

/**
 * Renders a mission or Field Ops node on the SVG map.
 */
export function MapNode({
  node,
  state,
  title,
  rank,
  xpRequired = 0,
  xpReward = 0,
  estimatedMinutes = 0,
  progress = 0,
  onClick,
}: MapNodeProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  const radius = NODE_RADIUS[node.type]
  const trackColors = node.track ? TRACK_COLORS[node.track] : TRACK_COLORS.de
  const rankColor = rank ? RANK_COLORS[rank] : RANK_COLORS.B

  // Get industry config for field ops nodes
  const industryConfig = node.industry ? INDUSTRY_CONFIGS[node.industry] : null

  // Stable hover handlers with debounce to prevent flickering
  const handleMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    setIsHovered(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsHovered(false)
    }, 100) // Small delay prevents flicker
  }, [])

  const handleClick = () => {
    if (state === "locked") return
    if (onClick) {
      onClick()
    } else if (node.type === "mission") {
      router.push(`/missions/${node.id}`)
    } else if (node.industry) {
      router.push(`/field-ops/${node.industry}`)
    }
  }

  // Determine glow class based on state and track
  const getGlowClass = () => {
    if (state === "locked") return ""
    if (state === "completed") return "map-glow-green"
    if (node.type === "field-ops") return "map-glow-purple"
    switch (node.track) {
      case "ml":
        return "map-glow-purple"
      case "bi":
        return "map-glow-yellow"
      default:
        return "map-glow-cyan"
    }
  }

  return (
    <g
      className={cn(
        "map-node",
        state === "locked" && "map-node-locked",
        getGlowClass()
      )}
      transform={`translate(${node.x}, ${node.y})`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{ cursor: state === "locked" ? "default" : "pointer" }}
    >
      {/* Invisible larger hit area for easier hovering */}
      <circle r={radius + 20} fill="transparent" />

      {/* Pulse rings for available nodes */}
      {state === "available" && (
        <>
          <circle
            r={radius + 15}
            fill="none"
            stroke={trackColors.stroke}
            strokeWidth="1"
            opacity="0.3"
            className="ring-pulse"
          />
          <circle
            r={radius + 15}
            fill="none"
            stroke={trackColors.stroke}
            strokeWidth="1"
            opacity="0.3"
            className="ring-pulse-delayed"
          />
        </>
      )}

      {/* Main node shape */}
      {node.type === "field-ops" ? (
        // Hexagon for Field Ops
        <g>
          <polygon
            points={hexagonPoints(radius)}
            fill={state === "locked" ? "rgba(42, 42, 58, 0.5)" : "rgba(153, 51, 255, 0.2)"}
            stroke={state === "locked" ? "var(--anime-700)" : "var(--anime-purple)"}
            strokeWidth={state === "completed" ? 3 : 2}
          />
          {state === "completed" && (
            <polygon
              points={hexagonPoints(radius - 6)}
              fill="none"
              stroke="var(--anime-green)"
              strokeWidth="2"
              opacity="0.6"
            />
          )}
        </g>
      ) : (
        // Circle for missions
        <g>
          {/* Outer ring */}
          <circle
            r={radius}
            fill={state === "locked" ? "rgba(42, 42, 58, 0.5)" : `${trackColors.fill}10`}
            stroke={state === "locked" ? "var(--anime-700)" : trackColors.stroke}
            strokeWidth={state === "completed" ? 3 : 2}
            opacity={state === "locked" ? 0.5 : 1}
          />
          
          {/* Inner circle with rank color */}
          {state !== "locked" && (
            <circle
              r={radius - 8}
              fill="none"
              stroke={rankColor.stroke}
              strokeWidth="2"
              opacity={state === "completed" ? 1 : 0.6}
            />
          )}

          {/* Progress arc for in-progress */}
          {state === "in-progress" && progress > 0 && (
            <circle
              r={radius + 4}
              fill="none"
              stroke="var(--anime-accent)"
              strokeWidth="3"
              strokeDasharray={`${(progress / 100) * 2 * Math.PI * (radius + 4)} ${2 * Math.PI * (radius + 4)}`}
              strokeLinecap="round"
              transform="rotate(-90)"
              className="progress-arc"
            />
          )}
        </g>
      )}

      {/* Node icon/indicator */}
      <g>
        {state === "locked" && (
          <Lock
            x={-10}
            y={-10}
            width={20}
            height={20}
            stroke="var(--anime-700)"
            strokeWidth={1.5}
          />
        )}
        {state === "completed" && (
          <Check
            x={-12}
            y={-12}
            width={24}
            height={24}
            stroke="var(--anime-green)"
            strokeWidth={2.5}
          />
        )}
        {state === "available" && (
          <Play
            x={-8}
            y={-8}
            width={16}
            height={16}
            fill={trackColors.fill}
            stroke="none"
          />
        )}
        {state === "in-progress" && (
          <circle r={6} fill="var(--anime-accent)" className="node-pulse" />
        )}
        {node.type === "field-ops" && industryConfig && state !== "locked" && state !== "completed" && (
          <text
            fontSize="20"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {industryConfig.emoji}
          </text>
        )}
      </g>

      {/* Rank badge for missions */}
      {rank && state !== "locked" && node.type === "mission" && (
        <g transform={`translate(${radius - 5}, ${-radius + 5})`}>
          <circle r="10" fill="var(--anime-950)" stroke={rankColor.stroke} strokeWidth="1.5" />
          <text
            fontSize="10"
            fontWeight="bold"
            fill={rankColor.fill}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {rank}
          </text>
        </g>
      )}

      {/* Hover tooltip - pure SVG for stability */}
      {isHovered && state !== "locked" && (
        <g transform="translate(45, -60)" style={{ pointerEvents: 'none' }}>
          {/* Tooltip background */}
          <rect 
            x="0" 
            y="0" 
            width="180" 
            height={node.industry ? 70 : 80}
            rx="6"
            fill="rgba(18, 18, 26, 0.95)"
            stroke="var(--anime-cyan)"
            strokeWidth="1"
          />
          {/* Arrow pointer */}
          <polygon 
            points="-8,30 0,20 0,40" 
            fill="rgba(18, 18, 26, 0.95)" 
            stroke="var(--anime-cyan)"
            strokeWidth="1"
          />
          {/* Title */}
          <text 
            x="12" 
            y="22" 
            fill="var(--anime-cyan)" 
            fontSize="13" 
            fontWeight="bold"
            style={{ fontFamily: 'inherit' }}
          >
            {title.length > 20 ? title.slice(0, 20) + '...' : title}
          </text>
          {/* Track badge */}
          {node.track && (
            <g>
              <rect 
                x="12" 
                y="30" 
                width={TRACKS[node.track].shortName.length * 8 + 12} 
                height="18" 
                rx="3"
                fill={node.track === "de" ? "rgba(0, 255, 255, 0.2)" : node.track === "ml" ? "rgba(153, 51, 255, 0.2)" : "rgba(255, 204, 0, 0.2)"}
                stroke={node.track === "de" ? "var(--anime-cyan)" : node.track === "ml" ? "var(--anime-purple)" : "var(--anime-yellow)"}
                strokeWidth="1"
              />
              <text 
                x="18" 
                y="43" 
                fill={node.track === "de" ? "var(--anime-cyan)" : node.track === "ml" ? "var(--anime-purple)" : "var(--anime-yellow)"}
                fontSize="10" 
                fontWeight="600"
              >
                {TRACKS[node.track].shortName}
              </text>
            </g>
          )}
          {/* Field ops industry title */}
          {node.industry && industryConfig && (
            <text 
              x="12" 
              y="42" 
              fill="var(--anime-purple)" 
              fontSize="11" 
              fontWeight="500"
            >
              {industryConfig.title.length > 22 ? industryConfig.title.slice(0, 22) + '...' : industryConfig.title}
            </text>
          )}
          {/* XP and time */}
          <text 
            x="12" 
            y={node.industry ? 58 : 68} 
            fill="var(--anime-green)" 
            fontSize="11" 
            fontWeight="bold"
          >
            +{xpReward} XP
          </text>
          <text 
            x="90" 
            y={node.industry ? 58 : 68} 
            fill="var(--anime-400)" 
            fontSize="11"
          >
            ⏱ {estimatedMinutes} min
          </text>
        </g>
      )}
    </g>
  )
}

/**
 * Generate hexagon points for a given radius.
 */
function hexagonPoints(radius: number): string {
  const points: string[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    points.push(`${radius * Math.cos(angle)},${radius * Math.sin(angle)}`)
  }
  return points.join(" ")
}
