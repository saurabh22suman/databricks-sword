import { cn } from "@/lib/utils"

type BadgeVariant = "default" | "beginner" | "intermediate" | "advanced"

type BadgeProps = {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    "bg-anime-800 text-anime-300 border border-anime-700",
  beginner:
    "bg-anime-green/20 text-anime-green border border-anime-green/50",
  intermediate:
    "bg-anime-yellow/20 text-anime-yellow border border-anime-yellow/50",
  advanced:
    "bg-anime-accent/20 text-anime-accent border border-anime-accent/50",
}

/**
 * Badge component for displaying difficulty levels, tags, and status indicators.
 */
export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps): React.ReactElement {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
