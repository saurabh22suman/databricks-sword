/**
 * @file FillBlankChallenge.test.tsx
 * @description Tests for FillBlankChallenge component - fill-in-the-blank code challenges
 */

import type { FillBlankConfig } from "@/lib/missions";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FillBlankChallenge } from "../FillBlankChallenge";

// Mock Math.random to make shuffle deterministic (returns original order)
let mathRandomSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // Return values that result in no swapping (shuffle returns original order)
  mathRandomSpy = vi.spyOn(Math, 'random').mockImplementation(() => 0.9999);
});

afterEach(() => {
  mathRandomSpy.mockRestore();
});

const mockFillBlankConfig: FillBlankConfig = {
  description: "Complete the Delta Lake merge operation code.",
  codeTemplate: `deltaTable.alias("target")
  .merge(
    updates.alias("source"),
    "__BLANK_0__"
  )
  .whenMatched()
    .__BLANK_1__({
      "value": "source.value"
    })
  .whenNotMatched()
    .__BLANK_2__({
      "id": "source.id",
      "value": "source.value"
    })
  .execute()`,
  blanks: [
    {
      id: 0,
      correctAnswer: '"target.id = source.id"',
      options: [
        '"target.id = source.id"',
        '"target.id == source.id"',
        'target.id = source.id',
      ],
    },
    {
      id: 1,
      correctAnswer: "updateExpr",
      options: ["updateExpr", "update", "updateAll", "set"],
    },
    {
      id: 2,
      correctAnswer: "insertExpr",
      options: ["insertExpr", "insert", "insertAll", "add"],
    },
  ],
  hints: [
    "Delta Lake merge uses SQL-style join conditions with quotes",
    "Think about the method names for conditional updates in Delta Lake",
  ],
};

