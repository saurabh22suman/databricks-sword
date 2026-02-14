/**
 * @file MissionQuiz.tsx
 * @description Quiz stage component for mission knowledge assessment
 */

"use client";

import type { QuizConfig } from "@/lib/missions";
import React, { useMemo } from "react";

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Shuffled option with original index tracking
 */
type ShuffledOption = {
  text: string;
  originalIndex: number;
};

export interface MissionQuizProps {
  /**
   * Quiz configuration
   */
  config: QuizConfig;
  /**
   * Callback when quiz is completed
   */
  onComplete?: (result: {
    passed: boolean;
    score: number;
    totalQuestions: number;
    percentage: number;
  }) => void;
}

/**
 * MissionQuiz component
 *
 * Wrapper around the Quiz component specifically for mission stages.
 * Adapts mission QuizConfig to the Quiz component and handles completion callbacks.
 */
export function MissionQuiz({
  config,
  onComplete,
}: MissionQuizProps): React.ReactElement {
  // The Quiz component already has all the logic we need
  // We just need to adapt the mission types to the Quiz component types
  // and handle the onComplete callback
  
  // Since the Quiz component doesn't currently have an onComplete callback,
  // we need to wrap it and detect when the quiz is complete
  // For now, we'll just pass through the config and add completion logic later
  
  const [isComplete, setIsComplete] = React.useState(false);
  const [finalScore, setFinalScore] = React.useState(0);

  // Map mission QuizConfig to Quiz component props
  // The types are already compatible since they use the same QuizQuestion type
  const quizQuestions = config.questions;

  React.useEffect(() => {
    // This effect will be triggered when the quiz component completes
    // We need a way to detect completion from the Quiz component
    // For now, this is a placeholder
    if (isComplete && onComplete) {
      const percentage = Math.round((finalScore / quizQuestions.length) * 100);
      onComplete({
        passed: percentage >= config.passingScore,
        score: finalScore,
        totalQuestions: quizQuestions.length,
        percentage,
      });
    }
  }, [isComplete, finalScore, quizQuestions.length, config.passingScore, onComplete]);

  // Since we need to intercept the quiz completion to call onComplete,
  // we need to either:
  // 1. Modify the Quiz component to accept an onComplete callback
  // 2. Duplicate the Quiz component logic here
  // For now, let's duplicate the core logic but adapt it for missions

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [selectedAnswer, setSelectedAnswer] = React.useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [score, setScore] = React.useState(0);
  
  // Use ref to track score synchronously (state updates are async and can be stale)
  const scoreRef = React.useRef(0);

  const currentQuestion = quizQuestions[currentIndex];

  // Resolve correct answer index - handles both string and number correctAnswer
  const resolveCorrectIndex = (question: typeof currentQuestion): number => {
    const { correctAnswer, options } = question;
    // If correctAnswer is a string, find its index in options
    if (typeof correctAnswer === 'string') {
      const index = options.findIndex((opt) => opt === correctAnswer);
      return index >= 0 ? index : 0;
    }
    // If it's a number, use it directly
    return correctAnswer;
  };

  // Shuffle options once per question (memoized by currentIndex)
  const shuffledOptions = useMemo((): ShuffledOption[] => {
    const options = currentQuestion.options.map((text, originalIndex) => ({
      text,
      originalIndex,
    }));
    return shuffleArray(options);
  }, [currentIndex, currentQuestion.options]);

  const handleSubmit = React.useCallback((): void => {
    if (selectedAnswer === null) return;
    setIsSubmitted(true);
    
    // Get the original index from the shuffled selection
    const selectedOriginalIndex = shuffledOptions[selectedAnswer]?.originalIndex;
    const correctIndex = resolveCorrectIndex(currentQuestion);
    
    if (selectedOriginalIndex === correctIndex) {
      scoreRef.current += 1; // Update ref synchronously
      setScore((prev) => prev + 1);
    }
  }, [selectedAnswer, shuffledOptions, currentQuestion]);

  const handleNext = React.useCallback((): void => {
    if (currentIndex < quizQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsSubmitted(false);
    } else {
      // Quiz complete - use scoreRef for accurate count (not affected by async state)
      setIsComplete(true);
      setFinalScore(scoreRef.current);
    }
  }, [currentIndex, quizQuestions.length]);

  // Handle continue to next stage (only called from completion screen)
  const handleContinue = React.useCallback((): void => {
    const percentage = Math.round((finalScore / quizQuestions.length) * 100);
    if (onComplete) {
      onComplete({
        passed: percentage >= config.passingScore,
        score: finalScore,
        totalQuestions: quizQuestions.length,
        percentage,
      });
    }
  }, [finalScore, quizQuestions.length, config.passingScore, onComplete]);

  const handleRestart = React.useCallback((): void => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsSubmitted(false);
    setScore(0);
    scoreRef.current = 0; // Reset ref too
    setIsComplete(false);
  }, []);

  if (isComplete) {
    const percentage = Math.round((finalScore / quizQuestions.length) * 100);
    const passed = percentage >= config.passingScore;

    return (
      <div className="space-y-6">
        <div className="cut-corner border border-anime-700 bg-anime-900 p-8 text-center">
          <h3 className="font-heading text-2xl font-bold text-anime-100">
            Quiz Complete!
          </h3>
          <p className="mt-2 text-lg text-anime-400">
            You scored{" "}
            <span className="font-bold text-anime-cyan">
              {finalScore}/{quizQuestions.length}
            </span>{" "}
            ({percentage}%)
          </p>
          <div className="mt-4">
            <span
              className={`inline-block rounded-full px-4 py-2 text-sm font-medium border ${
                passed
                  ? "bg-anime-green/20 text-anime-green border-anime-green/50"
                  : "bg-anime-accent/20 text-anime-accent border-anime-accent/50"
              }`}
            >
              {percentage >= 80
                ? "Excellent!"
                : percentage >= 60
                  ? "Good effort!"
                  : "Keep studying!"}
            </span>
          </div>
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={handleRestart}
              className="rounded-lg border border-anime-700 bg-anime-800 px-6 py-2 text-sm font-medium text-anime-300 transition-all duration-300 hover:bg-anime-700"
            >
              Retry Quiz
            </button>
            <button
              onClick={handleContinue}
              className="rounded-lg bg-anime-green px-8 py-2 text-sm font-bold text-anime-950 uppercase tracking-wider transition-all duration-300 hover:shadow-neon-cyan hover:scale-105"
            >
              Continue to Next Stage →
            </button>
          </div>
        </div>

        {/* Learnings (shown after quiz completion) */}
        {config.learnings && config.learnings.length > 0 && (
          <div className="bg-anime-950 border border-anime-green/30 rounded-lg p-6">
            <h3 className="font-heading text-lg text-anime-green mb-4">
              Key Learnings
            </h3>
            <ul className="space-y-2">
              {config.learnings.map((learning, index) => (
                <li key={index} className="flex items-start gap-3 text-anime-300">
                  <span className="text-anime-green mt-1">✓</span>
                  <span>{learning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="cut-corner border border-anime-700 bg-anime-900 p-6">
      <div className="mb-4 flex items-center justify-between text-sm text-anime-500">
        <span>
          Question {currentIndex + 1} of {quizQuestions.length}
        </span>
        <span>
          Score: {score}/{isSubmitted ? currentIndex + 1 : currentIndex}
        </span>
      </div>

      <h3 className="mb-6 font-heading text-lg font-semibold text-anime-100">
        {currentQuestion.question}
      </h3>

      <div className="space-y-3">
        {shuffledOptions.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const correctIndex = resolveCorrectIndex(currentQuestion);
          const isCorrectOption = option.originalIndex === correctIndex;
          const showResult = isSubmitted;

          let borderClass = "border-anime-700";
          if (showResult) {
            if (isSelected && isCorrectOption) {
              borderClass = "border-anime-green";
            } else if (isSelected && !isCorrectOption) {
              borderClass = "border-anime-accent";
            } else if (!isSelected && isCorrectOption) {
              borderClass = "border-anime-green";
            }
          } else if (isSelected) {
            borderClass = "border-anime-cyan";
          }

          return (
            <button
              key={index}
              onClick={() => !isSubmitted && setSelectedAnswer(index)}
              disabled={isSubmitted}
              className={`w-full text-left rounded-lg border-2 ${borderClass} bg-anime-800 p-4 transition-all duration-300 hover:bg-anime-700 disabled:cursor-not-allowed disabled:hover:bg-anime-800`}
            >
              <span className="text-anime-200">{option.text}</span>
            </button>
          );
        })}
      </div>

      {isSubmitted && (
        <div className="mt-6 rounded-lg border border-anime-700 bg-anime-950 p-4">
          <p className="text-sm text-anime-300">{currentQuestion.explanation}</p>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        {!isSubmitted ? (
          <button
            onClick={handleSubmit}
            disabled={selectedAnswer === null}
            className="rounded-lg bg-anime-accent px-6 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-anime-purple hover:shadow-neon-purple disabled:bg-anime-800 disabled:text-anime-600 disabled:cursor-not-allowed"
          >
            Submit
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="rounded-lg bg-anime-cyan px-6 py-2 text-sm font-medium text-anime-950 transition-all duration-300 hover:bg-anime-cyan/90 shadow-neon-cyan"
          >
            {currentIndex < quizQuestions.length - 1 ? "Next" : "Finish"}
          </button>
        )}
      </div>
    </div>
  );
}
