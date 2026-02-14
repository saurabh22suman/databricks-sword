/**
 * @file CompareChallenge.test.tsx
 * @description Tests for CompareChallenge component
 */

import type { CompareConfig } from "@/lib/missions";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CompareChallenge } from "../CompareChallenge";

const mockConfig: CompareConfig = {
  description: "Compare batch vs streaming approaches for data processing.",
  solution1: {
    title: "Batch Processing",
    code: 'df = spark.read.parquet("/data")\nresult = df.groupBy("key").count()',
    output: "+---+-----+\n|key|count|\n+---+-----+\n|  A|  100|\n+---+-----+",
    explanation:
      "Batch processing reads all data at once and computes aggregations on the full dataset.",
  },
  solution2: {
    title: "Streaming Processing",
    code: 'df = spark.readStream.format("delta").load("/data")\nresult = df.groupBy("key").count()',
    output:
      "Streaming query started\nBatch 0: 50 rows\nBatch 1: 50 rows\nTotal: 100 rows",
    explanation:
      "Streaming processes data incrementally as it arrives, computing aggregations per micro-batch.",
  },
  comparisonPoints: [
    "Batch reads all data at once; streaming processes incrementally",
    "Batch has higher latency; streaming provides near real-time results",
    "Streaming uses checkpointing for fault tolerance",
  ],
};

describe("CompareChallenge", () => {
  it("renders the description", () => {
    render(<CompareChallenge config={mockConfig} onComplete={vi.fn()} />);
    expect(
      screen.getByText(/Compare batch vs streaming approaches/),
    ).toBeInTheDocument();
  });

  it("renders both solution titles", () => {
    render(<CompareChallenge config={mockConfig} onComplete={vi.fn()} />);
    // Batch Processing appears in tab button + heading
    expect(screen.getAllByText("Batch Processing").length).toBeGreaterThanOrEqual(1);
    // Streaming Processing appears in tab button
    expect(screen.getByRole("button", { name: "Streaming Processing" })).toBeInTheDocument();
  });

  it("renders code blocks for both solutions via tabs", async () => {
    const user = userEvent.setup();
    render(<CompareChallenge config={mockConfig} onComplete={vi.fn()} />);
    // Solution 1 visible by default
    expect(screen.getByText(/spark\.read\.parquet/)).toBeInTheDocument();

    // Switch to solution 2
    await user.click(screen.getByRole("button", { name: "Streaming Processing" }));
    expect(screen.getByText(/spark\.readStream/)).toBeInTheDocument();
  });

  it("renders comparison points", () => {
    render(<CompareChallenge config={mockConfig} onComplete={vi.fn()} />);
    expect(
      screen.getByText(/Batch reads all data at once/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Streaming uses checkpointing/),
    ).toBeInTheDocument();
  });

  it("renders explanations for both solutions via tabs", async () => {
    const user = userEvent.setup();
    render(<CompareChallenge config={mockConfig} onComplete={vi.fn()} />);
    // Solution 1 explanation visible by default
    expect(
      screen.getByText(/reads all data at once and computes/),
    ).toBeInTheDocument();

    // Switch to solution 2
    await user.click(screen.getByRole("button", { name: "Streaming Processing" }));
    expect(
      screen.getByText(/processes data incrementally/),
    ).toBeInTheDocument();
  });

  it("calls onComplete when user clicks continue", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<CompareChallenge config={mockConfig} onComplete={onComplete} />);

    const button = screen.getByRole("button", { name: /continue/i });
    await user.click(button);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
