/**
 * Mission Track Definitions
 *
 * Groups the 20 missions into 3 learning tracks:
 * - Data Engineering (DE): Core lakehouse, Delta Lake, streaming, orchestration
 * - Machine Learning (ML): MLflow, Feature Store, model serving
 * - BI & Analytics (BI): SQL analytics, dashboards, semantic layer
 *
 * Some missions (like Unity Catalog) are shared prerequisites across tracks.
 */

/**
 * Learning track identifier.
 */
export type Track = "de" | "ml" | "bi"

/**
 * Track metadata for display purposes.
 */
export type TrackInfo = {
  id: Track
  name: string
  shortName: string
  description: string
  color: string
  borderColor: string
  bgColor: string
}

/**
 * Track display metadata.
 */
export const TRACKS: Record<Track, TrackInfo> = {
  de: {
    id: "de",
    name: "Data Engineering",
    shortName: "DE",
    description: "Master the Lakehouse: Delta Lake, streaming, orchestration, and production pipelines.",
    color: "text-anime-cyan",
    borderColor: "border-anime-cyan",
    bgColor: "bg-anime-cyan/10",
  },
  ml: {
    id: "ml",
    name: "Machine Learning",
    shortName: "ML",
    description: "MLflow experiments, Feature Store, model serving, and Champion/Challenger patterns.",
    color: "text-anime-purple",
    borderColor: "border-anime-purple",
    bgColor: "bg-anime-purple/10",
  },
  bi: {
    id: "bi",
    name: "BI & Analytics",
    shortName: "BI",
    description: "SQL warehouses, Lakeview dashboards, advanced analytics, and semantic governance.",
    color: "text-anime-yellow",
    borderColor: "border-anime-yellow",
    bgColor: "bg-anime-yellow/10",
  },
}

/**
 * Maps each mission ID to its primary track.
 * Missions may be prerequisites for other tracks but belong to one primary track.
 */
export const MISSION_TRACK_MAP: Record<string, Track> = {
  // DE Track (14 missions: 4B, 7A, 3S)
  "lakehouse-fundamentals": "de",
  "pyspark-essentials": "de",
  "sql-analytics-intro": "de",
  "data-ingestion-pipeline": "de",
  "advanced-transformations": "de",
  "delta-lake-deep-dive": "de",
  "structured-streaming": "de",
  "unity-catalog-governance": "de",
  "workflows-orchestration": "de",
  "data-quality-framework": "de",
  "medallion-architecture": "de",
  "performance-tuning": "de",
  "production-pipelines": "de",
  "lakehouse-platform-design": "de",

  // ML Track (3 missions: 1B, 1A, 1S)
  "ml-foundations": "ml",
  "mlflow-experiment-tracking": "ml",
  "ml-pipelines-production": "ml",

  // BI Track (3 missions: 2A, 1S)
  "bi-dashboards": "bi",
  "advanced-sql-analytics": "bi",
  "semantic-layer-governance": "bi",
}

/**
 * Returns the track for a given mission ID.
 * Falls back to "de" for unknown missions.
 *
 * @param missionId - Mission ID slug
 * @returns The track the mission belongs to
 */
export function getTrackForMission(missionId: string): Track {
  return MISSION_TRACK_MAP[missionId] ?? "de"
}

/**
 * Returns all track IDs.
 *
 * @returns Array of track identifiers
 */
export function getAllTracks(): Track[] {
  return ["de", "ml", "bi"]
}
