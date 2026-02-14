import type { Rank } from "@/lib/gamification/types"
import { cn } from "@/lib/utils"

/**
 * Props for the RankBadge component.
 */
interface RankBadgeProps {
  /** The rank to display */
  rank: Rank
  /** Size of the badge in pixels (default: 48) */
  size?: number
  /** Whether to show the rank description (default: false) */
  showDescription?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * RankBadge component displays a rank badge using individual SVG images.
 * Each rank has its own SVG file in /public/badges/.
 */
export function RankBadge({ 
  rank, 
  size = 48, 
  showDescription = false,
  className 
}: RankBadgeProps): React.ReactElement {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Badge Image Container */}
      <div 
        className="relative overflow-hidden bg-anime-900 border border-anime-cyan/30 rank-badge-glow rank-badge-hover"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "50%"
        }}
      >
        <img
          src={rank.badge.src}
          alt={rank.badge.alt}
          className="w-full h-full object-contain"
          style={{
            width: `${size}px`,
            height: `${size}px`,
          }}
        />
      </div>

      {/* Rank Info */}
      <div className="flex flex-col">
        <span className="font-bold text-anime-cyan uppercase tracking-wider text-sm">
          {rank.title}
        </span>
        {showDescription && (
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            {rank.description}
          </p>
        )}
      </div>
    </div>
  )
}