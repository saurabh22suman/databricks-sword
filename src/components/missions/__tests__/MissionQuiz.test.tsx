/**
 * @file MissionQuiz.test.tsx
 * @description Tests for MissionQuiz component - quiz stage wrapper
 */

import type { QuizConfig } from "@/lib/missions";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MissionQuiz } from "../MissionQuiz";

// Mock Math.random to make shuffle deterministic (returns original order)
let mathRandomSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // Return values that result in no swapping (shuffle returns original order)
  mathRandomSpy = vi.spyOn(Math, 'random').mockImplementation(() => 0.9999);
});

afterEach(() => {
  mathRandomSpy.mockRestore();
});

const mockQuizConfig: QuizConfig = {
  questions: [
    {
      id: "q1",
      question: "What does DataFrame.groupBy() return in PySpark?",
      options: [
        "A Dictionary",
        "A GroupedData object",
        "A new DataFrame",
        "An RDD",
      ],
      correctAnswer: 1,
      explanation:
        "groupBy() returns a GroupedData object that allows chaining aggregation methods.",
    },
    {
      id: "q2",
      question: "Which function is used to read Delta tables?",
      options: [
        "spark.read.delta()",
        "spark.read.format('delta').load()",
        "spark.read.table()",
        "All of the above",
      ],
      correctAnswer: 3,
      explanation:
        "All three methods can be used to read Delta tables in different contexts.",
    },
    {
      id: "q3",
      question: "What is the minimum passing score threshold?",
      options: ["50%", "60%", "70%", "80%"],
      correctAnswer: 2,
      explanation: "The default passing threshold is 70%.",
    },
  ],
  passingScore: 70,
};

