/**
 * Mission Map Layout Configuration
 *
 * Defines radial positions for all 20 missions and 8 Field Ops industries
 * in a circuit-board-style tactical map. Missions radiate outward from the
 * center, grouped by XP tier and track.
 */

import type { Industry } from "../field-ops/types"
import { MISSION_TRACK_MAP, type Track } from "./tracks"

/**
 * Node types on the map.
 */
export type MapNodeType = "mission" | "field-ops"

/**
 * A node on the mission map with position and metadata.
 */
export type MapNode = {
  id: string
  type: MapNodeType
  x: number
  y: number
  ring: number
  angle: number // Degrees from top (0° = 12 o'clock)
  track?: Track
  industry?: Industry
}

/**
 * An edge connecting two nodes (prerequisite relationship).
 */
export type MapEdge = {
  from: string
  to: string
  track: Track
}

/**
 * Ring radii in pixels from center.
 */
export const RING_RADII = {
  0: 0, // Center node
  1: 140, // First tier (200 XP)
  2: 280, // Second tier (500 XP)
  3: 420, // Third tier (1500 XP)
  4: 540, // Fourth tier (4000 XP)
  5: 700, // Field Ops (outer ring)
} as const

/**
 * Center coordinates of the map (SVG viewBox center).
 */
export const MAP_CENTER = { x: 800, y: 800 }

/**
 * Total map size (viewBox dimensions).
 */
export const MAP_SIZE = 1600

/**
 * Convert polar coordinates (ring, angle) to cartesian (x, y).
 * Angle is in degrees, 0° = top, clockwise.
 */
function polarToCartesian(ring: number, angleDegrees: number): { x: number; y: number } {
  const radius = RING_RADII[ring as keyof typeof RING_RADII] ?? 0
  // Convert to radians, offset by -90° so 0° is at top
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180
  return {
    x: MAP_CENTER.x + radius * Math.cos(angleRadians),
    y: MAP_CENTER.y + radius * Math.sin(angleRadians),
  }
}

/**
 * Mission node positions.
 * Organized by ring (XP tier) and distributed by track:
 * - DE track: 315° to 45° (top-right, wrapping around top)
 * - ML track: 90° to 180° (bottom-right)
 * - BI track: 180° to 270° (bottom-left)
 */
const MISSION_POSITIONS: Array<{ id: string; ring: number; angle: number }> = [
  // Ring 0 - Foundation (center)
  { id: "lakehouse-fundamentals", ring: 0, angle: 0 },

  // Ring 1 - First tier (200 XP required)
  { id: "pyspark-essentials", ring: 1, angle: 330 }, // Top-left of center
  { id: "sql-analytics-intro", ring: 1, angle: 30 }, // Top-right of center

  // Ring 2 - Second tier (500 XP required) - spread across tracks
  // DE Track (top arc: 270° to 90°)
  { id: "data-ingestion-pipeline", ring: 2, angle: 0 }, // Top center
  { id: "advanced-transformations", ring: 2, angle: 315 }, // Top-left
  { id: "delta-lake-deep-dive", ring: 2, angle: 45 }, // Top-right
  { id: "structured-streaming", ring: 2, angle: 30 }, // Near top-right
  { id: "unity-catalog-governance", ring: 2, angle: 60 }, // Right of top
  { id: "workflows-orchestration", ring: 2, angle: 345 }, // Near top-left
  { id: "data-quality-framework", ring: 2, angle: 75 }, // Right side

  // ML Track (bottom-right: 90° to 180°)
  { id: "ml-foundations", ring: 2, angle: 120 },
  { id: "mlflow-experiment-tracking", ring: 2, angle: 150 },

  // BI Track (bottom-left: 180° to 270°)
  { id: "bi-dashboards", ring: 2, angle: 210 },
  { id: "advanced-sql-analytics", ring: 2, angle: 240 },

  // Ring 3 - Third tier (1500 XP required)
  { id: "performance-tuning", ring: 3, angle: 330 }, // DE - top-left
  { id: "medallion-architecture", ring: 3, angle: 15 }, // DE - top-right
  { id: "production-pipelines", ring: 3, angle: 345 }, // DE - top center

  // Ring 4 - Capstones (4000 XP required)
  { id: "lakehouse-platform-design", ring: 4, angle: 0 }, // DE - top
  { id: "ml-pipelines-production", ring: 4, angle: 135 }, // ML - bottom-right
  { id: "semantic-layer-governance", ring: 4, angle: 225 }, // BI - bottom-left
]

/**
 * Field Ops industry positions (outer ring).
 * Distributed evenly around the circumference, starting from top.
 */
const FIELD_OPS_POSITIONS: Array<{ industry: Industry; angle: number }> = [
  { industry: "retail", angle: 22.5 },
  { industry: "gaming", angle: 67.5 },
  { industry: "healthcare", angle: 112.5 },
  { industry: "fintech", angle: 157.5 },
  { industry: "automotive", angle: 202.5 },
  { industry: "manufacturing", angle: 247.5 },
  { industry: "telecom", angle: 292.5 },
  { industry: "agritech", angle: 337.5 },
]

/**
 * Get all mission nodes with computed positions.
 */
export function getMissionNodes(): MapNode[] {
  return MISSION_POSITIONS.map((pos) => {
    const coords = polarToCartesian(pos.ring, pos.angle)
    return {
      id: pos.id,
      type: "mission" as const,
      x: coords.x,
      y: coords.y,
      ring: pos.ring,
      angle: pos.angle,
      track: MISSION_TRACK_MAP[pos.id] ?? "de",
    }
  })
}

