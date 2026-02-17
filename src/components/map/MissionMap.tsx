"use client"

/**
 * MissionMap Component
 *
 * Main orchestrator for the interactive circuit-board mission map.
 * Provides pan/zoom, track filtering, minimap, and progress visualization.
 */

import type { IndustryConfig } from "@/lib/field-ops/types"
import {
    getAllMapNodes,
    getMapEdges,
    MAP_CENTER,
    MAP_SIZE,
    RING_RADII,
    type MapNode as MapNodeType,
} from "@/lib/missions/mapLayout"
import { TRACKS, type Track } from "@/lib/missions/tracks"
import type { Mission, MissionRank } from "@/lib/missions/types"
import { loadSandbox } from "@/lib/sandbox"
import type { SandboxData } from "@/lib/sandbox/types"
import { cn } from "@/lib/utils"
import { Filter, HelpCircle, Map as MapIcon, Maximize2, MousePointer, Move, X, Zap, ZoomIn, ZoomOut } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CircuitPaths } from "./CircuitPath"
import { HudGrid } from "./HudGrid"
import { MapNode, type NodeState } from "./MapNode"

/**
 * Props for MissionMap component.
 */
type MissionMapProps = {
  missions: Mission[]
  fieldOps: IndustryConfig[]
  className?: string
}

/**
 * Viewport state for pan/zoom.
 */
type Viewport = {
  x: number
  y: number
  scale: number
}

/**
 * Minimum and maximum zoom levels.
 */
const MIN_SCALE = 0.3
const MAX_SCALE = 2
const ZOOM_STEP = 0.2

/**
 * Determine node state based on sandbox progress data.
 */
function getNodeState(
  nodeId: string,
  nodeType: "mission" | "field-ops",
  sandbox: SandboxData | null,
  completedMissions: Set<string>,
  completedFieldOps: Set<string>,
  xpRequired: number,
  prerequisites: string[]
): NodeState {
  if (!sandbox) return "locked"

  const userXp = sandbox.userStats.totalXp

  // Check XP requirement
  if (userXp < xpRequired) return "locked"

  // Check prerequisites
  const hasAllPrereqs = prerequisites.every((prereq) => completedMissions.has(prereq))
  if (!hasAllPrereqs) return "locked"

  // Check current progress
  if (nodeType === "mission") {
    const progress = sandbox.missionProgress[nodeId]
    if (progress?.completed) return "completed"
    if (progress?.started) return "in-progress"
    return "available"
  }

  // Field ops - check completion from completedFieldOps array
  if (completedFieldOps.has(nodeId)) return "completed"
  return "available"
}

/**
 * Get mission progress percentage.
 */
function getMissionProgressPercent(
  missionId: string,
  totalStages: number,
  sandbox: SandboxData | null
): number {
  if (!sandbox) return 0
  const progress = sandbox.missionProgress[missionId]
  if (!progress) return 0

  const completedStages = Object.values(progress.stageProgress).filter(
    (s) => s.completed
  ).length

  return Math.round((completedStages / totalStages) * 100)
}

/**
 * Renders the full interactive mission map.
 */
