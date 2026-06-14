"use client"

import { useEffect, useRef } from "react"

export type DeployConfirmDialogProps = {
  isOpen: boolean
  industryName: string
  estimatedCost: string
  estimatedTime: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Modal dialog shown before a Field Ops deployment. The DeployButton
 * intercepts clicks and opens this dialog instead of calling the deploy
 * API directly. Confirm proceeds with deployment; Cancel closes the
 * dialog without any side effects.
 *
 * Keyboard: Escape cancels; Enter confirms (when no input is focused).
 * Focus is moved to the Confirm button on open.
 */
export function DeployConfirmDialog({
  isOpen,
  industryName,
  estimatedCost,
  estimatedTime,
  onConfirm,
  onCancel,
}: DeployConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    confirmRef.current?.focus()

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onCancel()
        return
      }
      if (e.key === "Enter" && document.activeElement?.tagName !== "BUTTON") {
        e.preventDefault()
        onConfirm()
      }
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [isOpen, onCancel, onConfirm])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-anime-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deploy-confirm-title"
    >
      <div className="cut-corner border-2 border-anime-accent bg-anime-900 p-6 max-w-md w-full mx-4">
        <h2
          id="deploy-confirm-title"
          className="text-xl font-heading font-bold text-anime-accent mb-2"
        >
          Deploy {industryName}?
        </h2>
        <p className="text-anime-300 font-mono text-sm mb-4">
          This will deploy to your Databricks workspace. Run{" "}
          <code className="bg-anime-950 px-1 rounded">/cleanup</code> when done
          to avoid extra costs.
        </p>
        <dl className="grid grid-cols-2 gap-2 text-sm font-mono mb-6">
          <dt className="text-anime-500">Estimated cost</dt>
          <dd className="text-anime-100 text-right">{estimatedCost}</dd>
          <dt className="text-anime-500">Estimated time</dt>
          <dd className="text-anime-100 text-right">{estimatedTime}</dd>
        </dl>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-anime-500 text-anime-300 font-mono hover:bg-anime-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anime-500"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-anime-accent text-anime-950 font-mono font-bold hover:bg-anime-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anime-accent"
          >
            Confirm Deploy
          </button>
        </div>
      </div>
    </div>
  )
}
