/**
 * SyncProgressDialog Component
 *
 * Non-dismissable modal shown during account sign-out flow.
 * Displays "Saving your Progress" with a pulsing animation
 * while sandbox data syncs to Turso DB before sign-out.
 *
 * Includes a 30-second timeout to prevent user deadlock.
 */

"use client"

import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"
import { CloudUpload, Loader2, AlertTriangle } from "lucide-react"
import { useEffect, useState } from "react"

type SyncProgressDialogProps = {
  /** Whether the dialog is visible */
  open: boolean
  /** Optional callback for timeout - called when operation takes too long */
  onTimeout?: () => void
  /** Timeout duration in milliseconds (default: 30000 = 30s) */
  timeoutMs?: number
}

/**
 * Non-dismissable progress dialog shown while syncing sandbox to server on disconnect.
 * Cannot be closed by user — auto-closes when sync completes and sign-out redirects.
 *
 * Includes timeout protection: after 30 seconds, shows a "Force Continue" option.
 */
export function SyncProgressDialog({
  open,
  onTimeout,
  timeoutMs = 30000,
}: SyncProgressDialogProps): React.ReactElement {
  const [timedOut, setTimedOut] = useState(false)

  // Reset timeout state when dialog opens
  useEffect(() => {
    if (open) {
      setTimedOut(false)

      // Set up timeout timer
      const timer = setTimeout(() => {
        setTimedOut(true)
        onTimeout?.()
      }, timeoutMs)

      return () => clearTimeout(timer)
    }
  }, [open, timeoutMs, onTimeout])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center"
          data-testid="sync-progress-dialog"
        >
          {/* Backdrop — no click handler, non-dismissable */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-anime-950/90 backdrop-blur-md"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sync-dialog-title"
            aria-describedby="sync-dialog-desc"
            className={cn(
              "relative z-10 w-full max-w-sm mx-4",
              "cut-corner bg-anime-900 border border-anime-cyan/30",
              "p-8 shadow-neon-cyan/40"
            )}
          >
            {/* Icon + Spinner */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                {timedOut ? (
                  <AlertTriangle className="w-12 h-12 text-anime-yellow" />
                ) : (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Loader2 className="w-12 h-12 text-anime-cyan/30" />
                  </motion.div>
                )}
                <CloudUpload className={cn(
                  "w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                  timedOut ? "text-anime-yellow" : "text-anime-cyan"
                )} />
              </div>
            </div>

            {/* Title */}
            <h2
              id="sync-dialog-title"
              className={cn(
                "font-heading text-xl text-center mb-2",
                timedOut ? "text-anime-yellow" : "text-anime-cyan"
              )}
            >
              {timedOut ? "Sync Taking Too Long" : "Saving your Progress"}
            </h2>

            {/* Description */}
            <p
              id="sync-dialog-desc"
              className="text-anime-400 text-sm text-center font-mono"
            >
              {timedOut
                ? "The server is taking longer than expected. Your progress is saved locally."
                : "Syncing data to server before signing out..."}
            </p>

            {/* Animated progress bar - hide when timed out */}
            {!timedOut && (
              <div className="mt-6 h-1 bg-anime-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-anime-cyan via-anime-purple to-anime-cyan rounded-full"
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{ width: "60%" }}
                />
              </div>
            )}

            {/* Timeout action button */}
            {timedOut && (
              <div className="mt-6">
                <button
                  onClick={onTimeout}
                  className={cn(
                    "w-full cut-corner py-3 font-bold uppercase tracking-wider",
                    "border border-anime-yellow bg-anime-yellow/10 text-anime-yellow",
                    "hover:bg-anime-yellow/20 transition-colors"
                  )}
                >
                  Force Continue
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