describe("FillBlankChallenge", () => {
  describe("Basic Rendering", () => {
    it("renders description", () => {
      render(<FillBlankChallenge config={mockFillBlankConfig} />);
      expect(screen.getByText("Complete the Delta Lake merge operation code.")).toBeInTheDocument();
    });

    it("renders code template with blanks replaced by dropdowns", () => {
      render(<FillBlankChallenge config={mockFillBlankConfig} />);
      const selects = screen.getAllByRole("combobox");
      expect(selects).toHaveLength(3);
    });

    it("renders check button", () => {
      render(<FillBlankChallenge config={mockFillBlankConfig} />);
      expect(screen.getByRole("button", { name: /check answers/i })).toBeInTheDocument();
    });

    it("check button is disabled when not all blanks are filled", () => {
      render(<FillBlankChallenge config={mockFillBlankConfig} />);
      expect(screen.getByRole("button", { name: /check answers/i })).toBeDisabled();
    });
  });

  describe("Blank Selection", () => {
    it("renders all options for each blank", async () => {
      const user = userEvent.setup();
      render(<FillBlankChallenge config={mockFillBlankConfig} />);
      
      const firstSelect = screen.getAllByRole("combobox")[0];
      await user.click(firstSelect);
      
      expect(screen.getByRole("option", { name: '"target.id = source.id"' })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: '"target.id == source.id"' })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: 'target.id = source.id' })).toBeInTheDocument();
    });

    it("updates selection when user picks an option", async () => {
      const user = userEvent.setup();
      render(<FillBlankChallenge config={mockFillBlankConfig} />);
      
      const firstSelect = screen.getAllByRole("combobox")[0];
      await user.selectOptions(firstSelect, '"target.id = source.id"');
      
      expect(firstSelect).toHaveValue('"target.id = source.id"');
    });

    it("enables check button when all blanks are filled", async () => {
      const user = userEvent.setup();
      render(<FillBlankChallenge config={mockFillBlankConfig} />);
      
      const selects = screen.getAllByRole("combobox");
      await user.selectOptions(selects[0], '"target.id = source.id"');
      await user.selectOptions(selects[1], "updateExpr");
      await user.selectOptions(selects[2], "insertExpr");
      
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /check answers/i })).toBeEnabled();
      });
    });
  });

  describe("Hint Display", () => {
    it("renders show hint button with count", () => {
      render(<FillBlankChallenge config={mockFillBlankConfig} />);
      expect(screen.getByRole("button", { name: /show hint.*2 available/i })).toBeInTheDocument();
    });

    it("shows hint when button is clicked", async () => {
      const user = userEvent.setup();
      render(<FillBlankChallenge config={mockFillBlankConfig} />);
      
      await user.click(screen.getByRole("button", { name: /show hint/i }));
      
      await waitFor(() => {
        expect(
          screen.getByText(/Delta Lake merge uses SQL-style join conditions with quotes/)
        ).toBeInTheDocument();
      });
    });

    it("shows hint number after hint is revealed", async () => {
      const user = userEvent.setup();
      render(<FillBlankChallenge config={mockFillBlankConfig} />);
      
      await user.click(screen.getByRole("button", { name: /show hint/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Hint 1\/2/)).toBeInTheDocument();
      });
    });

    it("does not render hint button when no hints available", () => {
      const configWithoutHints = { ...mockFillBlankConfig, hints: [] };
      render(<FillBlankChallenge config={configWithoutHints} />);
      expect(screen.queryByRole("button", { name: /show hint/i })).not.toBeInTheDocument();
    });
  });

  describe("Validation", () => {
    it("validates all correct answers", async () => {
      const user = userEvent.setup();
      render(<FillBlankChallenge config={mockFillBlankConfig} />);
      
      const selects = screen.getAllByRole("combobox");
      await user.selectOptions(selects[0], '"target.id = source.id"');
      await user.selectOptions(selects[1], "updateExpr");
      await user.selectOptions(selects[2], "insertExpr");
      
      await user.click(screen.getByRole("button", { name: /check answers/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/all correct/i)).toBeInTheDocument();
      });
    });

    it("shows error message when some answers are wrong", async () => {
      const user = userEvent.setup();
      render(<FillBlankChallenge config={mockFillBlankConfig} />);
      
      const selects = screen.getAllByRole("combobox");
      await user.selectOptions(selects[0], '"target.id == source.id"'); // Wrong
      await user.selectOptions(selects[1], "updateExpr");
      await user.selectOptions(selects[2], "insertExpr");
      
      await user.click(screen.getByRole("button", { name: /check answers/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/not quite/i)).toBeInTheDocument();
      });
    });

    it("highlights correct and incorrect blanks after validation", async () => {
      const user = userEvent.setup();
      render(<FillBlankChallenge config={mockFillBlankConfig} />);
      
      const selects = screen.getAllByRole("combobox");
      await user.selectOptions(selects[0], '"target.id == source.id"'); // Wrong
      await user.selectOptions(selects[1], "updateExpr"); // Correct
      await user.selectOptions(selects[2], "insertExpr"); // Correct
      
      await user.click(screen.getByRole("button", { name: /check answers/i }));
      
      await waitFor(() => {
        expect(selects[0]).toHaveClass("border-anime-accent"); // Incorrect
        expect(selects[1]).toHaveClass("border-anime-green"); // Correct
        expect(selects[2]).toHaveClass("border-anime-green"); // Correct
      });
    });

    it("calls onComplete when all answers are correct", async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      render(<FillBlankChallenge config={mockFillBlankConfig} onComplete={onComplete} />);
      
      const selects = screen.getAllByRole("combobox");
      await user.selectOptions(selects[0], '"target.id = source.id"');
      await user.selectOptions(selects[1], "updateExpr");
      await user.selectOptions(selects[2], "insertExpr");
      
      // Click check to validate
      await user.click(screen.getByRole("button", { name: /check answers/i }));
      
      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/all correct/i)).toBeInTheDocument();
      });
      
      // Click Continue to trigger onComplete
      await user.click(screen.getByRole("button", { name: /continue/i }));
      
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith({
          correct: true,
          score: 100,
          attempts: 1,
        });
      });
    });

    it("shows partial score for partially correct answers but does not call onComplete", async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      render(<FillBlankChallenge config={mockFillBlankConfig} onComplete={onComplete} />);
      
      const selects = screen.getAllByRole("combobox");
      await user.selectOptions(selects[0], '"target.id == source.id"'); // Wrong
      await user.selectOptions(selects[1], "updateExpr"); // Correct
      await user.selectOptions(selects[2], "insertExpr"); // Correct
      
      await user.click(screen.getByRole("button", { name: /check answers/i }));
      
      // Should show partial score feedback but NOT call onComplete
      await waitFor(() => {
        expect(screen.getByText(/not quite/i)).toBeInTheDocument();
      });
      
      // onComplete should NOT be called on wrong answers
      expect(onComplete).not.toHaveBeenCalled();
      
      // Check button should still be visible for retry
      expect(screen.getByRole("button", { name: /check answers/i })).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies cyberpunk theme classes", () => {
      const { container } = render(<FillBlankChallenge config={mockFillBlankConfig} />);
      expect(container.querySelector(".bg-anime-900")).toBeInTheDocument();
    });

    it("uses monospace font for code", () => {
      const { container } = render(<FillBlankChallenge config={mockFillBlankConfig} />);
      expect(container.querySelector(".font-mono")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("labels each blank dropdown", () => {
      render(<FillBlankChallenge config={mockFillBlankConfig} />);
      const selects = screen.getAllByRole("combobox");
      selects.forEach((select) => {
        expect(select).toHaveAccessibleName();
      });
    });

    it("provides check button with accessible label", () => {
      render(<FillBlankChallenge config={mockFillBlankConfig} />);
      const button = screen.getByRole("button", { name: /check answers/i });
      expect(button).toHaveAccessibleName();
    });
  });

  describe("Attempt Tracking", () => {
    it("allows multiple retries on wrong answers", async () => {
      const user = userEvent.setup();
      render(<FillBlankChallenge config={mockFillBlankConfig} />);
      
      const selects = screen.getAllByRole("combobox");
      // Select wrong answers
      await user.selectOptions(selects[0], '"target.id == source.id"'); // Wrong
      await user.selectOptions(selects[1], "updateExpr");
      await user.selectOptions(selects[2], "insertExpr");
      
      // First check - wrong answer
      await user.click(screen.getByRole("button", { name: /check answers/i }));
      await waitFor(() => {
        expect(screen.getByText(/not quite/i)).toBeInTheDocument();
      });
      
      // Check button should still be visible for retry
      expect(screen.getByRole("button", { name: /check answers/i })).toBeInTheDocument();
      
      // Second check - still wrong (user might rearrange but we keep same wrong answer)
      await user.click(screen.getByRole("button", { name: /check answers/i }));
      await waitFor(() => {
        expect(screen.getByText(/not quite/i)).toBeInTheDocument();
      });
      
      // Check button still visible
      expect(screen.getByRole("button", { name: /check answers/i })).toBeInTheDocument();
    });
  });
});
