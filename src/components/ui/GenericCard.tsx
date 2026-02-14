import { cn } from "@/lib/utils"

type GenericCardProps = {
  children: React.ReactNode
  className?: string
} & React.HTMLAttributes<HTMLDivElement>

/**
 * Generic card container for use in the review page and other places
 * where we need a simple card wrapper instead of the structured Card component
 */
export function GenericCard({
  children,
  className,
  ...props
}: GenericCardProps): React.ReactElement {
  return (
    <div
      className={cn(
        "cut-corner border border-anime-700 bg-anime-900 p-4",
        "transition-all duration-300",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}