describe("MissionQuiz", () => {
  describe("Basic Rendering", () => {
    it("renders first question", () => {
      render(<MissionQuiz config={mockQuizConfig} />);
      expect(
        screen.getByText(
          "What does DataFrame.groupBy() return in PySpark?"
        )
      ).toBeInTheDocument();
    });

    it("renders all options for current question", () => {
      render(<MissionQuiz config={mockQuizConfig} />);
      expect(screen.getByText("A Dictionary")).toBeInTheDocument();
      expect(screen.getByText("A GroupedData object")).toBeInTheDocument();
      expect(screen.getByText("A new DataFrame")).toBeInTheDocument();
      expect(screen.getByText("An RDD")).toBeInTheDocument();
    });

    it("shows question progress", () => {
      render(<MissionQuiz config={mockQuizConfig} />);
      expect(screen.getByText(/question 1 of 3/i)).toBeInTheDocument();
    });

    it("renders submit button", () => {
      render(<MissionQuiz config={mockQuizConfig} />);
      expect(
        screen.getByRole("button", { name: /submit/i })
      ).toBeInTheDocument();
    });
  });

  describe("Quiz Flow", () => {
    it("allows selecting an option", async () => {
      const user = userEvent.setup();
      render(<MissionQuiz config={mockQuizConfig} />);

      const option = screen.getByText("A GroupedData object");
      await user.click(option);

      await waitFor(() => {
        // Check if the option is visually selected (has border or bg color)
        const parent = option.closest("button");
        expect(parent).toHaveClass(/border-anime-cyan/);
      });
    });

    it("disables submit until option is selected", () => {
      render(<MissionQuiz config={mockQuizConfig} />);
      const submitBtn = screen.getByRole("button", { name: /submit/i });
      expect(submitBtn).toBeDisabled();
    });

    it("enables submit after selecting option", async () => {
      const user = userEvent.setup();
      render(<MissionQuiz config={mockQuizConfig} />);

      await user.click(screen.getByText("A GroupedData object"));

      await waitFor(() => {
        const submitBtn = screen.getByRole("button", { name: /submit/i });
        expect(submitBtn).not.toBeDisabled();
      });
    });

    it("shows explanation after submission", async () => {
      const user = userEvent.setup();
      render(<MissionQuiz config={mockQuizConfig} />);

      await user.click(screen.getByText("A GroupedData object"));
      await user.click(screen.getByRole("button", { name: /submit/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/returns a GroupedData object/i)
        ).toBeInTheDocument();
      });
    });

    it("proceeds to next question when Next is clicked", async () => {
      const user = userEvent.setup();
      render(<MissionQuiz config={mockQuizConfig} />);

      // Answer first question
      await user.click(screen.getByText("A GroupedData object"));
      await user.click(screen.getByRole("button", { name: /submit/i }));

      // Click Next
      await user.click(screen.getByRole("button", { name: /next/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/Which function is used to read Delta tables/i)
        ).toBeInTheDocument();
      });
    });

    it("shows final score after all questions", async () => {
      const user = userEvent.setup();
      render(<MissionQuiz config={mockQuizConfig} />);

      // Answer all 3 questions correctly
      await user.click(screen.getByText("A GroupedData object"));
      await user.click(screen.getByRole("button", { name: /submit/i }));
      await user.click(screen.getByRole("button", { name: /next/i }));

      await user.click(screen.getByText("All of the above"));
      await user.click(screen.getByRole("button", { name: /submit/i }));
      await user.click(screen.getByRole("button", { name: /next/i }));

      await user.click(screen.getByText("70%"));
      await user.click(screen.getByRole("button", { name: /submit/i }));
      await user.click(screen.getByRole("button", { name: /finish/i })); // Last question

      await waitFor(() => {
        expect(screen.getByText(/quiz complete/i)).toBeInTheDocument();
        expect(screen.getByText(/3\/3/)).toBeInTheDocument();
      });
    });
  });

  describe("Scoring", () => {
    it("calculates correct score percentage", async () => {
      const user = userEvent.setup();
      render(<MissionQuiz config={mockQuizConfig} />);

      // Answer 2/3 correctly (66.67%)
      await user.click(screen.getByText("A GroupedData object")); // Correct
      await user.click(screen.getByRole("button", { name: /submit/i }));
      await user.click(screen.getByRole("button", { name: /next/i }));

      await user.click(screen.getByText("All of the above")); // Correct
      await user.click(screen.getByRole("button", { name: /submit/i }));
      await user.click(screen.getByRole("button", { name: /next/i }));

      await user.click(screen.getByText("50%")); // Wrong (correct is 70%)
      await user.click(screen.getByRole("button", { name: /submit/i }));
      await user.click(screen.getByRole("button", { name: /finish/i })); // Last question

      await waitFor(() => {
        expect(screen.getByText(/67%/)).toBeInTheDocument();
      });
    });

    it("indicates pass when score >= passingScore", async () => {
      const user = userEvent.setup();
      render(<MissionQuiz config={mockQuizConfig} />);

      // Answer all 3 correctly (100%)
      await user.click(screen.getByText("A GroupedData object"));
      await user.click(screen.getByRole("button", { name: /submit/i }));
      await user.click(screen.getByRole("button", { name: /next/i }));

      await user.click(screen.getByText("All of the above"));
      await user.click(screen.getByRole("button", { name: /submit/i }));
      await user.click(screen.getByRole("button", { name: /next/i }));

      await user.click(screen.getByText("70%"));
      await user.click(screen.getByRole("button", { name: /submit/i }));
      await user.click(screen.getByRole("button", { name: /finish/i })); // Last question

      await waitFor(() => {
        expect(screen.getByText(/excellent/i)).toBeInTheDocument();
      });
    });

    it("indicates fail when score < passingScore", async () => {
      const user = userEvent.setup();
      render(<MissionQuiz config={mockQuizConfig} />);

      // Answer all wrong (0%)
      await user.click(screen.getByText("A Dictionary"));
      await user.click(screen.getByRole("button", { name: /submit/i }));
      await user.click(screen.getByRole("button", { name: /next/i }));

      await user.click(screen.getByText("spark.read.delta()"));
      await user.click(screen.getByRole("button", { name: /submit/i }));
      await user.click(screen.getByRole("button", { name: /next/i }));

      await user.click(screen.getByText("50%"));
      await user.click(screen.getByRole("button", { name: /submit/i }));
      await user.click(screen.getByRole("button", { name: /finish/i })); // Last question

      await waitFor(() => {
        expect(screen.getByText(/keep studying/i)).toBeInTheDocument();
      });
    });
  });

  describe("Callbacks", () => {
    it("calls onComplete after quiz finishes and Continue is clicked", async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      render(<MissionQuiz config={mockQuizConfig} onComplete={onComplete} />);

      // Complete quiz
      await user.click(screen.getByText("A GroupedData object"));
      await user.click(screen.getByRole("button", { name: /submit/i }));
      await user.click(screen.getByRole("button", { name: /next/i }));

      await user.click(screen.getByText("All of the above"));
      await user.click(screen.getByRole("button", { name: /submit/i }));
      await user.click(screen.getByRole("button", { name: /next/i }));

      await user.click(screen.getByText("70%"));
      await user.click(screen.getByRole("button", { name: /submit/i }));
      await user.click(screen.getByRole("button", { name: /finish/i })); // Last question

      // Should show quiz results first
      await waitFor(() => {
        expect(screen.getByText(/quiz complete/i)).toBeInTheDocument();
      });

      // Click Continue to trigger onComplete
      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith({
          passed: true,
          score: 3,
          totalQuestions: 3,
          percentage: 100,
        });
      });
    });
  });

  describe("Styling", () => {
    it("applies cyberpunk theme classes", () => {
      const { container } = render(<MissionQuiz config={mockQuizConfig} />);
      const quizWrapper = container.querySelector(".cut-corner");
      expect(quizWrapper).toBeInTheDocument();
    });

    it("highlights correct answer in green", async () => {
      const user = userEvent.setup();
      render(<MissionQuiz config={mockQuizConfig} />);

      await user.click(screen.getByText("A GroupedData object")); // Correct
      await user.click(screen.getByRole("button", { name: /submit/i }));

      await waitFor(() => {
        const option = screen.getByText("A GroupedData object").closest("button");
        expect(option).toHaveClass(/border-anime-green/);
      });
    });

    it("highlights incorrect answer in red", async () => {
      const user = userEvent.setup();
      render(<MissionQuiz config={mockQuizConfig} />);

      await user.click(screen.getByText("A Dictionary")); // Wrong
      await user.click(screen.getByRole("button", { name: /submit/i }));

      await waitFor(() => {
        const option = screen.getByText("A Dictionary").closest("button");
        expect(option).toHaveClass(/border-anime-accent/);
      });
    });
  });

  describe("Accessibility", () => {
    it("labels options for screen readers", () => {
      render(<MissionQuiz config={mockQuizConfig} />);
      const options = screen.getAllByRole("button");
      expect(options.length).toBeGreaterThan(0);
    });

    it("provides accessible button labels", () => {
      render(<MissionQuiz config={mockQuizConfig} />);
      expect(
        screen.getByRole("button", { name: /submit/i })
      ).toBeInTheDocument();
    });
  });
});
