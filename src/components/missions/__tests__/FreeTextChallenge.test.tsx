/**
 * @file FreeTextChallenge.test.tsx
 * @description Tests for FreeTextChallenge component - free-form code challenges
 */

import type { FreeTextConfig } from "@/lib/missions";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FreeTextChallenge } from "../FreeTextChallenge";

const mockFreeTextConfig: FreeTextConfig = {
  description: "Write a PySpark transformation that filters and aggregates transaction data.",
  starterCode: `# Load the data
df = spark.read.format("delta").load("/data/transactions")

# Your code here
`,
  expectedPattern: "groupBy.*agg.*sum",
  simulatedOutput: `+----------+-----------+
| category | total     |
+----------+-----------+
| food     | 1250.50   |
| tech     | 3400.75   |
+----------+-----------+`,
  hints: [
    "Use groupBy() to group by category",
    "Use agg() with sum() to calculate totals",
  ],
};

describe("FreeTextChallenge", () => {
  describe("Basic Rendering", () => {
    it("renders description", () => {
      render(<FreeTextChallenge config={mockFreeTextConfig} />);
      expect(
        screen.getByText("Write a PySpark transformation that filters and aggregates transaction data.")
      ).toBeInTheDocument();
    });

    it("renders code editor with starter code", () => {
      render(<FreeTextChallenge config={mockFreeTextConfig} />);
      const editor = screen.getByRole("textbox", { name: /code editor/i });
      expect(editor).toHaveValue(mockFreeTextConfig.starterCode);
    });

    it("renders run code button", () => {
      render(<FreeTextChallenge config={mockFreeTextConfig} />);
      expect(screen.getByRole("button", { name: /run code/i })).toBeInTheDocument();
    });

    it("renders submit button", () => {
      render(<FreeTextChallenge config={mockFreeTextConfig} />);
      expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
    });
  });

  describe("Code Editing", () => {
    it("allows users to edit code", async () => {
      const user = userEvent.setup();
      render(<FreeTextChallenge config={mockFreeTextConfig} />);
      
      const editor = screen.getByRole("textbox", { name: /code editor/i });
      await user.clear(editor);
      await user.type(editor, "print('Hello')");
      
      expect(editor).toHaveValue("print('Hello')");
    });

    it("maintains code across edits", async () => {
      const user = userEvent.setup();
      render(<FreeTextChallenge config={mockFreeTextConfig} />);
      
      const editor = screen.getByRole("textbox", { name: /code editor/i }) as HTMLTextAreaElement;
      const initialLength = editor.value.length;
      
      await user.type(editor, "# Additional code");
      
      expect(editor.value).toContain("# Additional code");
      expect(editor.value.length).toBeGreaterThan(initialLength);
    });
  });

  describe("Code Execution (Simulated)", () => {
    it("shows simulated output when run code button is clicked", async () => {
      const user = userEvent.setup();
      render(<FreeTextChallenge config={mockFreeTextConfig} />);
      
      await user.click(screen.getByRole("button", { name: /run code/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/category/i)).toBeInTheDocument();
        expect(screen.getByText(/food/i)).toBeInTheDocument();
      });
    });

    it("disables run button while code is running", async () => {
      const user = userEvent.setup();
      render(<FreeTextChallenge config={mockFreeTextConfig} />);
      
      const runButton = screen.getByRole("button", { name: /run code/i });
      await user.click(runButton);
      
      // Button should be disabled during execution
      expect(runButton).toBeDisabled();
    });

    it("shows loading state during execution", async () => {
      const user = userEvent.setup();
      render(<FreeTextChallenge config={mockFreeTextConfig} />);
      
      const runButton = screen.getByRole("button", { name: /run code/i });
      await user.click(runButton);
      
      // Check for running state immediately after click
      await waitFor(() => {
        expect(runButton).toHaveTextContent(/running/i);
      }, { timeout: 100 });
    });
  });

  describe("Hint Display", () => {
    it("renders show hint button with count", () => {
      render(<FreeTextChallenge config={mockFreeTextConfig} />);
      expect(screen.getByRole("button", { name: /show hint.*2 available/i })).toBeInTheDocument();
    });

    it("shows first hint when button is clicked", async () => {
      const user = userEvent.setup();
      render(<FreeTextChallenge config={mockFreeTextConfig} />);
      
      await user.click(screen.getByRole("button", { name: /show hint/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Use groupBy\(\) to group by category/)).toBeInTheDocument();
      });
    });

    it("cycles through hints on subsequent clicks", async () => {
      const user = userEvent.setup();
      render(<FreeTextChallenge config={mockFreeTextConfig} />);
      
      const hintButton = screen.getByRole("button", { name: /show hint/i });
      await user.click(hintButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Hint 1\/2/)).toBeInTheDocument();
        expect(screen.getByText(/Use groupBy\(\) to group by category/)).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole("button", { name: /next hint.*1 remaining/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Hint 2\/2/)).toBeInTheDocument();
        expect(screen.getByText(/Use agg\(\) with sum\(\) to calculate totals/)).toBeInTheDocument();
      });
    });

    it("does not render hint button when no hints available", () => {
      const configWithoutHints = { ...mockFreeTextConfig, hints: [] };
      render(<FreeTextChallenge config={configWithoutHints} />);
      expect(screen.queryByRole("button", { name: /show hint/i })).not.toBeInTheDocument();
    });
  });

  describe("Code Validation", () => {
    it("validates code against expected pattern when submitted", async () => {
      const user = userEvent.setup();
      render(<FreeTextChallenge config={mockFreeTextConfig} />);
      
      const editor = screen.getByRole("textbox", { name: /code editor/i });
      await user.clear(editor);
      await user.type(editor, "df.groupBy('category').agg(sum('amount'))");
      
      await user.click(screen.getByRole("button", { name: /run code/i }));
      
      // Wait for submit button to be enabled (not disabled)
      await waitFor(
        () => {
          const submitBtn = screen.getByRole("button", { name: /submit/i });
          expect(submitBtn).not.toBeDisabled();
        },
        { timeout: 3000 }
      );
      
      await user.click(screen.getByRole("button", { name: /submit/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/correct/i)).toBeInTheDocument();
      });
    });

    it("shows error when code does not match pattern", async () => {
      const user = userEvent.setup();
      render(<FreeTextChallenge config={mockFreeTextConfig} />);
      
      const editor = screen.getByRole("textbox", { name: /code editor/i });
      await user.clear(editor);
      await user.type(editor, "print('wrong approach')");
      
      await user.click(screen.getByRole("button", { name: /run code/i }));
      
      await waitFor(
        () => {
          const submitBtn = screen.getByRole("button", { name: /submit/i });
          expect(submitBtn).not.toBeDisabled();
        },
        { timeout: 3000 }
      );
      
      await user.click(screen.getByRole("button", { name: /submit/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/not quite/i)).toBeInTheDocument();
      });
    });

    it("calls onComplete when code is correct and Continue is clicked", async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      render(<FreeTextChallenge config={mockFreeTextConfig} onComplete={onComplete} />);
      
      const editor = screen.getByRole("textbox", { name: /code editor/i });
      await user.clear(editor);
      await user.type(editor, "df.groupBy('category').agg(sum('amount'))");
      
      await user.click(screen.getByRole("button", { name: /run code/i }));
      
      await waitFor(
        () => {
          const submitBtn = screen.getByRole("button", { name: /submit/i });
          expect(submitBtn).not.toBeDisabled();
        },
        { timeout: 3000 }
      );
      
      await user.click(screen.getByRole("button", { name: /submit/i }));
      
      // Should show success message first
      await waitFor(() => {
        expect(screen.getByText(/correct/i)).toBeInTheDocument();
      });
      
      // Click Continue to trigger onComplete
      await user.click(screen.getByRole("button", { name: /continue/i }));
      
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith({
          correct: true,
          code: expect.any(String),
          attempts: 1,
        });
      });
    });

    it("submits button is disabled until code is run at least once", () => {
      render(<FreeTextChallenge config={mockFreeTextConfig} />);
      expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();
    });

    it("enables submit button after code is run", async () => {
      const user = userEvent.setup();
      render(<FreeTextChallenge config={mockFreeTextConfig} />);
      
      await user.click(screen.getByRole("button", { name: /run code/i }));
      
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /submit/i })).toBeEnabled();
      }, { timeout: 3000 });
    });
  });

  describe("Styling", () => {
    it("applies cyberpunk theme classes", () => {
      const { container } = render(<FreeTextChallenge config={mockFreeTextConfig} />);
      expect(container.querySelector(".bg-anime-900")).toBeInTheDocument();
    });

    it("uses monospace font for code editor", () => {
      render(<FreeTextChallenge config={mockFreeTextConfig} />);
      const editor = screen.getByRole("textbox", { name: /code editor/i });
      expect(editor).toHaveClass("font-mono");
    });

    it("uses monospace font for output", async () => {
      const user = userEvent.setup();
      const { container } = render(<FreeTextChallenge config={mockFreeTextConfig} />);
      
      await user.click(screen.getByRole("button", { name: /run code/i }));
      
      await waitFor(() => {
        expect(container.querySelector(".font-mono")).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("labels code editor for screen readers", () => {
      render(<FreeTextChallenge config={mockFreeTextConfig} />);
      const editor = screen.getByRole("textbox", { name: /code editor/i });
      expect(editor).toHaveAccessibleName();
    });

    it("provides accessible button labels", () => {
      render(<FreeTextChallenge config={mockFreeTextConfig} />);
      expect(screen.getByRole("button", { name: /run code/i })).toHaveAccessibleName();
      expect(screen.getByRole("button", { name: /submit/i })).toHaveAccessibleName();
    });
  });

  describe("Attempt Tracking", () => {
    it("allows multiple retries on wrong answers", async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      render(<FreeTextChallenge config={mockFreeTextConfig} onComplete={onComplete} />);
      
      const editor = screen.getByRole("textbox", { name: /code editor/i });
      await user.clear(editor);
      await user.type(editor, "wrong code here"); // Wrong code
      
      await user.click(screen.getByRole("button", { name: /run code/i }));
      
      await waitFor(
        () => {
          const submitBtn = screen.getByRole("button", { name: /submit/i });
          expect(submitBtn).not.toBeDisabled();
        },
        { timeout: 3000 }
      );
      
      // First submit - wrong answer
      await user.click(screen.getByRole("button", { name: /submit/i }));
      await waitFor(() => {
        expect(screen.getByText(/not quite/i)).toBeInTheDocument();
      });
      
      // onComplete should NOT be called on wrong answers
      expect(onComplete).not.toHaveBeenCalled();
      
      // Submit button should still be visible for retry
      expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
    });
  });
});
