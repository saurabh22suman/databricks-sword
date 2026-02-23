import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode
    href: string
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: async () => [],
        }),
      }),
    }),
  })),
  faqItems: {
    status: "status",
    displayOrder: "displayOrder",
  },
}))

const mockGetAllChallenges = vi.fn()
vi.mock("@/lib/challenges", () => ({
  getAllChallenges: () => mockGetAllChallenges(),
}))

describe("IntelPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows runtime baseline warning when required challenge categories are missing", async () => {
    mockGetAllChallenges.mockResolvedValue([
      {
        id: "ps-1",
        title: "PySpark Challenge",
        category: "pyspark",
        difficulty: "B",
        format: "drag-drop",
        description: "desc",
        hints: ["hint"],
        xpReward: 10,
        optimalSolution: "solution",
        explanation: "explanation",
        dragDrop: {
          blocks: [
            { id: "b1", code: "line 1" },
            { id: "b2", code: "line 2" },
          ],
          correctOrder: ["b1", "b2"],
        },
      },
    ])

    const { default: IntelPage } = await import("@/app/intel/page")
    render(await IntelPage())

    expect(screen.getByText("Intel/Challenge alignment warning")).toBeInTheDocument()
    expect(screen.getByText(/Missing challenge coverage for baseline Intel topics/)).toBeInTheDocument()
  })

  it("renders Intel category CTAs with challenge category query for baseline topics", async () => {
    mockGetAllChallenges.mockResolvedValue([
      {
        id: "dl-1",
        title: "Delta Challenge",
        category: "delta-lake",
        difficulty: "B",
        format: "drag-drop",
        description: "desc",
        hints: ["hint"],
        xpReward: 10,
        optimalSolution: "solution",
        explanation: "explanation",
        dragDrop: {
          blocks: [
            { id: "b1", code: "line 1" },
            { id: "b2", code: "line 2" },
          ],
          correctOrder: ["b1", "b2"],
        },
      },
      {
        id: "ps-1",
        title: "PySpark Challenge",
        category: "pyspark",
        difficulty: "B",
        format: "drag-drop",
        description: "desc",
        hints: ["hint"],
        xpReward: 10,
        optimalSolution: "solution",
        explanation: "explanation",
        dragDrop: {
          blocks: [
            { id: "b1", code: "line 1" },
            { id: "b2", code: "line 2" },
          ],
          correctOrder: ["b1", "b2"],
        },
      },
      {
        id: "sql-1",
        title: "SQL Challenge",
        category: "sql",
        difficulty: "B",
        format: "drag-drop",
        description: "desc",
        hints: ["hint"],
        xpReward: 10,
        optimalSolution: "solution",
        explanation: "explanation",
        dragDrop: {
          blocks: [
            { id: "b1", code: "line 1" },
            { id: "b2", code: "line 2" },
          ],
          correctOrder: ["b1", "b2"],
        },
      },
      {
        id: "ml-1",
        title: "MLflow Challenge",
        category: "mlflow",
        difficulty: "B",
        format: "drag-drop",
        description: "desc",
        hints: ["hint"],
        xpReward: 10,
        optimalSolution: "solution",
        explanation: "explanation",
        dragDrop: {
          blocks: [
            { id: "b1", code: "line 1" },
            { id: "b2", code: "line 2" },
          ],
          correctOrder: ["b1", "b2"],
        },
      },
      {
        id: "arch-1",
        title: "Architecture Challenge",
        category: "architecture",
        difficulty: "B",
        format: "drag-drop",
        description: "desc",
        hints: ["hint"],
        xpReward: 10,
        optimalSolution: "solution",
        explanation: "explanation",
        dragDrop: {
          blocks: [
            { id: "b1", code: "line 1" },
            { id: "b2", code: "line 2" },
          ],
          correctOrder: ["b1", "b2"],
        },
      },
    ])

    const { default: IntelPage } = await import("@/app/intel/page")
    render(await IntelPage())

    expect(
      screen.getByRole("link", { name: /Execute Delta Lake challenges/i }),
    ).toHaveAttribute("href", "/challenges?category=delta-lake")
    expect(
      screen.getByRole("link", { name: /Execute PySpark challenges/i }),
    ).toHaveAttribute("href", "/challenges?category=pyspark")
    expect(
      screen.getByRole("link", { name: /Execute SQL & Analytics challenges/i }),
    ).toHaveAttribute("href", "/challenges?category=sql")
    expect(
      screen.getByRole("link", { name: /Execute MLflow & MLOps challenges/i }),
    ).toHaveAttribute("href", "/challenges?category=mlflow")
    expect(
      screen.getByRole("link", { name: /Execute Architecture challenges/i }),
    ).toHaveAttribute("href", "/challenges?category=architecture")

    expect(
      screen.getByRole("link", { name: /Execute General Databricks challenges/i }),
    ).toHaveAttribute("href", "/challenges")
  })
})
