"use client"

/**
 * PipelineNode Component
 *
 * Renders a single mission or Field Ops node in the pipeline map.
 * DLT-inspired circular nodes with labels below and colored by track.
 * Visual states: locked, available, in-progress, completed.
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
  isGuest?: boolean
}

/**
 * Node radius constants — larger for pipeline visibility.
 */
const NODE_RADIUS = {
  mission: 32,
  "field-ops": 28,
}

/**
 * Truncate a title to fit below the node.
 */
function truncateTitle(title: string, maxLen: number = 18): string {
  if (title.length <= maxLen) return title
  return title.slice(0, maxLen - 1) + "…"
}

/**
 * Renders a single node in the pipeline map.
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
  isGuest = false,
}: MapNodeProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  const radius = NODE_RADIUS[node.type]
  const trackColors = node.track ? TRACK_COLORS[node.track] : TRACK_COLORS.de
  const rankColor = rank ? RANK_COLORS[rank] : RANK_COLORS.B

  // Get industry config for field ops nodes
  const industryConfig = node.industry ? INDUSTRY_CONFIGS[node.industry] : null

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
    }, 100)
  }, [])

  const handleClick = (): void => {
    if (state === "locked" || isGuest) return
    if (onClick) {
      onClick()
    } else if (node.type === "mission") {
      router.push(`/missions/${node.id}`)
    } else if (node.industry) {
      router.push(`/field-ops/${node.industry}`)
    }
  }

  // Background fill color by state and track
  const getFillColor = (): string => {
    if (state === "locked") return "rgba(42, 42, 58, 0.4)"
    if (state === "completed") return "rgba(0, 255, 102, 0.15)"
    if (node.type === "field-ops") return "rgba(153, 51, 255, 0.15)"
    switch (node.track) {
      case "ml": return "rgba(153, 51, 255, 0.15)"
      case "bi": return "rgba(255, 204, 0, 0.15)"
      default: return "rgba(0, 255, 255, 0.15)"
    }
  }

  // Border stroke color
  const getStrokeColor = (): string => {
    if (state === "locked") return "var(--anime-700)"
    if (state === "completed") return "var(--anime-green)"
    if (node.type === "field-ops") return "var(--anime-purple)"
    return trackColors.stroke
  }

  // Glow filter class
  const getGlowClass = (): string => {
    if (state === "locked") return ""
    if (state === "completed") return "map-glow-green"
    if (node.type === "field-ops") return "map-glow-purple"
    switch (node.track) {
      case "ml": return "map-glow-purple"
      case "bi": return "map-glow-yellow"
      default: return "map-glow-cyan"
    }
  }

  // Label color below node
  const getLabelColor = (): string => {
    if (state === "locked") return "var(--anime-700)"
    if (state === "completed") return "var(--anime-green)"
    if (node.type === "field-ops") return "var(--anime-purple)"
    return trackColors.stroke
  }

  return (
    <g
      className={cn(
        "map-node pipeline-node",
        state === "locked" && "map-node-locked",
        getGlowClass()
      )}
      transform={`translate(${node.x}, ${node.y})`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{ cursor: state === "locked" || isGuest ? "default" : "pointer" }}
    >
      {/* Invisible larger hit area for stable hover */}
      <circle r={radius + 16} fill="transparent" />

      {/* Hover highlight ring — no CSS transform, stays in place */}
      {isHovered && (state !== "locked" || isGuest) && (
        <circle
          r={radius + 6}
          fill="none"
          stroke={state === "completed" ? "var(--anime-green)" : trackColors.stroke}
          strokeWidth="2"
          opacity="0.5"
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Soft pulsing ring for available nodes */}
      {state === "available" && (
        <circle
          r={radius + 10}
          fill="none"
          stroke={trackColors.stroke}
          strokeWidth="1.5"
          opacity="0.4"
          className="ring-pulse"
        />
      )}

      {/* Outer circle — main node shape */}
      <circle
        r={radius}
        fill={getFillColor()}
        stroke={getStrokeColor()}
        strokeWidth={state === "completed" ? 3 : 2}
        opacity={state === "locked" ? 0.5 : 1}
      />

      {/* Inner accent circle */}
      {state !== "locked" && (
        <circle
          r={radius - 9}
          fill="none"
          stroke={state === "completed" ? "var(--anime-green)" : rankColor.stroke}
          strokeWidth="1.5"
          opacity={0.5}
        />
      )}

      {/* Progress arc for in-progress */}
      {state === "in-progress" && progress > 0 && (
        <circle
          r={radius + 5}
          fill="none"
          stroke="var(--anime-accent)"
          strokeWidth="3"
          strokeDasharray={`${(progress / 100) * 2 * Math.PI * (radius + 5)} ${2 * Math.PI * (radius + 5)}`}
          strokeLinecap="round"
          transform="rotate(-90)"
          className="progress-arc"
        />
      )}

      {/* Center icon */}
      {state === "locked" && (
        <Lock x={-9} y={-9} width={18} height={18} stroke="var(--anime-700)" strokeWidth={1.5} />
      )}
      {state === "completed" && (
        <Check x={-11} y={-11} width={22} height={22} stroke="var(--anime-green)" strokeWidth={2.5} />
      )}
      {state === "available" && node.type === "mission" && (
        <Play x={-7} y={-7} width={14} height={14} fill={trackColors.fill} stroke="none" />
      )}
      {state === "in-progress" && (
        <circle r={5} fill="var(--anime-accent)" className="node-pulse" />
      )}
      {node.type === "field-ops" && industryConfig && state !== "locked" && state !== "completed" && (
        <text fontSize="18" textAnchor="middle" dominantBaseline="middle">
          {industryConfig.emoji}
        </text>
      )}

      {/* Rank badge (top-right) */}
      {rank && state !== "locked" && node.type === "mission" && (
        <g transform={`translate(${radius - 4}, ${-radius + 4})`}>
          <circle r="9" fill="var(--anime-950)" stroke={rankColor.stroke} strokeWidth="1.5" />
          <text
            fontSize="9"
            fontWeight="bold"
            fill={rankColor.fill}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {rank}
          </text>
        </g>
      )}

      {/* Label below node */}
      <text
        y={radius + 18}
        fill={getLabelColor()}
        fontSize="11"
        fontWeight="600"
        textAnchor="middle"
        style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.02em" }}
        opacity={state === "locked" ? 0.4 : 0.85}
      >
        {truncateTitle(title)}
      </text>

      {/* Track pill below label */}
      {node.track && state !== "locked" && (
        <g transform={`translate(0, ${radius + 32})`}>
          <rect
            x={-TRACKS[node.track].shortName.length * 3.5 - 6}
            y={-6}
            width={TRACKS[node.track].shortName.length * 7 + 12}
            height={14}
            rx="4"
            fill={node.track === "de" ? "rgba(0, 255, 255, 0.15)" : node.track === "ml" ? "rgba(153, 51, 255, 0.15)" : "rgba(255, 204, 0, 0.15)"}
            stroke={node.track === "de" ? "rgba(0, 255, 255, 0.4)" : node.track === "ml" ? "rgba(153, 51, 255, 0.4)" : "rgba(255, 204, 0, 0.4)"}
            strokeWidth="0.5"
          />
          <text
            fontSize="8"
            fontWeight="600"
            fill={trackColors.stroke}
            textAnchor="middle"
            dominantBaseline="middle"
            y="1"
          >
            {TRACKS[node.track].shortName}
          </text>
        </g>
      )}

      {/* Hover tooltip — 2x size */}
      {isHovered && (state !== "locked" || isGuest) && (
        <g transform={`translate(${radius + 20}, -100)`} style={{ pointerEvents: "none" }}>
          <rect
            x="0"
            y="0"
            width="400"
            height={node.industry ? 130 : 156}
            rx="16"
            fill="rgba(10, 10, 15, 0.96)"
            stroke={state === "completed" ? "var(--anime-green)" : "var(--anime-cyan)"}
            strokeWidth="2"
          />
          {/* Title */}
          <text x="24" y="40" fill="var(--anime-cyan)" fontSize="24" fontWeight="bold">
            {title.length > 30 ? title.slice(0, 30) + "…" : title}
          </text>
          {/* Track badge row */}
          {node.track && (
            <g>
              <rect
                x="24" y="56"
                width={TRACKS[node.track].shortName.length * 14 + 24}
                height="32" rx="6"
                fill={node.track === "de" ? "rgba(0, 255, 255, 0.2)" : node.track === "ml" ? "rgba(153, 51, 255, 0.2)" : "rgba(255, 204, 0, 0.2)"}
                stroke={trackColors.stroke}
                strokeWidth="1"
              />
              <text x="36" y="78" fill={trackColors.stroke} fontSize="18" fontWeight="600">
                {TRACKS[node.track].shortName}
              </text>
            </g>
          )}
          {node.industry && industryConfig && (
            <text x="24" y="84" fill="var(--anime-purple)" fontSize="20" fontWeight="500">
              {industryConfig.title.length > 30 ? industryConfig.title.slice(0, 30) + "…" : industryConfig.title}
            </text>
          )}
          {/* XP + time */}
          <text x="24" y={node.industry ? 112 : 130} fill="var(--anime-green)" fontSize="20" fontWeight="bold">
            +{xpReward} XP
          </text>
          <text x="180" y={node.industry ? 112 : 130} fill="var(--anime-400)" fontSize="20">
            ⏱ {estimatedMinutes}m
          </text>
        </g>
      )}
    </g>
  )
}