/**
 * Get all Field Ops nodes with computed positions.
 */
export function getFieldOpsNodes(): MapNode[] {
  return FIELD_OPS_POSITIONS.map((pos) => {
    const coords = polarToCartesian(5, pos.angle)
    return {
      id: `field-ops-${pos.industry}`,
      type: "field-ops" as const,
      x: coords.x,
      y: coords.y,
      ring: 5,
      angle: pos.angle,
      industry: pos.industry,
    }
  })
}

/**
 * Get all nodes (missions + field ops) on the map.
 */
export function getAllMapNodes(): MapNode[] {
  return [...getMissionNodes(), ...getFieldOpsNodes()]
}

/**
 * Prerequisite edges for the mission DAG.
 * Each entry is [prerequisite, mission] meaning "prerequisite must be done before mission".
 */
const PREREQUISITE_EDGES: Array<[string, string]> = [
  // From lakehouse-fundamentals
  ["lakehouse-fundamentals", "pyspark-essentials"],
  ["lakehouse-fundamentals", "sql-analytics-intro"],

  // Ring 1 → Ring 2
  ["pyspark-essentials", "data-ingestion-pipeline"],
  ["sql-analytics-intro", "data-ingestion-pipeline"],
  ["pyspark-essentials", "advanced-transformations"],
  ["sql-analytics-intro", "advanced-transformations"],

  // Ring 2 internal connections
  ["data-ingestion-pipeline", "delta-lake-deep-dive"],
  ["lakehouse-fundamentals", "delta-lake-deep-dive"],
  ["data-ingestion-pipeline", "structured-streaming"],
  ["advanced-transformations", "structured-streaming"],
  ["sql-analytics-intro", "unity-catalog-governance"],
  ["delta-lake-deep-dive", "unity-catalog-governance"],
  ["data-ingestion-pipeline", "workflows-orchestration"],
  ["structured-streaming", "workflows-orchestration"],
  ["delta-lake-deep-dive", "data-quality-framework"],
  ["unity-catalog-governance", "data-quality-framework"],

  // ML Track
  ["pyspark-essentials", "ml-foundations"],
  ["advanced-transformations", "ml-foundations"],
  ["ml-foundations", "mlflow-experiment-tracking"],

  // BI Track
  ["sql-analytics-intro", "bi-dashboards"],
  ["advanced-transformations", "advanced-sql-analytics"],
  ["bi-dashboards", "advanced-sql-analytics"],

  // Ring 2/3 → Ring 3
  ["advanced-transformations", "performance-tuning"],
  ["delta-lake-deep-dive", "performance-tuning"],
  ["delta-lake-deep-dive", "medallion-architecture"],
  ["structured-streaming", "medallion-architecture"],
  ["workflows-orchestration", "medallion-architecture"],
  ["workflows-orchestration", "production-pipelines"],
  ["data-quality-framework", "production-pipelines"],
  ["medallion-architecture", "production-pipelines"],

  // Ring 3/4 → Ring 4 (Capstones)
  ["medallion-architecture", "lakehouse-platform-design"],
  ["performance-tuning", "lakehouse-platform-design"],
  ["production-pipelines", "lakehouse-platform-design"],
  ["mlflow-experiment-tracking", "ml-pipelines-production"],
  ["unity-catalog-governance", "ml-pipelines-production"],
  ["unity-catalog-governance", "semantic-layer-governance"],
  ["advanced-sql-analytics", "semantic-layer-governance"],
]

/**
 * Get all edges (prerequisite connections) for the map.
 */
export function getMapEdges(): MapEdge[] {
  return PREREQUISITE_EDGES.map(([from, to]) => ({
    from,
    to,
    track: MISSION_TRACK_MAP[to] ?? "de",
  }))
}

/**
 * Get edges filtered by track.
 */
export function getEdgesByTrack(track: Track): MapEdge[] {
  return getMapEdges().filter((edge) => edge.track === track)
}

/**
 * Get a node by its ID.
 */
export function getNodeById(id: string): MapNode | undefined {
  return getAllMapNodes().find((node) => node.id === id)
}

/**
 * Get prerequisite mission IDs for a given mission.
 */
export function getPrerequisites(missionId: string): string[] {
  return PREREQUISITE_EDGES.filter(([, to]) => to === missionId).map(([from]) => from)
}

/**
 * Get missions that depend on this mission (reverse lookup).
 */
export function getDependents(missionId: string): string[] {
  return PREREQUISITE_EDGES.filter(([from]) => from === missionId).map(([, to]) => to)
}

/**
 * Track colors for SVG styling.
 */
export const TRACK_COLORS = {
  de: { stroke: "#00ffff", fill: "#00ffff", glow: "0 0 10px #00ffff" },
  ml: { stroke: "#9933ff", fill: "#9933ff", glow: "0 0 10px #9933ff" },
  bi: { stroke: "#ffcc00", fill: "#ffcc00", glow: "0 0 10px #ffcc00" },
} as const

/**
 * Rank colors for node styling.
 */
export const RANK_COLORS = {
  B: { stroke: "#00ff66", fill: "#00ff66" },
  A: { stroke: "#ffcc00", fill: "#ffcc00" },
  S: { stroke: "#ff3366", fill: "#ff3366" },
} as const
