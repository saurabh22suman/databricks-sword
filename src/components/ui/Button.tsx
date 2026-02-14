import { cn } from "@/lib/utils"
import Link from "next/link"

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "success"
type ButtonSize = "sm" | "md" | "lg"

type ButtonProps = {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  href?: string
  className?: string
  disabled?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-anime-accent text-white hover:bg-anime-accent/90 focus-visible:ring-anime-accent shadow-neon-red transition-all duration-300",
  secondary:
    "border border-anime-700 bg-anime-900 text-anime-100 hover:bg-anime-800 hover:border-anime-cyan hover:text-anime-cyan transition-all duration-300",
  ghost: "text-anime-300 hover:bg-anime-900 hover:text-anime-cyan transition-all duration-300",
  outline:
    "border-2 border-anime-700 bg-transparent text-anime-cyan hover:border-anime-cyan hover:shadow-neon-cyan transition-all duration-300",
  success:
    "bg-anime-green text-anime-950 hover:bg-anime-green/90 shadow-neon-green hover:translate-y-[2px] transition-all duration-300",
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs rounded-md",
  md: "h-10 px-4 py-2 text-sm rounded-lg",
  lg: "h-12 px-6 text-base rounded-xl font-bold",
}

/**
 * Reusable button component with variant and size support.
 * Renders as an anchor tag when `href` is provided.
 */
export function Button({
  variant = "primary",
  size = "md",
  children,
  href,
  className,
  disabled,
  ...props
}: ButtonProps): React.ReactElement {
  const classes = cn(
    "inline-flex items-center justify-center font-medium transition-all",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    variantStyles[variant],
    sizeStyles[size],
    className,
  )

  if (href) {
    if (disabled) {
      return (
        <span className={cn(classes, "pointer-events-none opacity-50")} aria-disabled="true">
          {children}
        </span>
      )
    }
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} disabled={disabled} {...props}>
      {children}
    </button>
  )
}
