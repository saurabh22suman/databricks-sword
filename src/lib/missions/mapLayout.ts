/**
 * Mission Map Layout Configuration
 *
 * Defines horizontal pipeline positions for all 20 missions and 8 Field Ops
 * industries in a DLT-inspired data-flow diagram. Missions flow left-to-right
 * through 5 zones: Foundation → Core → Specialization → Mastery → Capstone.
 * Field Operations sit as a separate row below the main pipeline.
 */

import type { Industry } from "../field-ops/types"
import type { Mission } from "./types"
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
  angle: number // Kept for backward compat — 0 for horizontal layout
  track?: Track
  industry?: Industry
  zone?: ZoneId
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
 * Zone identifiers for pipeline sections.
 */
export type ZoneId = "foundation" | "core" | "specialization" | "mastery" | "capstone" | "field-ops"

/**
 * Zone definition for visual rendering.
 */
export type Zone = {
  id: ZoneId
  label: string
  subtitle: string
  x: number
  y: number
  width: number
  height: number
  color: string
  glowColor: string
  borderColor: string
}

/**
 * Map dimensions.
 */
export const MAP_WIDTH = 2800
export const MAP_HEIGHT = 1300

/**
 * Kept for backward compatibility — points to center of the map area.
 */
export const MAP_CENTER = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 }

/**
 * Total map size (legacy alias — use MAP_WIDTH/MAP_HEIGHT for the pipeline).
 */
export const MAP_SIZE = MAP_WIDTH

/**
 * Ring radii — kept for backward compatibility.
 * In the pipeline layout these map to zone indices (0-4 = mission zones, 5 = field-ops).
 */
export const RING_RADII = {
  0: 0,
  1: 140,
  2: 280,
  3: 420,
  4: 540,
  5: 700,
} as const

/**
 * Pipeline zone definitions.
 */
export const ZONES: Zone[] = [
  {
    id: "foundation",
    label: "FOUNDATION",
    subtitle: "Entry Point",
    x: 40,
    y: 60,
    width: 260,
    height: 720,
    color: "rgba(0, 255, 102, 0.06)",
    glowColor: "#00ff66",
    borderColor: "rgba(0, 255, 102, 0.25)",
  },
  {
    id: "core",
    label: "CORE",
    subtitle: "Essential Skills",
    x: 340,
    y: 60,
    width: 260,
    height: 720,
    color: "rgba(0, 255, 255, 0.06)",
    glowColor: "#00ffff",
    borderColor: "rgba(0, 255, 255, 0.25)",
  },
  {
    id: "specialization",
    label: "SPECIALIZATION",
    subtitle: "Track Mastery",
    x: 640,
    y: 60,
    width: 900,
    height: 720,
    color: "rgba(0, 150, 255, 0.05)",
    glowColor: "#0096ff",
    borderColor: "rgba(0, 150, 255, 0.2)",
  },
  {
    id: "mastery",
    label: "MASTERY",
    subtitle: "Advanced",
    x: 1580,
    y: 60,
    width: 300,
    height: 720,
    color: "rgba(255, 170, 0, 0.06)",
    glowColor: "#ffaa00",
    borderColor: "rgba(255, 170, 0, 0.25)",
  },
  {
    id: "capstone",
    label: "CAPSTONE",
    subtitle: "Final Projects",
    x: 1920,
    y: 60,
    width: 320,
    height: 720,
    color: "rgba(255, 51, 102, 0.06)",
    glowColor: "#ff3366",
    borderColor: "rgba(255, 51, 102, 0.25)",
  },
  {
    id: "field-ops",
    label: "FIELD OPERATIONS",
    subtitle: "Industry Deployments",
    x: 340,
    y: 860,
    width: 1900,
    height: 220,
    color: "rgba(153, 51, 255, 0.05)",
    glowColor: "#9933ff",
    borderColor: "rgba(153, 51, 255, 0.2)",
  },
]

/**
 * Mission node positions — horizontal pipeline layout.
 * Nodes are positioned within their zone columns.
 */
