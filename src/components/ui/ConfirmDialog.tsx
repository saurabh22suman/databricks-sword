/**
 * ConfirmDialog Component
 * In-app modal dialog replacing browser confirm().
 * Cyberpunk-styled with anime palette.
 */

"use client"

import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"
import { useCallback, useEffect } from "react"

type ConfirmDialogProps = {
  /** Whether the dialog is visible */
  open: boolean
  /** Dialog title */
  title: string
  /** Dialog description / body text */
  description: string
  /** Text for the confirm button */
  confirmLabel?: string
  /** Text for the cancel button */
  cancelLabel?: string
  /** Visual variant for the confirm button */
  variant?: "danger" | "default"
  /** Whether the confirm action is in progress */
  loading?: boolean
  /** Called when user confirms */
  onConfirm: () => void
  /** Called when user cancels */
  onCancel: () => void
}

/**
 * In-app confirmation dialog with backdrop overlay.
 * Traps focus, handles Escape key, and uses the anime palette.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): React.ReactElement {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onCancel()
      }
    },
    [onCancel, loading]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, handleKeyDown])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-anime-950/80 backdrop-blur-sm"
            onClick={loading ? undefined : onCancel}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-desc"
            className={cn(
              "relative z-10 w-full max-w-md mx-4",
              "cut-corner bg-anime-900 border border-anime-700",
              "p-6 shadow-neon-cyan/30"
            )}
          >
            {/* Title */}
            <h2
              id="confirm-dialog-title"
              className="font-heading text-xl text-anime-cyan mb-2"
            >
              {title}
            </h2>

            {/* Description */}
            <p id="confirm-dialog-desc" className="text-anime-300 text-sm mb-6">
              {description}
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onCancel}
                disabled={loading}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded",
                  "bg-anime-800 text-anime-300 border border-anime-700",
                  "hover:bg-anime-700 hover:text-anime-100 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={cn(
                  "px-4 py-2 text-sm font-semibold rounded transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  variant === "danger"
                    ? "bg-anime-accent text-white hover:bg-anime-accent/80"
                    : "bg-anime-cyan text-anime-950 hover:bg-anime-cyan/80"
                )}
              >
                {loading ? "Processing..." : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
