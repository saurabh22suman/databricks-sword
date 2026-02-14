"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

interface StreakFreezeButtonProps {
  freezesAvailable: number
  onUseFreeze?: () => void
  confirmBeforeUse?: boolean
  isLoading?: boolean
  showFreezeEarned?: boolean
  showSuccessAnimation?: boolean
  className?: string
}

export function StreakFreezeButton({
  freezesAvailable,
  onUseFreeze,
  confirmBeforeUse = false,
  isLoading = false,
  showFreezeEarned = false,
  showSuccessAnimation = false,
  className
}: StreakFreezeButtonProps): React.ReactElement {
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const handleFreezeClick = (): void => {
    if (isLoading || freezesAvailable === 0) return

    if (confirmBeforeUse) {
      setShowConfirmation(true)
    } else {
      onUseFreeze?.()
    }
  }

  const handleConfirm = (): void => {
    setShowConfirmation(false)
    onUseFreeze?.()
  }

  const handleCancel = (): void => {
    setShowConfirmation(false)
  }

  const freezeText = freezesAvailable === 1 ? "1 freeze available" : `${freezesAvailable} freezes available`
  const buttonText = isLoading ? "Using..." : "Use Freeze"

  return (
    <div 
      className={cn(
        "relative bg-anime-900 border border-anime-700 rounded-lg p-4",
        { "animate-pulse": showSuccessAnimation },
        className
      )}
      data-testid="streak-freeze-button"
    >
      {/* Freeze Earned Notification */}
      {showFreezeEarned && (
        <div className="text-center mb-4 p-3 bg-anime-purple/20 border border-anime-purple rounded-lg">
          <div className="text-lg font-bold text-anime-purple mb-1">
            🎉 Freeze Earned!
          </div>
          <div className="text-sm text-anime-purple">
            Complete 7 days to earn another freeze
          </div>
        </div>
      )}

      {/* Freeze Count */}
      <div className="text-center mb-4">
        <div className="text-2xl mb-2">❄️</div>
        <div className="text-sm font-mono text-anime-cyan">
          {freezeText}
        </div>
      </div>

      {/* Freeze Button */}
      <div className="relative">
        <button
          onClick={handleFreezeClick}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          disabled={freezesAvailable === 0 || isLoading}
          className={cn(
            "w-full py-3 px-4 rounded-lg font-bold text-sm transition-all duration-200",
            "border-2 border-anime-purple bg-anime-purple/20 text-anime-purple",
            "hover:bg-anime-purple hover:text-anime-950",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-anime-purple/20 disabled:hover:text-anime-purple",
            "focus:outline-none focus:ring-2 focus:ring-anime-purple focus:ring-offset-2 focus:ring-offset-anime-950"
          )}
        >
          {buttonText}
        </button>

        {/* Tooltip */}
        {showTooltip && !isLoading && freezesAvailable > 0 && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-nowrap">
            <div className="bg-anime-950 border border-anime-700 rounded-lg px-3 py-2 text-xs text-anime-cyan">
              Preserve your streak for today without completing a mission or challenge
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-anime-700"></div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="absolute inset-0 bg-anime-950/80 backdrop-blur-sm rounded-lg flex items-center justify-center p-4">
          <div className="bg-anime-900 border border-anime-700 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-anime-cyan mb-2">
              Use Streak Freeze?
            </h3>
            <p className="text-sm text-anime-purple mb-4">
              This will preserve your streak for today. You cannot undo this action.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 py-2 px-4 rounded-lg text-sm font-bold border border-anime-700 text-anime-purple hover:bg-anime-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2 px-4 rounded-lg text-sm font-bold bg-anime-purple text-anime-950 hover:bg-anime-purple/80 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}