export function MissionMap({
  missions,
  fieldOps,
  className,
}: MissionMapProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  // Start zoomed in and centered on mission cluster
  const [viewport, setViewport] = useState<Viewport>({
    x: -200,
    y: -100,
    scale: 1.2,
  })
  const [showHelp, setShowHelp] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Set<Track>>(
    new Set(["de", "ml", "bi"])
  )
  const [showMinimap, setShowMinimap] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [sandbox, setSandbox] = useState<SandboxData | null>(null)

  // Load sandbox data on mount
  useEffect(() => {
    setSandbox(loadSandbox())
  }, [])

  // Compute completed missions set
  const completedMissions = useMemo(() => {
    const set = new Set<string>()
    if (!sandbox?.missionProgress) return set
    Object.entries(sandbox.missionProgress).forEach(([id, progress]) => {
      if (progress.completed) set.add(id)
    })
    return set
  }, [sandbox])

  // Compute completed field ops set
  const completedFieldOps = useMemo(() => {
    return new Set<string>(sandbox?.completedFieldOps || [])
  }, [sandbox])

  // Build mission lookup map
  const missionLookup = useMemo(() => {
    const map = new Map<string, Mission>()
    missions.forEach((m) => map.set(m.id, m))
    return map
  }, [missions])

  // Build field ops lookup map
  const fieldOpsLookup = useMemo(() => {
    const map = new Map<string, IndustryConfig>()
    fieldOps.forEach((f) => map.set(f.industry, f))
    return map
  }, [fieldOps])

  // Get all map nodes
  const mapNodes = useMemo(() => getAllMapNodes(), [])

  // Create nodes Map for edge rendering
  const nodesMap = useMemo(() => {
    const map = new Map<string, MapNodeType>()
    mapNodes.forEach((node) => map.set(node.id, node))
    return map
  }, [mapNodes])

  // Get all edges
  const edges = useMemo(() => getMapEdges(), [])

  // Filter nodes by active tracks
  const filteredNodes = useMemo(
    () =>
      mapNodes.filter((node) => {
        if (node.type === "field-ops") return true
        if (!node.track) return true
        return activeFilters.has(node.track)
      }),
    [mapNodes, activeFilters]
  )

  // Filter edges by active tracks
  const filteredEdges = useMemo(
    () =>
      edges.filter((edge) => {
        const fromNode = nodesMap.get(edge.from)
        const toNode = nodesMap.get(edge.to)
        if (!fromNode || !toNode) return false
        
        // Show edge if either node's track is active
        const fromTrack = fromNode.track
        const toTrack = toNode.track
        
        if (fromTrack && !activeFilters.has(fromTrack)) return false
        if (toTrack && !activeFilters.has(toTrack)) return false
        
        return true
      }),
    [edges, nodesMap, activeFilters]
  )

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setViewport((v) => ({
      ...v,
      scale: Math.min(v.scale + ZOOM_STEP, MAX_SCALE),
    }))
  }, [])

  const handleZoomOut = useCallback(() => {
    setViewport((v) => ({
      ...v,
      scale: Math.max(v.scale - ZOOM_STEP, MIN_SCALE),
    }))
  }, [])

  const handleResetView = useCallback(() => {
    setViewport({ x: -200, y: -100, scale: 1.2 })
  }, [])

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return // Only left click
      setIsDragging(true)
      setDragStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y })
    },
    [viewport]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return
      setViewport((v) => ({
        ...v,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }))
    },
    [isDragging, dragStart]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Wheel zoom disabled - use buttons only

  // Track filter toggle
  const toggleFilter = useCallback((track: Track) => {
    setActiveFilters((filters) => {
      const newFilters = new Set(filters)
      if (newFilters.has(track)) {
        newFilters.delete(track)
      } else {
        newFilters.add(track)
      }
      return newFilters
    })
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden bg-anime-950",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Main SVG Map */}
      <svg
        viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`}
        className="w-full h-full"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          transformOrigin: "center center",
        }}
      >
        {/* Background HUD grid */}
        <HudGrid />

        {/* Concentric progress rings */}
        <g className="progress-rings" opacity="0.3">
          {[RING_RADII[1], RING_RADII[2], RING_RADII[3], RING_RADII[4]].map((radius, i) => (
            <circle
              key={radius}
              cx={MAP_CENTER.x}
              cy={MAP_CENTER.y}
              r={radius}
              fill="none"
              stroke="var(--anime-cyan)"
              strokeWidth="0.5"
              strokeDasharray="10 5"
              className={i % 2 === 0 ? "ring-pulse" : "ring-pulse-delayed"}
            />
          ))}
        </g>

        {/* Circuit paths (edges) */}
        <CircuitPaths
          edges={filteredEdges}
          nodes={nodesMap}
          completedMissions={completedMissions}
          currentMission={undefined}
        />

        {/* Map nodes */}
        {filteredNodes.map((node) => {
          const mission = missionLookup.get(node.id)
          const fieldOp = fieldOpsLookup.get(node.industry || "")

          // Determine prerequisites
          const prerequisites =
            node.type === "mission"
              ? mission?.prerequisites || []
              : [] // Field ops have XP requirements only

          // Determine XP required
          const xpRequired =
            node.type === "mission"
              ? mission?.xpRequired || 0
              : fieldOp?.xpRequired || 0

          const state = getNodeState(
            node.id,
            node.type,
            sandbox,
            completedMissions,
            completedFieldOps,
            xpRequired,
            prerequisites
          )

          const title =
            node.type === "mission"
              ? mission?.title || node.id
              : fieldOp?.title || node.industry || ""

          const rank =
            node.type === "mission" ? (mission?.rank as MissionRank) : undefined

          const xpReward =
            node.type === "mission"
              ? mission?.xpReward || 0
              : fieldOp?.xpReward || 0

          const estimatedMinutes =
            node.type === "mission"
              ? mission?.estimatedMinutes || 0
              : fieldOp?.estimatedMinutes || 0

          const progress =
            node.type === "mission" && mission
              ? getMissionProgressPercent(node.id, mission.stages.length, sandbox)
              : 0

          return (
            <MapNode
              key={node.id}
              node={node}
              state={state}
              title={title}
              rank={rank}
              xpRequired={xpRequired}
              xpReward={xpReward}
              estimatedMinutes={estimatedMinutes}
              progress={progress}
            />
          )
        })}
      </svg>

      {/* Control panel - top right */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        {/* Zoom controls */}
        <div className="flex flex-col bg-anime-900/90 border border-anime-700 rounded-lg overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-anime-800 transition-colors text-anime-300 hover:text-anime-cyan"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-anime-800 transition-colors text-anime-300 hover:text-anime-cyan border-t border-anime-700"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={handleResetView}
            className="p-2 hover:bg-anime-800 transition-colors text-anime-300 hover:text-anime-cyan border-t border-anime-700"
            title="Reset View"
          >
            <Maximize2 size={18} />
          </button>
        </div>

        {/* Minimap toggle */}
        <button
          onClick={() => setShowMinimap(!showMinimap)}
          className={cn(
            "p-2 bg-anime-900/90 border border-anime-700 rounded-lg transition-colors",
            showMinimap
              ? "text-anime-cyan border-anime-cyan/50"
              : "text-anime-300 hover:text-anime-cyan"
          )}
          title="Toggle Minimap"
        >
          <MapIcon size={18} />
        </button>

        {/* Help toggle */}
        <button
          onClick={() => setShowHelp(!showHelp)}
          className={cn(
            "p-2 bg-anime-900/90 border border-anime-700 rounded-lg transition-colors",
            showHelp
              ? "text-anime-purple border-anime-purple/50"
              : "text-anime-300 hover:text-anime-purple"
          )}
          title="Map Controls Help"
        >
          <HelpCircle size={18} />
        </button>
      </div>

      {/* Track filter panel - top left */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-anime-900/90 border border-anime-700 rounded-lg p-2">
          <div className="flex items-center gap-1 mb-2 text-anime-500 text-xs">
            <Filter size={12} />
            <span>Tracks</span>
          </div>
          <div className="flex flex-col gap-1">
            {(["de", "ml", "bi"] as Track[]).map((track) => {
              const trackInfo = TRACKS[track]
              const isActive = activeFilters.has(track)
              return (
                <button
                  key={track}
                  onClick={() => toggleFilter(track)}
                  className={cn(
                    "px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-2",
                    isActive
                      ? cn(
                          "border",
                          track === "de" && "bg-cyan-900/30 border-anime-cyan/50 text-anime-cyan",
                          track === "ml" && "bg-purple-900/30 border-anime-purple/50 text-anime-purple",
                          track === "bi" && "bg-yellow-900/30 border-anime-yellow/50 text-anime-yellow"
                        )
                      : "bg-anime-800/50 text-anime-500 hover:bg-anime-800"
                  )}
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      track === "de" && "bg-anime-cyan",
                      track === "ml" && "bg-anime-purple",
                      track === "bi" && "bg-anime-yellow"
                    )}
                  />
                  {trackInfo.shortName}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Stats panel - bottom left */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-anime-900/90 border border-anime-700 rounded-lg p-3 text-xs">
          <div className="text-anime-500 mb-2">Progress</div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-anime-cyan">
                {completedMissions.size}
              </div>
              <div className="text-anime-500">Missions</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-anime-green">
                {sandbox?.userStats?.totalXp?.toLocaleString() || 0}
              </div>
              <div className="text-anime-500">XP</div>
            </div>
          </div>
        </div>
      </div>

      {/* Minimap - bottom right */}
      {showMinimap && (
        <div className="minimap absolute bottom-4 right-4 w-40 h-40 rounded-lg overflow-hidden z-10">
          <svg viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`} className="w-full h-full">
            {/* Simplified nodes */}
            {filteredNodes.map((node) => {
              const isCompleted = completedMissions.has(node.id)
              return (
                <circle
                  key={node.id}
                  cx={node.x}
                  cy={node.y}
                  r={node.type === "field-ops" ? 20 : 15}
                  fill={
                    isCompleted
                      ? "var(--anime-green)"
                      : node.track === "ml"
                      ? "var(--anime-purple)"
                      : node.track === "bi"
                      ? "var(--anime-yellow)"
                      : "var(--anime-cyan)"
                  }
                  opacity={isCompleted ? 1 : 0.5}
                />
              )
            })}

            {/* Viewport indicator */}
            {containerRef.current && (
              <rect
                className="minimap-viewport"
                x={MAP_CENTER.x - (containerRef.current.clientWidth / 2 / viewport.scale) - viewport.x / viewport.scale}
                y={MAP_CENTER.y - (containerRef.current.clientHeight / 2 / viewport.scale) - viewport.y / viewport.scale}
                width={containerRef.current.clientWidth / viewport.scale}
                height={containerRef.current.clientHeight / viewport.scale}
              />
            )}
          </svg>
        </div>
      )}

      {/* Help Panel */}
      {showHelp && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-anime-950/80 backdrop-blur-sm">
          <div className="bg-anime-900 border border-anime-700 rounded-xl p-6 max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-anime-cyan flex items-center gap-2">
                <MapIcon size={20} />
                Mission Map Guide
              </h3>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 hover:bg-anime-800 rounded transition-colors text-anime-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-anime-800 rounded-lg">
                  <Move size={16} className="text-anime-cyan" />
                </div>
                <div>
                  <div className="font-medium text-anime-100">Pan &amp; Navigate</div>
                  <div className="text-anime-400">Click and drag to pan around the map. Use the minimap for quick navigation.</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 bg-anime-800 rounded-lg">
                  <ZoomIn size={16} className="text-anime-cyan" />
                </div>
                <div>
                  <div className="font-medium text-anime-100">Zoom Controls</div>
                  <div className="text-anime-400">Scroll wheel to zoom in/out. Use the zoom buttons on the right panel for precise control.</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 bg-anime-800 rounded-lg">
                  <MousePointer size={16} className="text-anime-cyan" />
                </div>
                <div>
                  <div className="font-medium text-anime-100">Interact with Nodes</div>
                  <div className="text-anime-400">Hover over any node to see mission details. Click to navigate to that mission.</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 bg-anime-800 rounded-lg">
                  <Filter size={16} className="text-anime-cyan" />
                </div>
                <div>
                  <div className="font-medium text-anime-100">Track Filters</div>
                  <div className="text-anime-400">Toggle tracks (DE/ML/BI) to focus on specific learning paths.</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 bg-anime-800 rounded-lg">
                  <Zap size={16} className="text-anime-purple" />
                </div>
                <div>
                  <div className="font-medium text-anime-100">Node States</div>
                  <div className="text-anime-400">
                    <span className="text-anime-green">●</span> Completed &nbsp;
                    <span className="text-anime-cyan">●</span> Available &nbsp;
                    <span className="text-anime-accent">●</span> In Progress &nbsp;
                    <span className="text-anime-500">●</span> Locked
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-anime-700 text-xs text-anime-500">
              💡 Tip: Complete prerequisites to unlock new missions. Hexagonal nodes are Field Operations requiring real Databricks deployment.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
