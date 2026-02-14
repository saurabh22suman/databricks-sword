import { cn } from "@/lib/utils"

type CalloutType = "info" | "warning" | "tip" | "important"

type CalloutProps = {
  type?: CalloutType
  title?: string
  children: React.ReactNode
}

const calloutStyles: Record<CalloutType, string> = {
  info: "border-anime-cyan/50 bg-anime-cyan/10 text-anime-cyan",
  warning:
    "border-anime-yellow/50 bg-anime-yellow/10 text-anime-yellow",
  tip: "border-anime-green/50 bg-anime-green/10 text-anime-green",
  important:
    "border-anime-accent/50 bg-anime-accent/10 text-anime-accent",
}

const calloutIcons: Record<CalloutType, string> = {
  info: "ℹ️",
  warning: "⚠️",
  tip: "💡",
  important: "🔥",
}

/**
 * A highlighted callout box for important notes, warnings, tips, and key information.
 * Used within MDX content to draw attention to specific information.
 */
export function Callout({
  type = "info",
  title,
  children,
}: CalloutProps): React.ReactElement {
  return (
    <div
      role="note"
      className={cn(
        "my-6 rounded-lg border-l-4 p-4",
        calloutStyles[type],
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-lg" aria-hidden="true">
          {calloutIcons[type]}
        </span>
        <div className="flex-1">
          {title && (
            <p className="mb-1 font-semibold">{title}</p>
          )}
          <div className="text-sm leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  )
}
