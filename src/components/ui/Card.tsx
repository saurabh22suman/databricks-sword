import { cn } from "@/lib/utils"
import Link from "next/link"

type CardProps = {
  title: string
  description: string
  href?: string
  badge?: string
  icon?: React.ReactNode
  className?: string
}

/**
 * Reusable card component for displaying topics, use cases, and blog posts.
 * Renders as a link when `href` is provided.
 */
export function Card({
  title,
  description,
  href,
  badge,
  icon,
  className,
}: CardProps): React.ReactElement {
  const content = (
    <div
      className={cn(
        "group cut-corner border border-anime-700 bg-anime-900 p-6",
        "transition-all duration-300 hover:border-anime-cyan hover:shadow-neon-cyan",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-anime-800 text-anime-cyan">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-anime-100 group-hover:text-anime-cyan transition-colors duration-300">
              {title}
            </h3>
            {badge && (
              <span className="inline-flex items-center rounded-full bg-anime-accent/20 px-2 py-0.5 text-xs font-medium text-anime-accent border border-anime-accent/50">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-anime-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
