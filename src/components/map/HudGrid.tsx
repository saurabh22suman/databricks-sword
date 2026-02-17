/**
 * HUD Grid Background
 *
 * Renders a tactical HUD-style grid background with:
 * - Fine and major grid lines
 * - Corner HUD elements (radar, data readouts)
 * - Coordinate labels
 * - Animated scanline effect
 */

import { MAP_SIZE } from "@/lib/missions/mapLayout"

/**
 * Props for the HudGrid component.
 */
type HudGridProps = {
  /** Whether to show the scanline animation */
  showScanline?: boolean
  /** Whether to show corner HUD elements */
  showHudElements?: boolean
}

/**
 * HUD Grid background for the mission map.
 * Server component - purely visual, no interactivity.
 */
export function HudGrid({
  showScanline = true,
  showHudElements = true,
}: HudGridProps): React.ReactElement {
  const gridSize = MAP_SIZE

  return (
    <g className="hud-grid-layer">
      {/* Fine grid lines (10px spacing) */}
      <defs>
        <pattern
          id="fine-grid"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="rgba(0, 255, 255, 0.03)"
            strokeWidth="0.5"
          />
        </pattern>
        <pattern
          id="major-grid"
          width="100"
          height="100"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 100 0 L 0 0 0 100"
            fill="none"
            stroke="rgba(0, 255, 255, 0.08)"
            strokeWidth="1"
          />
        </pattern>
        {/* Radar gradient */}
        <linearGradient id="radar-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(0, 255, 255, 0)" />
          <stop offset="100%" stopColor="rgba(0, 255, 255, 0.5)" />
        </linearGradient>
      </defs>

      {/* Grid background */}
      <rect width={gridSize} height={gridSize} fill="url(#fine-grid)" />
      <rect width={gridSize} height={gridSize} fill="url(#major-grid)" />

      {/* Coordinate labels along edges */}
      <g className="coordinate-labels" opacity="0.3">
        {/* Top edge labels */}
        {[0, 200, 400, 600, 800, 1000, 1200, 1400, 1600].map((x) => (
          <text
            key={`top-${x}`}
            x={x}
            y={20}
            fill="var(--anime-cyan)"
            fontSize="10"
            fontFamily="var(--font-mono)"
            textAnchor="middle"
          >
            {x}
          </text>
        ))}
        {/* Left edge labels */}
        {[200, 400, 600, 800, 1000, 1200, 1400].map((y) => (
          <text
            key={`left-${y}`}
            x={15}
            y={y}
            fill="var(--anime-cyan)"
            fontSize="10"
            fontFamily="var(--font-mono)"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {y}
          </text>
        ))}
      </g>

      {/* Corner HUD elements */}
      {showHudElements && (
        <>
          {/* Top-left: Radar circle */}
          <g transform="translate(60, 60)">
            <circle
              r="40"
              fill="none"
              stroke="rgba(0, 255, 255, 0.2)"
              strokeWidth="1"
            />
            <circle
              r="30"
              fill="none"
              stroke="rgba(0, 255, 255, 0.15)"
              strokeWidth="1"
            />
            <circle
              r="20"
              fill="none"
              stroke="rgba(0, 255, 255, 0.1)"
              strokeWidth="1"
            />
            <circle r="3" fill="var(--anime-cyan)" opacity="0.5" />
            {/* Radar sweep */}
            <path
              d="M 0 0 L 40 0 A 40 40 0 0 1 28 28 Z"
              fill="url(#radar-gradient)"
              className="radar-sweep"
            />
            <line
              x1="0"
              y1="-40"
              x2="0"
              y2="40"
              stroke="rgba(0, 255, 255, 0.1)"
              strokeWidth="0.5"
            />
            <line
              x1="-40"
              y1="0"
              x2="40"
              y2="0"
              stroke="rgba(0, 255, 255, 0.1)"
              strokeWidth="0.5"
            />
          </g>

          {/* Top-right: Mission indicator */}
          <g transform={`translate(${gridSize - 200}, 40)`}>
            <rect
              x="0"
              y="0"
              width="180"
              height="60"
              fill="none"
              stroke="rgba(0, 255, 255, 0.3)"
              strokeWidth="1"
            />
            <line
              x1="0"
              y1="20"
              x2="180"
              y2="20"
              stroke="rgba(0, 255, 255, 0.2)"
              strokeWidth="0.5"
            />
            <text
              x="10"
              y="14"
              fill="rgba(0, 255, 255, 0.5)"
              fontSize="8"
              fontFamily="var(--font-mono)"
            >
              TACTICAL OVERVIEW
            </text>
            <text
              x="10"
              y="45"
              fill="var(--anime-cyan)"
              fontSize="14"
              fontFamily="var(--font-mono)"
              fontWeight="bold"
            >
              MISSION MAP
            </text>
          </g>

          {/* Bottom-left: Data readout */}
          <g transform={`translate(20, ${gridSize - 100})`}>
            <rect
              x="0"
              y="0"
              width="150"
              height="80"
              fill="rgba(0, 0, 0, 0.3)"
              stroke="rgba(0, 255, 255, 0.2)"
              strokeWidth="1"
            />
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={`readout-${i}`}>
                <rect
                  x="10"
                  y={10 + i * 14}
                  width={60 + Math.random() * 60}
                  height="8"
                  fill="rgba(0, 255, 255, 0.1)"
                />
                <text
                  x="140"
                  y={18 + i * 14}
                  fill="rgba(0, 255, 255, 0.4)"
                  fontSize="7"
                  fontFamily="var(--font-mono)"
                  textAnchor="end"
                >
                  {Math.floor(Math.random() * 100)}%
                </text>
              </g>
            ))}
          </g>

          {/* Bottom-right: Compass/Logo */}
          <g transform={`translate(${gridSize - 80}, ${gridSize - 80})`}>
            <circle
              r="50"
              fill="none"
              stroke="rgba(0, 255, 255, 0.15)"
              strokeWidth="1"
            />
            <polygon
              points="0,-35 5,-20 -5,-20"
              fill="var(--anime-cyan)"
              opacity="0.6"
            />
            <polygon
              points="0,35 5,20 -5,20"
              fill="rgba(0, 255, 255, 0.3)"
            />
            <polygon
              points="-35,0 -20,5 -20,-5"
              fill="rgba(0, 255, 255, 0.3)"
            />
            <polygon
              points="35,0 20,5 20,-5"
              fill="rgba(0, 255, 255, 0.3)"
            />
            <text
              y="-42"
              fill="rgba(0, 255, 255, 0.5)"
              fontSize="8"
              fontFamily="var(--font-mono)"
              textAnchor="middle"
            >
              N
            </text>
          </g>
        </>
      )}

      {/* Ring labels */}
      <g className="ring-labels" opacity="0.4">
        <text
          x={gridSize / 2}
          y={gridSize / 2 - 60}
          fill="var(--anime-cyan)"
          fontSize="10"
          fontFamily="var(--font-mono)"
          textAnchor="middle"
          letterSpacing="2"
        >
          FOUNDATION
        </text>
        <text
          x={gridSize / 2 + 200}
          y={gridSize / 2 - 200}
          fill="var(--anime-cyan)"
          fontSize="9"
          fontFamily="var(--font-mono)"
          textAnchor="middle"
          letterSpacing="1"
        >
          SPECIALIZATION
        </text>
        <text
          x={gridSize / 2}
          y={gridSize / 2 - 380}
          fill="var(--anime-cyan)"
          fontSize="9"
          fontFamily="var(--font-mono)"
          textAnchor="middle"
          letterSpacing="1"
        >
          MASTERY
        </text>
        <text
          x={gridSize / 2}
          y={100}
          fill="var(--anime-purple)"
          fontSize="10"
          fontFamily="var(--font-mono)"
          textAnchor="middle"
          letterSpacing="2"
        >
          FIELD OPERATIONS
        </text>
      </g>

      {/* Scanline effect */}
      {showScanline && (
        <rect className="hud-scanline" x="0" y="0" width={gridSize} height="2" />
      )}
    </g>
  )
}
