import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { BlogSection } from "../BlogSection"

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ArrowRight: () => <span data-testid="arrow-right" />,
}))

describe("BlogSection", () => {
  it("renders the section heading", () => {
    render(<BlogSection />)
    expect(
      screen.getByRole("heading", { name: /system logs/i }),
    ).toBeInTheDocument()
  })

  it("renders featured post titles", () => {
    render(<BlogSection />)
    expect(
      screen.getByText(/How to Set Up Databricks Free Edition/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Medallion Architecture/i),
    ).toBeInTheDocument()
  })

  it("renders the access all logs link", () => {
    render(<BlogSection />)
    const links = screen.getAllByText(/access all logs/i)
    expect(links.length).toBeGreaterThan(0)
  })

  it("does not contain dark: class variants", () => {
    const { container } = render(<BlogSection />)
    const html = container.innerHTML
    expect(html).not.toContain("dark:")
  })
})
