"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

/**
 * Side quest question type.
 */
type SideQuestQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

/**
 * Side quest content type.
 */
type SideQuestContent = {
  questions: SideQuestQuestion[];
  passingScore: number;
};

/**
 * Side quest info.
 */
type SideQuest = {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  type: "quiz" | "diagram" | "code";
  content: SideQuestContent;
};

/**
 * Props for the SideQuestModal component.
 */
type SideQuestModalProps = {
  sideQuest: SideQuest;
  isOpen: boolean;
  onSkip: () => void;
  onComplete: (xpAwarded: number) => void;
  onClose: () => void;
};

/**
 * An overlay modal for OSS deep dive side quests.
 * Contains introductory info, skip/start buttons, and mini-stage content.
 */
export function SideQuestModal({
  sideQuest,
  isOpen,
  onSkip,
  onComplete,
}: SideQuestModalProps): React.ReactElement | null {
  const [started, setStarted] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  if (!isOpen) return null;

  const currentQuestion = sideQuest.content.questions[0];

  const handleStart = () => {
    setStarted(true);
  };

  const handleSubmit = () => {
    setShowResult(true);
    if (selectedAnswer === currentQuestion.correctAnswer) {
      // Correct answer - complete after short delay
      setTimeout(() => {
        onComplete(sideQuest.xpReward);
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        data-testid="side-quest-modal"
        className={cn(
          "max-w-md w-full mx-4 rounded-lg p-6",
          "bg-anime-900 border border-anime-purple shadow-neon-purple"
        )}
      >
        {!started ? (
          // Intro View
          <>
            <div className="text-center mb-6">
              <span className="text-xs font-medium text-anime-purple uppercase tracking-wide">
                Optional Side Quest
              </span>
              <h2 className="text-xl font-bold text-anime-100 mt-2">
                {sideQuest.title}
              </h2>
              <p className="text-sm text-anime-400 mt-2">
                {sideQuest.description}
              </p>
              <div className="mt-4 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-anime-yellow/20 text-anime-yellow text-sm">
                +{sideQuest.xpReward} XP
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onSkip}
                className={cn(
                  "flex-1 px-4 py-2 rounded-md",
                  "bg-anime-800 text-anime-400 border border-anime-700",
                  "hover:bg-anime-700 transition-colors"
                )}
              >
                Skip
              </button>
              <button
                onClick={handleStart}
                className={cn(
                  "flex-1 px-4 py-2 rounded-md font-medium",
                  "bg-anime-purple/20 text-anime-purple border border-anime-purple",
                  "hover:bg-anime-purple/30 hover:shadow-neon-purple transition-all"
                )}
              >
                Start Side Quest
              </button>
            </div>
          </>
        ) : (
          // Quiz View
          <>
            <h3 className="text-lg font-bold text-anime-100 mb-4">
              {currentQuestion.question}
            </h3>

            <div className="space-y-2 mb-6">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => !showResult && setSelectedAnswer(index)}
                  disabled={showResult}
                  className={cn(
                    "w-full px-4 py-3 rounded-md text-left transition-all",
                    "border",
                    selectedAnswer === index
                      ? "bg-anime-purple/20 border-anime-purple text-anime-100"
                      : "bg-anime-800 border-anime-700 text-anime-300 hover:border-anime-600",
                    showResult && index === currentQuestion.correctAnswer && "bg-anime-green/20 border-anime-green",
                    showResult && selectedAnswer === index && index !== currentQuestion.correctAnswer && "bg-anime-accent/20 border-anime-accent"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>

            {showResult && (
              <div className={cn(
                "p-3 rounded-md mb-4 text-sm",
                selectedAnswer === currentQuestion.correctAnswer
                  ? "bg-anime-green/20 text-anime-green border border-anime-green"
                  : "bg-anime-accent/20 text-anime-accent border border-anime-accent"
              )}>
                {selectedAnswer === currentQuestion.correctAnswer
                  ? `Correct! +${sideQuest.xpReward} XP`
                  : `Incorrect. ${currentQuestion.explanation}`}
              </div>
            )}

            {!showResult && (
              <button
                onClick={handleSubmit}
                disabled={selectedAnswer === null}
                className={cn(
                  "w-full px-4 py-2 rounded-md font-medium",
                  "bg-anime-cyan/20 text-anime-cyan border border-anime-cyan",
                  "hover:bg-anime-cyan/30 hover:shadow-neon-cyan transition-all",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                Submit Answer
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
