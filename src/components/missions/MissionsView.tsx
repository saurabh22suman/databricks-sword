"use client"

/**
 * MissionsView Component
 *
 * Wrapper component that toggles between Grid and Map views
 * of the missions list.
 */

import { MissionMap } from "@/components/map"
import type { IndustryConfig } from "@/lib/field-ops/types"
import type { Mission } from "@/lib/missions"
import { cn } from "@/lib/utils"
import { LayoutGrid, Map as MapIcon } from "lucide-react"
import { useState } from "react"
import { MissionGrid } from "./MissionGrid"

/**
 * View mode options.
 */
type ViewMode = "grid" | "map"

/**
 * Props for MissionsView component.
 */
type MissionsViewProps = {
  missions: Mission[]
  fieldOps: IndustryConfig[]
  userXp?: number
}

/**
 * Renders missions with toggle between grid and map views.
 */
export function MissionsView({
  missions,
  fieldOps,
  userXp = 0,
}: MissionsViewProps): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>("grid")

  return (
    <div className="relative">
      {/* View toggle buttons */}
      <div className="absolute top-0 right-0 z-20 flex gap-1 bg-anime-900/90 border border-anime-700 rounded-lg p-1">
        <button
          onClick={() => setViewMode("grid")}
          className={cn(
            "p-2 rounded transition-colors flex items-center gap-2 text-sm",
            viewMode === "grid"
              ? "bg-anime-800 text-anime-cyan border border-anime-cyan/30"
              : "text-anime-400 hover:text-anime-300 hover:bg-anime-800/50"
          )}
          title="Grid View"
        >
          <LayoutGrid size={18} />
          <span className="hidden sm:inline">Grid</span>
        </button>
        <button
          onClick={() => setViewMode("map")}
          className={cn(
            "p-2 rounded transition-colors flex items-center gap-2 text-sm",
            viewMode === "map"
              ? "bg-anime-800 text-anime-cyan border border-anime-cyan/30"
              : "text-anime-400 hover:text-anime-300 hover:bg-anime-800/50"
          )}
          title="Map View"
        >
          <MapIcon size={18} />
          <span className="hidden sm:inline">Map</span>
        </button>
      </div>

      {/* Grid View */}
      {viewMode === "grid" && (
        <MissionGrid missions={missions} userXp={userXp} />
      )}

      {/* Map View */}
      {viewMode === "map" && (
        <div className="h-[calc(100vh-16rem)] w-full rounded-lg overflow-hidden border border-anime-700">
          <MissionMap missions={missions} fieldOps={fieldOps} />
        </div>
      )}
    </div>
  )
}
