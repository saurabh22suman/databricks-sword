"use client"

/**
 * MissionMap Component — Pipeline Layout
 *
 * Renders the full interactive pipeline-style mission map inspired by
 * DLT architecture diagrams. Missions flow left-to-right through
 * 5 zones (Foundation → Core → Specialization → Mastery → Capstone)
 * with Field Operations in a row below.
 *
 * Features: pan/zoom, track filtering, progress stats, minimap.
 */

import type { IndustryConfig } from "@/lib/field-ops/types"
import {
    CONTENT_BOUNDS,
    MAP_HEIGHT,
    MAP_WIDTH,
    type MapNode as MapNodeType,
    getAllMapNodes,
    getMapEdges,
    getMissionPrerequisites,
} from "@/lib/missions/mapLayout"
import { TRACKS, type Track } from "@/lib/missions/tracks"
import type { Mission, MissionRank } from "@/lib/missions/types"
import { SANDBOX_KEY, initializeSandbox, loadSandbox } from "@/lib/sandbox"
import type { SandboxData } from "@/lib/sandbox/types"
import { cn } from "@/lib/utils"
import {
    Filter,
    HelpCircle,
    Map as MapIcon,
    Maximize2,
    MousePointer,
    Move,
    Search,
    X,
    Zap,
    ZoomIn,
    ZoomOut,
} from "lucide-react"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { CircuitPaths } from "./CircuitPath"
import { HudGrid } from "./HudGrid"
import { MapNode, type NodeState } from "./MapNode"

/**
 * Props for the MissionMap component.
 */
type MissionMapProps = {
  missions: Mission[]
  fieldOps: IndustryConfig[]
  className?: string
  isGuest?: boolean
}

/**
 * Viewport state for pan/zoom.
 */
type Viewport = {
  x: number
  y: number
  scale: number
}

const MIN_SCALE = 0.15
const MAX_SCALE = 2.5
const ZOOM_STEP = 0.15

/**
 * Padding (in map units) around the auto-fit viewport so content
 * doesn't touch the edges of the visible area.
 */
const FIT_PADDING = 20

/**
 * Compute a viewport that fits the given content bounds (in viewBox units)
 * into the given container size, returning a translate+scale that
 * centers the content within the container.
 *
 * `bounds.x` / `bounds.y` are the content's top-left in the SVG viewBox,
 * used to offset the SVG's transform so the content (not the SVG's 0,0
 * origin) ends up centered.
 */
function computeFitViewport(
  containerWidth: number,
  containerHeight: number,
  bounds: { x: number; y: number; width: number; height: number }
): Viewport {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { x: 0, y: 0, scale: 1 }
  }
  const availW = Math.max(1, containerWidth - FIT_PADDING * 2)
  const availH = Math.max(1, containerHeight - FIT_PADDING * 2)
  const scale = Math.min(
    availW / bounds.width,
    availH / bounds.height,
    MAX_SCALE
  )
  // Center the scaled content area in the container, accounting for
  // the content's offset within the SVG viewBox.
  const scaledW = bounds.width * scale
  const scaledH = bounds.height * scale
  const x = (containerWidth - scaledW) / 2 - bounds.x * scale
  const y = (containerHeight - scaledH) / 2 - bounds.y * scale
  return { x, y, scale }
}

/**
 * Determine the visual state of a node.
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
  // Treat null sandbox as a fresh user with 0 XP (not fully locked)
  if (!sandbox) sandbox = initializeSandbox()

  // Check if completed
  if (nodeType === "mission" && completedMissions.has(nodeId)) return "completed"
  if (nodeType === "field-ops") {
    const industry = nodeId.replace("field-ops-", "")
    if (completedFieldOps.has(industry)) return "completed"
  }

  // Check if in progress
  if (
    nodeType === "mission" &&
    sandbox.missionProgress?.[nodeId] &&
    !sandbox.missionProgress[nodeId].completed
  ) {
    return "in-progress"
  }

  // Check XP requirement
  const currentXp = sandbox.userStats?.totalXp ?? 0
  if (currentXp < xpRequired) return "locked"

  // Check prerequisites
  if (
    prerequisites.length > 0 &&
    !prerequisites.every((id) => completedMissions.has(id))
  ) {
    return "locked"
  }

  return "available"
}

/**
 * Compute mission progress percentage.
 */
