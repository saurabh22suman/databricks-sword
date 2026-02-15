import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { BlogSectionPost } from "../BlogSection"
import { BlogSection } from "../BlogSection"

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ArrowRight: () => <span data-testid="arrow-right" />,
}))

const mockPosts: BlogSectionPost[] = [
  {
    slug: "databricks-free-setup",
    category: "tutorials",
    title: "How to Set Up Databricks Free Edition",
    publishedAt: "2025-01-25",
    readTimeMinutes: 8,
  },
  {
    slug: "delta-lake-essentials",
    category: "deep-dive",
    title: "Delta Lake Essentials",
    publishedAt: "2025-01-20",
    readTimeMinutes: 7,
  },
  {
    slug: "pyspark-optimization-tips",
    category: "tutorials",
    title: "PySpark Performance Tips",
    publishedAt: "2025-01-15",
    readTimeMinutes: 5,
  },
]

describe("BlogSection", () => {
  it("renders the section heading", () => {
    render(<BlogSection posts={mockPosts} />)
    expect(
      screen.getByRole("heading", { name: /system logs/i }),
    ).toBeInTheDocument()
  })

  it("renders post titles", () => {
    render(<BlogSection posts={mockPosts} />)
    expect(
      screen.getByText(/How to Set Up Databricks Free Edition/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Delta Lake Essentials/i),
    ).toBeInTheDocument()
  })

  it("renders clickable links to blog posts", () => {
    render(<BlogSection posts={mockPosts} />)
    const links = screen.getAllByRole("link")
    const blogLinks = links.filter((l) => l.getAttribute("href")?.startsWith("/blog/"))
    expect(blogLinks).toHaveLength(3)
    expect(blogLinks[0]).toHaveAttribute("href", "/blog/databricks-free-setup")
  })

  it("renders the access all logs link", () => {
    render(<BlogSection posts={mockPosts} />)
    const links = screen.getAllByText(/access all logs/i)
    expect(links.length).toBeGreaterThan(0)
  })

  it("renders nothing when posts array is empty", () => {
    const { container } = render(<BlogSection posts={[]} />)
    expect(container.innerHTML).toBe("")
  })

  it("does not contain dark: class variants", () => {
    const { container } = render(<BlogSection posts={mockPosts} />)
    const html = container.innerHTML
    expect(html).not.toContain("dark:")
  })
})
