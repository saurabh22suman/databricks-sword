/**
 * SyncProgressDialog Component
 *
 * Non-dismissable modal shown during disconnect flow.
 * Displays "Saving your Progress" with a pulsing animation
 * while sandbox data syncs to Turso DB before sign-out.
 */

"use client"

import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"
import { CloudUpload, Loader2 } from "lucide-react"

type SyncProgressDialogProps = {
  /** Whether the dialog is visible */
  open: boolean
}

/**
 * Non-dismissable progress dialog shown while syncing sandbox to server on disconnect.
 * Cannot be closed by user — auto-closes when sync completes and sign-out redirects.
 */
export function SyncProgressDialog({
  open,
}: SyncProgressDialogProps): React.ReactElement {
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
                <CloudUpload className="w-6 h-6 text-anime-cyan absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Title */}
            <h2
              id="sync-dialog-title"
              className="font-heading text-xl text-anime-cyan text-center mb-2"
            >
              Saving your Progress
            </h2>

            {/* Description */}
            <p
              id="sync-dialog-desc"
              className="text-anime-400 text-sm text-center font-mono"
            >
              Syncing data to server before disconnect...
            </p>

            {/* Animated progress bar */}
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
