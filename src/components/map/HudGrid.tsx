/**
 * PipelineBackground Component
 *
 * Renders the background layer for the pipeline map:
 * - Subtle grid pattern
 * - Zone rectangles with colored borders and headers
 * - Chevron arrows between zones indicating data flow direction
 * - Ambient HUD scanline effect
 */

import { MAP_HEIGHT, MAP_WIDTH, ZONES, type Zone } from "@/lib/missions/mapLayout"

/**
 * Props for PipelineBackground component.
 */
type PipelineBackgroundProps = {
  /** Whether to show the scanline animation */
  showScanline?: boolean
}

/**
 * Renders a single zone background panel with header label.
 */
function ZonePanel({ zone }: { zone: Zone }): React.ReactElement {
  return (
    <g>
      {/* Zone background fill */}
      <rect
        x={zone.x}
        y={zone.y}
        width={zone.width}
        height={zone.height}
        rx="12"
        fill={zone.color}
        stroke={zone.borderColor}
        strokeWidth="1"
      />

      {/* Top header bar */}
      <rect
        x={zone.x}
        y={zone.y}
        width={zone.width}
        height="38"
        rx="12"
        fill={zone.color}
      />
      {/* Bottom corners of header need to be square */}
      <rect
        x={zone.x}
        y={zone.y + 26}
        width={zone.width}
        height="12"
        fill={zone.color}
      />
      {/* Header divider line */}
      <line
        x1={zone.x + 12}
        y1={zone.y + 38}
        x2={zone.x + zone.width - 12}
        y2={zone.y + 38}
        stroke={zone.borderColor}
        strokeWidth="0.5"
      />

      {/* Zone label */}
      <text
        x={zone.x + zone.width / 2}
        y={zone.y + 20}
        fill={zone.glowColor}
        fontSize="12"
        fontWeight="bold"
        textAnchor="middle"
        style={{ fontFamily: "var(--font-mono)", letterSpacing: "2px" }}
      >
        {zone.label}
      </text>

      {/* Subtitle */}
      <text
        x={zone.x + zone.width / 2}
        y={zone.y + 33}
        fill={zone.glowColor}
        fontSize="8"
        textAnchor="middle"
        opacity="0.5"
        style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.5px" }}
      >
        {zone.subtitle}
      </text>
    </g>
  )
}

/**
 * Renders a chevron arrow between two zones indicating flow direction.
 */
function FlowChevron({
  x,
  y,
  color,
}: {
  x: number
  y: number
  color: string
}): React.ReactElement {
  return (
    <g transform={`translate(${x}, ${y})`} opacity="0.35">
      {/* Triple chevron arrows */}
      <path d="M -8 -10 L 2 0 L -8 10" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M -2 -8 L 6 0 L -2 8" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 4 -6 L 10 0 L 4 6" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </g>
  )
}

/**
 * Pipeline background for the mission map.
 * Renders zones, grid, and ambient effects.
 */
export function HudGrid({
  showScanline = true,
}: PipelineBackgroundProps): React.ReactElement {
  // Compute inter-zone chevron positions
  const missionZones = ZONES.filter((z) => z.id !== "field-ops")

  return (
    <g className="pipeline-background-layer">
      {/* Fine grid pattern */}
      <defs>
        <pattern id="pipeline-grid-fine" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0, 255, 255, 0.02)" strokeWidth="0.5" />
        </pattern>
        <pattern id="pipeline-grid-major" width="200" height="200" patternUnits="userSpaceOnUse">
          <path d="M 200 0 L 0 0 0 200" fill="none" stroke="rgba(0, 255, 255, 0.04)" strokeWidth="0.5" />
        </pattern>
      </defs>

      {/* Grid background */}
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#pipeline-grid-fine)" />
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#pipeline-grid-major)" />

      {/* Zone panels */}
      {ZONES.map((zone) => (
        <ZonePanel key={zone.id} zone={zone} />
      ))}

      {/* Flow chevrons between mission zones */}
      {missionZones.slice(0, -1).map((zone, i) => {
        const nextZone = missionZones[i + 1]
        const chevronX = zone.x + zone.width + (nextZone.x - zone.x - zone.width) / 2
        const chevronY = zone.y + zone.height / 2
        // Blend the two zone colors
        const color = zone.glowColor
        return (
          <FlowChevron
            key={`chevron-${zone.id}`}
            x={chevronX}
            y={chevronY}
            color={color}
          />
        )
      })}

      {/* "Pipeline Flow" indicator at top-left */}
      <g transform="translate(50, 30)">
        <text
          fill="rgba(0, 255, 255, 0.3)"
          fontSize="9"
          fontWeight="600"
          style={{ fontFamily: "var(--font-mono)", letterSpacing: "3px" }}
        >
          DATA PIPELINE FLOW ▸
        </text>
      </g>

      {/* Track legend — top-right area */}
      <g transform={`translate(${MAP_WIDTH - 200}, 20)`}>
        <rect x="0" y="0" width="160" height="36" rx="6" fill="rgba(10, 10, 15, 0.5)" stroke="rgba(0, 255, 255, 0.15)" strokeWidth="0.5" />
        {/* DE */}
        <circle cx="18" cy="18" r="4" fill="#00ffff" />
        <text x="28" y="22" fill="#00ffff" fontSize="8" style={{ fontFamily: "var(--font-mono)" }}>DE</text>
        {/* ML */}
        <circle cx="65" cy="18" r="4" fill="#9933ff" />
        <text x="75" y="22" fill="#9933ff" fontSize="8" style={{ fontFamily: "var(--font-mono)" }}>ML</text>
        {/* BI */}
        <circle cx="112" cy="18" r="4" fill="#ffcc00" />
        <text x="122" y="22" fill="#ffcc00" fontSize="8" style={{ fontFamily: "var(--font-mono)" }}>BI</text>
      </g>

      {/* Scanline effect */}
      {showScanline && (
        <rect className="hud-scanline" x="0" y="0" width={MAP_WIDTH} height="2" />
      )}
    </g>
  )
}