function getMissionProgressPercent(
  missionId: string,
  totalStages: number,
  sandbox: SandboxData | null
): number {
  if (!sandbox?.missionProgress) return 0
  const progress = sandbox.missionProgress[missionId]
  if (!progress) return 0

  const completedStages = Object.values(progress.stageProgress).filter(
    (s) => s.completed
  ).length

  return Math.round((completedStages / totalStages) * 100)
}

/**
 * Renders the full interactive pipeline mission map.
 */
export function MissionMap({
  missions,
  fieldOps,
  className,
  isGuest = false,
}: MissionMapProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState<Viewport | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Set<Track>>(
    new Set(["de", "ml", "bi"])
  )
  const [showMinimap, setShowMinimap] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [sandbox, setSandbox] = useState<SandboxData | null>(null)
  // Track if component has mounted to avoid SSR mismatch with containerRef
  const [hasMounted, setHasMounted] = useState(false)
  // Search query for filtering nodes by name
  const [searchQuery, setSearchQuery] = useState("")

  // Set mounted state after hydration to ensure containerRef is available
  useEffect(() => {
    setHasMounted(true)
  }, [])

  // Auto-fit viewport on mount and on window resize, so the entire map is
  // visible without requiring the user to zoom out manually.
  useLayoutEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const apply = () => {
      const rect = el.getBoundingClientRect()
      setViewport(computeFitViewport(rect.width, rect.height, CONTENT_BOUNDS))
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const refreshSandbox = useCallback(() => {
    setSandbox(loadSandbox() ?? initializeSandbox())
  }, [])

  // Load sandbox data on mount and refresh when tab regains focus or sandbox storage changes
  useEffect(() => {
    refreshSandbox()

    const handleFocus = () => {
      refreshSandbox()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshSandbox()
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === SANDBOX_KEY) {
        refreshSandbox()
      }
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("storage", handleStorage)

    return () => {
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("storage", handleStorage)
    }
  }, [refreshSandbox])

  // Computed state
  const completedMissions = useMemo(() => {
    const set = new Set<string>()
    if (!sandbox?.missionProgress) return set
    Object.entries(sandbox.missionProgress).forEach(([id, progress]) => {
      if (progress.completed) set.add(id)
    })
    return set
  }, [sandbox])

  const completedFieldOps = useMemo(
    () => new Set<string>(sandbox?.completedFieldOps || []),
    [sandbox]
  )

  const missionLookup = useMemo(() => {
    const map = new Map<string, Mission>()
    missions.forEach((m) => map.set(m.id, m))
    return map
  }, [missions])

  const fieldOpsLookup = useMemo(() => {
    const map = new Map<string, IndustryConfig>()
    fieldOps.forEach((f) => map.set(f.industry, f))
    return map
  }, [fieldOps])

  const mapNodes = useMemo(() => getAllMapNodes(), [])

  const nodesMap = useMemo(() => {
    const map = new Map<string, MapNodeType>()
    mapNodes.forEach((node) => map.set(node.id, node))
    return map
  }, [mapNodes])

  // Find the in-progress mission (has stages completed but not fully done)
  const currentMissionId = useMemo(() => {
    if (!sandbox?.missionProgress) return undefined
    for (const [id, progress] of Object.entries(sandbox.missionProgress)) {
      if (!progress.completed) {
        const completedStages = Object.values(progress.stageProgress).filter(
          (s) => s.completed,
        ).length
        if (completedStages > 0) return id
      }
    }
    return undefined
  }, [sandbox])

  // Find the first unlocked-but-not-completed mission as the recommended next step
  const recommendedMissionId = useMemo(() => {
    const sorted = [...missions].sort((a, b) => a.xpRequired - b.xpRequired)
    for (const mission of sorted) {
      if (completedMissions.has(mission.id)) continue
      const prereqs = getMissionPrerequisites(mission.id, missionLookup)
      const xpOk = (sandbox?.userStats?.totalXp ?? 0) >= mission.xpRequired
      const prereqsOk = prereqs.every((id) => completedMissions.has(id))
      if (xpOk && prereqsOk) return mission.id
    }
    return undefined
  }, [missions, sandbox, completedMissions, missionLookup])

  const edges = useMemo(() => getMapEdges(missionLookup), [missionLookup])

  // Filter nodes by active tracks and search query — locked nodes are always
  // shown (dimmed) so the user can see the path ahead, but search hides
  // non-matching nodes entirely (the user is explicitly looking for something).
  const filteredNodes = useMemo(
    () =>
      mapNodes.filter((node) => {
        // Resolve a display title for search comparison
        const nodeTitle =
          node.type === "mission"
            ? (missionLookup.get(node.id)?.title ?? node.id)
            : (fieldOpsLookup.get(node.industry ?? "")?.title ?? node.industry ?? "")

        // Search filter — when active, only matching nodes are shown
        const normalizedQuery = searchQuery.trim().toLowerCase()
        if (normalizedQuery.length > 0) {
          return nodeTitle.toLowerCase().includes(normalizedQuery)
        }

        // Track filter — locked nodes stay visible (dimmed by state)
        if (node.type === "field-ops") return true
        if (!node.track) return true
        const mission = missionLookup.get(node.id)
        const xpReq = mission?.xpRequired || 0
        const prereqs = getMissionPrerequisites(node.id, missionLookup)
        const currentXp = sandbox?.userStats?.totalXp ?? 0
        const isLocked =
          currentXp < xpReq ||
          (prereqs.length > 0 && !prereqs.every((id) => completedMissions.has(id)))
        if (isLocked) return true
        return activeFilters.has(node.track)
      }),
    [
      mapNodes,
      activeFilters,
      missionLookup,
      fieldOpsLookup,
      sandbox,
      completedMissions,
      searchQuery,
    ]
  )

  // Filter edges by active tracks
  const filteredEdges = useMemo(
    () =>
      edges.filter((edge) => {
        const fromNode = nodesMap.get(edge.from)
        const toNode = nodesMap.get(edge.to)
        if (!fromNode || !toNode) return false
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
    setViewport((v) =>
      v
        ? { ...v, scale: Math.min(v.scale + ZOOM_STEP, MAX_SCALE) }
        : v
    )
  }, [])

  const handleZoomOut = useCallback(() => {
    setViewport((v) =>
      v
        ? { ...v, scale: Math.max(v.scale - ZOOM_STEP, MIN_SCALE) }
        : v
    )
  }, [])

  const handleResetView = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setViewport(computeFitViewport(rect.width, rect.height, CONTENT_BOUNDS))
  }, [])

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      if (!viewport) return
      setIsDragging(true)
      setDragStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y })
    },
    [viewport]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return
      setViewport((v) =>
        v ? { ...v, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y } : v
      )
    },
    [isDragging, dragStart]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Track filter toggle
  const toggleFilter = useCallback((track: Track) => {
    setActiveFilters((filters) => {
      const newFilters = new Set(filters)
      if (newFilters.has(track)) newFilters.delete(track)
      else newFilters.add(track)
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
      {/* Main SVG — horizontal pipeline */}
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="w-full h-full"
        style={
          viewport
            ? {
                transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
                // Use top-left origin so the translate values from
                // computeFitViewport correctly position the SVG's top-left,
                // matching the standard SVG coordinate system.
                transformOrigin: "0 0",
              }
            : { visibility: "hidden" }
        }
      >
        {/* Background: zones, grid, chevrons */}
        <HudGrid />

        {/* Flow arrows (edges) */}
        <CircuitPaths
          edges={filteredEdges}
          nodes={nodesMap}
          completedMissions={completedMissions}
          currentMission={currentMissionId}
          recommendedMission={recommendedMissionId}
        />

        {/* Pipeline nodes */}
        {filteredNodes.map((node) => {
          const mission = missionLookup.get(node.id)
          const fieldOp = fieldOpsLookup.get(node.industry || "")

          const prerequisites =
            node.type === "mission"
              ? getMissionPrerequisites(node.id, missionLookup)
              : []

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
            node.type === "mission"
              ? (mission?.rank as MissionRank)
              : undefined

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
              ? getMissionProgressPercent(
                  node.id,
                  mission.stages.length,
                  sandbox
                )
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
              isGuest={isGuest}
              isRecommended={node.id === recommendedMissionId}
            />
          )
        })}
      </svg>

      {/* Top bar — title, search, fit-to-view */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        <div className="bg-anime-900/90 border border-anime-700 rounded-lg px-4 py-2 backdrop-blur-sm">
          <h1 className="text-sm font-bold text-anime-100 tracking-wide">
            MISSION MAP
          </h1>
          <p className="text-[10px] text-anime-500 font-mono">
            22 missions · 9 field ops · drag to pan
          </p>
        </div>
      </div>

      {/* Search bar — top center, below title */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-anime-500 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search missions or industries..."
            aria-label="Search missions and industries"
            className="bg-anime-900/90 border border-anime-700 rounded-lg pl-9 pr-9 py-2 text-sm text-anime-100 placeholder-anime-500 focus:outline-none focus:border-anime-cyan/50 focus:ring-1 focus:ring-anime-cyan/30 w-72 backdrop-blur-sm"
          />
          {searchQuery.length > 0 && (
            <button
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-anime-500 hover:text-anime-cyan transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Control panel — top right (zoom + minimap + help) */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <div className="flex flex-col bg-anime-900/90 border border-anime-700 rounded-lg overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-anime-800 transition-colors text-anime-300 hover:text-anime-cyan"
            title="Zoom In"
            aria-label="Zoom in"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-anime-800 transition-colors text-anime-300 hover:text-anime-cyan border-t border-anime-700"
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={handleResetView}
            className="p-2 hover:bg-anime-800 transition-colors text-anime-300 hover:text-anime-cyan border-t border-anime-700"
            title="Fit to view"
            aria-label="Fit map to view"
          >
            <Maximize2 size={18} />
          </button>
        </div>

        <button
          onClick={() => setShowMinimap(!showMinimap)}
          className={cn(
            "p-2 bg-anime-900/90 border border-anime-700 rounded-lg transition-colors",
            showMinimap
              ? "text-anime-cyan border-anime-cyan/50"
              : "text-anime-300 hover:text-anime-cyan"
          )}
          title="Toggle Minimap"
          aria-label="Toggle minimap"
          aria-pressed={showMinimap}
        >
          <MapIcon size={18} />
        </button>

        <button
          onClick={() => setShowHelp(!showHelp)}
          className={cn(
            "p-2 bg-anime-900/90 border border-anime-700 rounded-lg transition-colors",
            showHelp
              ? "text-anime-purple border-anime-purple/50"
              : "text-anime-300 hover:text-anime-purple"
          )}
          title="Map Controls Help"
          aria-label="Toggle map controls help"
          aria-pressed={showHelp}
        >
          <HelpCircle size={18} />
        </button>
      </div>

      {/* Track filters + legend — top left */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-anime-900/90 border border-anime-700 rounded-lg p-3 backdrop-blur-sm">
          <div className="flex items-center gap-1 mb-2 text-anime-500 text-xs uppercase tracking-wider">
            <Filter size={12} />
            <span>Tracks</span>
          </div>
          <div className="flex gap-1.5">
            {(["de", "ml", "bi"] as Track[]).map((track) => {
              const trackInfo = TRACKS[track]
              const isActive = activeFilters.has(track)
              const colorClass =
                track === "de"
                  ? "border-anime-cyan/50 bg-anime-cyan/10 text-anime-cyan"
                  : track === "ml"
                    ? "border-anime-purple/50 bg-anime-purple/10 text-anime-purple"
                    : "border-anime-yellow/50 bg-anime-yellow/10 text-anime-yellow"
              const dotClass =
                track === "de"
                  ? "bg-anime-cyan"
                  : track === "ml"
                    ? "bg-anime-purple"
                    : "bg-anime-yellow"
              return (
                <button
                  key={track}
                  onClick={() => toggleFilter(track)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all border",
                    isActive
                      ? colorClass
                      : "bg-anime-800/50 text-anime-500 hover:bg-anime-800 border-transparent"
                  )}
                  aria-label={`Toggle ${trackInfo.name} track filter`}
                  aria-pressed={isActive}
                  title={trackInfo.name}
                >
                  <span className={cn("w-2 h-2 rounded-full", dotClass)} />
                  <span>{trackInfo.shortName}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Stats panel — bottom left */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-anime-900/90 border border-anime-700 rounded-lg p-3 text-xs backdrop-blur-sm">
          <div className="text-anime-500 mb-2 uppercase tracking-wider">
            Progress
          </div>
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

      {/* Empty state for no search results */}
      {searchQuery.trim().length > 0 && filteredNodes.length === 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="bg-anime-900/95 border border-anime-700 rounded-lg p-6 text-center max-w-sm pointer-events-auto">
            <Search size={32} className="mx-auto mb-3 text-anime-500" />
            <p className="text-anime-100 font-medium mb-1">
              No matches for &ldquo;{searchQuery}&rdquo;
            </p>
            <p className="text-anime-500 text-sm mb-4">
              Try a different keyword, or clear the search to see all nodes.
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="px-4 py-1.5 bg-anime-cyan/20 text-anime-cyan border border-anime-cyan/50 rounded text-sm hover:bg-anime-cyan/30 transition-colors"
            >
              Clear search
            </button>
          </div>
        </div>
      )}

      {/* Minimap — bottom right */}
      {showMinimap && (
        <div className="minimap absolute bottom-4 right-4 w-56 h-28 rounded-lg overflow-hidden z-10">
          <svg
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            className="w-full h-full"
          >
            {filteredNodes.map((node) => {
              const isCompleted = completedMissions.has(node.id)
              return (
                <circle
                  key={node.id}
                  cx={node.x}
                  cy={node.y}
                  r={node.type === "field-ops" ? 14 : 12}
                  fill={
                    isCompleted
                      ? "var(--anime-green)"
                      : node.track === "ml"
                        ? "var(--anime-purple)"
                        : node.track === "bi"
                          ? "var(--anime-yellow)"
                          : "var(--anime-cyan)"
                  }
                  opacity={isCompleted ? 1 : 0.4}
                />
              )
            })}
            {hasMounted && containerRef.current && viewport && (
              <rect
                className="minimap-viewport"
                x={
                  MAP_WIDTH / 2 -
                  containerRef.current.clientWidth / 2 / viewport.scale -
                  viewport.x / viewport.scale
                }
                y={
                  MAP_HEIGHT / 2 -
                  containerRef.current.clientHeight / 2 / viewport.scale -
                  viewport.y / viewport.scale
                }
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
                Pipeline Map Guide
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
                  <div className="font-medium text-anime-100">
                    Pan &amp; Navigate
                  </div>
                  <div className="text-anime-400">
                    Click and drag to pan. Use the minimap for quick
                    navigation.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-anime-800 rounded-lg">
                  <ZoomIn size={16} className="text-anime-cyan" />
                </div>
                <div>
                  <div className="font-medium text-anime-100">Zoom Controls</div>
                  <div className="text-anime-400">
                    Use zoom buttons on the right for precise control and reset
                    the view when needed.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-anime-800 rounded-lg">
                  <MousePointer size={16} className="text-anime-cyan" />
                </div>
                <div>
                  <div className="font-medium text-anime-100">
                    Interact with Nodes
                  </div>
                  <div className="text-anime-400">
                    Hover or focus to see details. Click, Enter, or Space to
                    navigate unlocked nodes. Missions flow left → right.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-anime-800 rounded-lg">
                  <Filter size={16} className="text-anime-cyan" />
                </div>
                <div>
                  <div className="font-medium text-anime-100">Track Filters</div>
                  <div className="text-anime-400">
                    Toggle tracks (DE/ML/BI) to focus on specific learning paths.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-anime-800 rounded-lg">
                  <Search size={16} className="text-anime-cyan" />
                </div>
                <div>
                  <div className="font-medium text-anime-100">Search</div>
                  <div className="text-anime-400">
                    Type a mission or industry name to quickly locate it on the
                    map.
                  </div>
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
                    <span className="text-anime-accent">●</span> In Progress
                    &nbsp;
                    <span className="text-anime-500">●</span> Locked
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-anime-700 text-xs text-anime-500">
              💡 Tip: Complete prerequisites to unlock missions in the next zone.
              Follow the arrows to progress through the data pipeline.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