const MISSION_POSITIONS: Array<{
  id: string
  ring: number
  x: number
  y: number
  zone: ZoneId
}> = [
  // Foundation — single entry node
  { id: "lakehouse-fundamentals", ring: 0, x: 170, y: 420, zone: "foundation" },

  // Core — two foundational skills
  { id: "pyspark-essentials", ring: 1, x: 470, y: 310, zone: "core" },
  { id: "sql-analytics-intro", ring: 1, x: 470, y: 530, zone: "core" },

  // Specialization — DE track (upper rows)
  { id: "data-ingestion-pipeline", ring: 2, x: 780, y: 180, zone: "specialization" },
  { id: "advanced-transformations", ring: 2, x: 780, y: 380, zone: "specialization" },
  { id: "delta-lake-deep-dive", ring: 2, x: 980, y: 180, zone: "specialization" },
  { id: "structured-streaming", ring: 2, x: 980, y: 380, zone: "specialization" },
  { id: "unity-catalog-governance", ring: 2, x: 1180, y: 180, zone: "specialization" },
  { id: "workflows-orchestration", ring: 2, x: 1180, y: 380, zone: "specialization" },
  { id: "data-quality-framework", ring: 2, x: 1380, y: 280, zone: "specialization" },

  // Specialization — ML track (middle row)
  { id: "ml-foundations", ring: 2, x: 880, y: 570, zone: "specialization" },
  { id: "mlflow-experiment-tracking", ring: 2, x: 1130, y: 570, zone: "specialization" },

  // Specialization — BI track (lower row)
  { id: "bi-dashboards", ring: 2, x: 880, y: 700, zone: "specialization" },
  { id: "advanced-sql-analytics", ring: 2, x: 1130, y: 700, zone: "specialization" },

  // Mastery — advanced DE missions
  { id: "performance-tuning", ring: 3, x: 1730, y: 220, zone: "mastery" },
  { id: "medallion-architecture", ring: 3, x: 1730, y: 420, zone: "mastery" },
  { id: "production-pipelines", ring: 3, x: 1730, y: 620, zone: "mastery" },

  // Capstone — final projects per track
  { id: "lakehouse-platform-design", ring: 4, x: 2080, y: 220, zone: "capstone" },
  { id: "ml-pipelines-production", ring: 4, x: 2080, y: 470, zone: "capstone" },
  { id: "semantic-layer-governance", ring: 4, x: 2080, y: 680, zone: "capstone" },
]

/**
 * Field Ops industry positions — horizontal row below the pipeline.
 */
const FIELD_OPS_POSITIONS: Array<{ industry: Industry; x: number; y: number }> = [
  { industry: "retail", x: 520, y: 970 },
  { industry: "gaming", x: 740, y: 970 },
  { industry: "healthcare", x: 960, y: 970 },
  { industry: "fintech", x: 1180, y: 970 },
  { industry: "automotive", x: 1400, y: 970 },
  { industry: "manufacturing", x: 1620, y: 970 },
  { industry: "telecom", x: 1840, y: 970 },
  { industry: "agritech", x: 2060, y: 970 },
]

/**
 * Get all mission nodes with computed positions.
 */
export function getMissionNodes(): MapNode[] {
  return MISSION_POSITIONS.map((pos) => ({
    id: pos.id,
    type: "mission" as const,
    x: pos.x,
    y: pos.y,
    ring: pos.ring,
    angle: 0,
    track: MISSION_TRACK_MAP[pos.id] ?? "de",
    zone: pos.zone,
  }))
}

/**
 * Get all Field Ops nodes with computed positions.
 */
export function getFieldOpsNodes(): MapNode[] {
  return FIELD_OPS_POSITIONS.map((pos) => ({
    id: `field-ops-${pos.industry}`,
    type: "field-ops" as const,
    x: pos.x,
    y: pos.y,
    ring: 5,
    angle: 0,
    industry: pos.industry,
    zone: "field-ops" as ZoneId,
  }))
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

  // ML Track (ml-foundations is unlocked at 0 XP — no prerequisites)
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
 * Get prerequisite mission IDs from loaded mission data with static edge fallback.
 */
export function getMissionPrerequisites(
  missionId: string,
  missionLookup?: Map<string, Mission>
): string[] {
  const fromMissionData = missionLookup?.get(missionId)?.prerequisites
  if (Array.isArray(fromMissionData)) return fromMissionData
  return getPrerequisites(missionId)
}

/**
 * Get missions that depend on this mission (reverse lookup).
 */
export function getDependents(missionId: string): string[] {
  return PREREQUISITE_EDGES.filter(([from]) => from === missionId).map(([, to]) => to)
}

/**
 * Get a zone by its ID.
 */
export function getZoneById(zoneId: ZoneId): Zone | undefined {
  return ZONES.find((z) => z.id === zoneId)
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
