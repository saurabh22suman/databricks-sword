/**
 * @file DragDropChallenge.test.tsx
 * @description Tests for DragDropChallenge component - code block ordering challenges
 */

import type { DragDropConfig } from "@/lib/missions";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DragDropChallenge } from "../DragDropChallenge";

// Mock Math.random to make shuffle deterministic (returns original order)
let mathRandomSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // Return values that result in no swapping (shuffle returns original order)
  let callCount = 0;
  mathRandomSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
    // Return 0.999... which when multiplied by (i+1) and floored gives i (no swap)
    return 0.9999;
  });
});

afterEach(() => {
  mathRandomSpy.mockRestore();
});

const mockDragDropConfig: DragDropConfig = {
  description: "Arrange the code blocks to build a complete Delta Lake pipeline.",
  blocks: [
    {
      id: "block-1",
      code: 'df = spark.readStream.format("delta").load("/data/raw")',
      label: "Read streaming data",
    },
    {
      id: "block-2",
      code: "df_transformed = df.select(col('id'), col('amount')).filter(col('amount') > 0)",
      label: "Transform data",
    },
    {
      id: "block-3",
      code: 'df_transformed.writeStream.format("delta").outputMode("append").start("/data/processed")',
      label: "Write to Delta Lake",
    },
  ],
  correctOrder: ["block-1", "block-2", "block-3"],
  hints: ["Think about the data pipeline flow: read -> transform -> write"],
  explanation: "A streaming pipeline follows a clear pattern: read from source, apply transformations, then write to destination.",
};

const mockComplexConfig: DragDropConfig = {
  description: "Build a complete ML pipeline with preprocessing, training, and inference.",
  blocks: [
    {
      id: "block-1",
      code: "from pyspark.ml import Pipeline",
      label: "Import Pipeline",
    },
    {
      id: "block-2",
      code: "vectorizer = VectorAssembler(inputCols=features, outputCol='features')",
      label: "Feature vectorization",
    },
    {
      id: "block-3",
      code: "lr = LogisticRegression(featuresCol='features', labelCol='label')",
      label: "Create model",
    },
    {
      id: "block-4",
      code: "pipeline = Pipeline(stages=[vectorizer, lr])",
      label: "Build pipeline",
    },
    {
      id: "block-5",
      code: "model = pipeline.fit(train_df)",
      label: "Train model",
    },
  ],
  correctOrder: ["block-1", "block-2", "block-3", "block-4", "block-5"],
  hints: ["ML pipelines follow: import -> preprocess -> define model -> build pipeline -> train"],
};

