import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import type { Flashcard, QualityRating } from "@/lib/srs"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"
import React from "react"

interface FlashcardViewerProps {
  /** Flashcard to display */
  flashcard: Flashcard
  /** Whether card is flipped to show answer */
  isFlipped: boolean
  /** Whether to show hint */
  showHint?: boolean
  /** Handler for quality rating */
  onRating: (cardId: string, quality: QualityRating) => void
  /** Handler for next card */
  onNext: () => void
  /** Handler for showing hint */
  onShowHint: (cardId: string) => void
}

export type { FlashcardViewerProps }

const QUALITY_LABELS = {
  0: { label: "Again", description: "Complete blackout", variant: "outline" as const },
  2: { label: "Hard", description: "Incorrect but familiar", variant: "secondary" as const },
  3: { label: "Good", description: "Correct with difficulty", variant: "ghost" as const },
  5: { label: "Easy", description: "Perfect response", variant: "success" as const }
}

/**
 * Flashcard viewer with flip animation and quality rating
 * Displays questions/answers with cyberpunk styling
 */
export function FlashcardViewer({
  flashcard,
  isFlipped,
  showHint = false,
  onRating,
  onNext,
  onShowHint
}: FlashcardViewerProps): React.ReactElement {
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Card Container */}
      <motion.div
        className="relative h-96 perspective-1000"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        {/* Card Front/Back */}
        <AnimatePresence mode="wait">
          <motion.div
            key={isFlipped ? "answer" : "question"}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: -90, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "absolute inset-0 w-full h-full rounded-lg p-6",
              "cut-corner bg-anime-900 border border-anime-700",
              "shadow-neon-cyan backdrop-blur-sm",
              "flex flex-col justify-between"
            )}
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Card Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge variant={flashcard.difficulty === "B" ? "beginner" : flashcard.difficulty === "A" ? "intermediate" : "advanced"}>
                  {flashcard.difficulty}
                </Badge>
                <Badge variant="default" className="capitalize">{flashcard.type}</Badge>
              </div>
              <div className="text-xs text-anime-cyan font-mono">
                {flashcard.missionId.replace("mission_", "").toUpperCase()}
              </div>
            </div>

            {/* Card Content */}
            <div className="flex-1 flex flex-col justify-center">
              {!isFlipped ? (
                /* Question Side */
                <div className="text-center space-y-4">
                  <h2 className="text-xl font-heading text-anime-cyan leading-relaxed">
                    {flashcard.question}
                  </h2>
                  
                  {showHint && flashcard.hint && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-anime-800 rounded border border-anime-yellow text-anime-yellow"
                    >
                      <div className="text-xs font-mono mb-1">HINT</div>
                      <div className="text-sm">{flashcard.hint}</div>
                    </motion.div>
                  )}
                </div>
              ) : (
                /* Answer Side */
                <div className="space-y-4">
                  <div className="text-anime-cyan leading-relaxed">
                    {flashcard.answer}
                  </div>
                  
                  {flashcard.codeExample && (
                    <div className="bg-anime-950 rounded border border-anime-700 p-4">
                      <div className="text-xs font-mono text-anime-cyan mb-2">CODE EXAMPLE</div>
                      <pre className="text-sm font-mono text-anime-green overflow-x-auto">
                        <code>{flashcard.codeExample}</code>
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Card Actions */}
            <div className="mt-6 space-y-4">
              {!isFlipped ? (
                /* Question Actions */
                <div className="flex items-center justify-between">
                  {flashcard.hint && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onShowHint(flashcard.id)}
                    >
                      💡 Hint
                    </Button>
                  )}
                  <div className="flex-1" />
                  <Button
                    variant="primary"
                    onClick={() => onNext()}
                  >
                    Show Answer
                  </Button>
                </div>
              ) : (
                /* Answer Actions - Quality Rating */
                <div className="space-y-3">
                  <div className="text-center text-xs text-anime-cyan font-mono">
                    HOW WAS YOUR RECALL?
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(QUALITY_LABELS).map(([quality, config]) => (
                      <Button
                        key={quality}
                        variant={config.variant}
                        size="sm"
                        onClick={() => onRating(flashcard.id, parseInt(quality) as QualityRating)}
                        className="flex flex-col h-16"
                      >
                        <span className="text-sm font-bold">{config.label}</span>
                        <span className="text-xs opacity-75">{quality}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Card Footer - Tags */}
            <div className="flex flex-wrap gap-1 mt-4 pt-4 border-t border-anime-700">
              {flashcard.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="default"
                  className="text-xs"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}