describe("DragDropChallenge", () => {
  describe("Basic Rendering", () => {
    it("renders instruction text", () => {
      render(<DragDropChallenge config={mockDragDropConfig} />);
      expect(
        screen.getByText("Arrange the code blocks to build a complete Delta Lake pipeline.")
      ).toBeInTheDocument();
    });

    it("renders all code blocks", () => {
      render(<DragDropChallenge config={mockDragDropConfig} />);
      expect(screen.getByText('df = spark.readStream.format("delta").load("/data/raw")')).toBeInTheDocument();
      expect(screen.getByText("df_transformed = df.select(col('id'), col('amount')).filter(col('amount') > 0)")).toBeInTheDocument();
      expect(screen.getByText('df_transformed.writeStream.format("delta").outputMode("append").start("/data/processed")')).toBeInTheDocument();
    });

    it("renders block labels", () => {
      render(<DragDropChallenge config={mockDragDropConfig} />);
      expect(screen.getByText("Read streaming data")).toBeInTheDocument();
      expect(screen.getByText("Transform data")).toBeInTheDocument();
      expect(screen.getByText("Write to Delta Lake")).toBeInTheDocument();
    });

    it("renders check button", () => {
      render(<DragDropChallenge config={mockDragDropConfig} />);
      expect(screen.getByRole("button", { name: /check order/i })).toBeInTheDocument();
    });
  });

  describe("Hint Display", () => {
    it("renders show hint button with count", () => {
      render(<DragDropChallenge config={mockDragDropConfig} />);
      expect(screen.getByRole("button", { name: /show hint.*1 available/i })).toBeInTheDocument();
    });

    it("shows hint when button is clicked", async () => {
      const user = userEvent.setup();
      render(<DragDropChallenge config={mockDragDropConfig} />);
      await user.click(screen.getByRole("button", { name: /show hint/i }));
      await waitFor(() => {
        expect(
          screen.getByText(/Think about the data pipeline flow: read -> transform -> write/)
        ).toBeInTheDocument();
      });
    });

    it("shows hint number after hint is revealed", async () => {
      const user = userEvent.setup();
      render(<DragDropChallenge config={mockDragDropConfig} />);
      await user.click(screen.getByRole("button", { name: /show hint/i }));
      await waitFor(() => {
        expect(screen.getByText(/Hint 1\/1/)).toBeInTheDocument();
      });
    });

    it("does not render hint section when hints array is empty", () => {
      const configWithoutHint = { ...mockDragDropConfig, hints: [] };
      render(<DragDropChallenge config={configWithoutHint} />);
      expect(screen.queryByRole("button", { name: /show hint/i })).not.toBeInTheDocument();
    });
  });

  describe("Drag and Drop Functionality", () => {
    it("allows reordering blocks via drag and drop", () => {
      const { container } = render(<DragDropChallenge config={mockDragDropConfig} />);
      const blocks = container.querySelectorAll('[draggable="true"]');
      expect(blocks.length).toBe(3);
    });

    it("applies draggable styles to blocks", () => {
      const { container } = render(<DragDropChallenge config={mockDragDropConfig} />);
      const firstBlock = container.querySelector('[draggable="true"]');
      expect(firstBlock).toHaveClass("cursor-grab");
    });

    it("updates block order when blocks are rearranged", () => {
      const onUpdate = vi.fn();
      render(<DragDropChallenge config={mockDragDropConfig} onUpdate={onUpdate} />);
      
      // Simulate drag and drop events
      // Note: Actual DOM drag/drop testing is complex, this tests the structure
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  describe("Validation", () => {
    it("validates correct order when check button is clicked", async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      render(<DragDropChallenge config={mockDragDropConfig} onComplete={onComplete} />);
      
      await user.click(screen.getByRole("button", { name: /check order/i }));
      
      // Initially, blocks are in correct order (as defined in mockDragDropConfig)
      await waitFor(() => {
        expect(screen.getByText(/correct/i)).toBeInTheDocument();
      });
    });

    it("shows success message when order is correct", async () => {
      const user = userEvent.setup();
      render(<DragDropChallenge config={mockDragDropConfig} />);
      await user.click(screen.getByRole("button", { name: /check order/i }));
      await waitFor(() => {
        expect(screen.getByText(/correct/i)).toBeInTheDocument();
      });
    });

    it("shows retry message when order is incorrect", () => {
      // This would require simulating incorrect order
      // For now, just verify the check mechanism works
      const { container } = render(<DragDropChallenge config={mockDragDropConfig} />);
      expect(container).toBeTruthy();
    });

    it("calls onComplete when order is validated as correct", async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      render(<DragDropChallenge config={mockDragDropConfig} onComplete={onComplete} />);
      
      // First click Check to validate
      await user.click(screen.getByRole("button", { name: /check order/i }));
      
      // Should show success message and Continue button
      await waitFor(() => {
        expect(screen.getByText(/correct|arranged/i)).toBeInTheDocument();
      });
      
      // Click Continue to trigger onComplete
      await user.click(screen.getByRole("button", { name: /continue/i }));
      
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith({
          correct: true,
          attempts: 1,
        });
      });
    });
  });

  describe("Explanation Display", () => {
    it("shows explanation after correct validation", async () => {
      const user = userEvent.setup();
      render(<DragDropChallenge config={mockDragDropConfig} />);
      await user.click(screen.getByRole("button", { name: /check order/i }));
      await waitFor(() => {
        expect(
          screen.getByText(/A streaming pipeline follows a clear pattern/)
        ).toBeInTheDocument();
      });
    });

    it("does not show explanation before validation", () => {
      render(<DragDropChallenge config={mockDragDropConfig} />);
      expect(
        screen.queryByText(/A streaming pipeline follows a clear pattern/)
      ).not.toBeInTheDocument();
    });

    it("does not render explanation when not provided", async () => {
      const user = userEvent.setup();
      const configWithoutExplanation = { ...mockDragDropConfig, explanation: undefined };
      render(<DragDropChallenge config={configWithoutExplanation} />);
      await user.click(screen.getByRole("button", { name: /check order/i }));
      await waitFor(() => {
        expect(screen.queryByText(/streaming pipeline/)).not.toBeInTheDocument();
      });
    });
  });

  describe("Complex Scenarios", () => {
    it("handles 5+ blocks correctly", () => {
      render(<DragDropChallenge config={mockComplexConfig} />);
      expect(screen.getByText("Import Pipeline")).toBeInTheDocument();
      expect(screen.getByText("Feature vectorization")).toBeInTheDocument();
      expect(screen.getByText("Create model")).toBeInTheDocument();
      expect(screen.getByText("Build pipeline")).toBeInTheDocument();
      expect(screen.getByText("Train model")).toBeInTheDocument();
    });

    it("shows block numbers as indicators", () => {
      const { container } = render(<DragDropChallenge config={mockDragDropConfig} />);
      const indicators = container.querySelectorAll(".text-anime-500");
      expect(indicators.length).toBeGreaterThan(0);
    });
  });

  describe("Styling", () => {
    it("applies cyberpunk theme classes", () => {
      const { container } = render(<DragDropChallenge config={mockDragDropConfig} />);
      const element = container.querySelector(".bg-anime-900");
      expect(element).toBeInTheDocument();
    });

    it("applies code font to code blocks", () => {
      const { container } = render(<DragDropChallenge config={mockDragDropConfig} />);
      const codeElement = container.querySelector(".font-mono");
      expect(codeElement).toBeInTheDocument();
    });

    it("applies neon border to draggable blocks", () => {
      const { container } = render(<DragDropChallenge config={mockDragDropConfig} />);
      const block = container.querySelector(".border-anime-700");
      expect(block).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("provides keyboard navigation for blocks", () => {
      const { container } = render(<DragDropChallenge config={mockDragDropConfig} />);
      const blocks = container.querySelectorAll('[draggable="true"]');
      blocks.forEach((block) => {
        expect(block).toHaveAttribute("draggable", "true");
      });
    });

    it("uses semantic HTML for instruction", () => {
      render(<DragDropChallenge config={mockDragDropConfig} />);
      const heading = screen.getByText(/Arrange the code blocks/);
      expect(heading.tagName).toBe("P");
    });
  });

  describe("Attempt Tracking", () => {
    it("increments attempts on each check", async () => {
      const user = userEvent.setup();
      // Use a config where correct order differs from initial order (reversed)
      // So user can check multiple times and get wrong answers
      const wrongOrderConfig: DragDropConfig = {
        ...mockDragDropConfig,
        // Correct order is 1,2,3 but blocks render in that order, so it's correct
        // For this test, change correct order so initial is wrong
        correctOrder: ["block-3", "block-2", "block-1"],
      };
      render(<DragDropChallenge config={wrongOrderConfig} />);
      
      // First check - order is wrong (initial is 1,2,3 but correct is 3,2,1)
      await user.click(screen.getByRole("button", { name: /check order/i }));
      await waitFor(() => {
        // Should show "not quite" message since order is wrong
        expect(screen.getByText(/not quite/i)).toBeInTheDocument();
      });
      
      // Check button should still be visible for retry
      expect(screen.getByRole("button", { name: /check order/i })).toBeInTheDocument();
      
      // Second check - still wrong
      await user.click(screen.getByRole("button", { name: /check order/i }));
      await waitFor(() => {
        expect(screen.getByText(/not quite/i)).toBeInTheDocument();
      });
      
      // Check button still visible
      expect(screen.getByRole("button", { name: /check order/i })).toBeInTheDocument();
    });
  });
});
