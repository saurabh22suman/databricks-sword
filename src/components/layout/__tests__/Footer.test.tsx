import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Footer } from "../Footer"

// Mock next/link
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

describe("Footer", () => {
  it("renders the site name", () => {
    render(<Footer />)
    expect(screen.getByText("SWORD")).toBeInTheDocument()
  })

  it("renders the tagline", () => {
    render(<Footer />)
    expect(
      screen.getByText(/next-gen lakehouse training simulation/i),
    ).toBeInTheDocument()
  })

  it("renders Sector 01 section heading", () => {
    render(<Footer />)
    expect(screen.getByText("Sector 01")).toBeInTheDocument()
  })

  it("renders System section heading", () => {
    render(<Footer />)
    expect(screen.getByText("System")).toBeInTheDocument()
  })

  it("renders sector navigation links", () => {
    render(<Footer />)
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "href",
      "/#projects",
    )
    // Note: There are two "Intel" links - one in Sector 01 (anchor) and one in System (full page)
    const intelLinks = screen.getAllByRole("link", { name: "Intel" })
    expect(intelLinks[0]).toHaveAttribute("href", "/#interview-prep")
  })

  it("renders system navigation links", () => {
    render(<Footer />)
    expect(screen.getByRole("link", { name: "Missions" })).toHaveAttribute(
      "href",
      "/missions",
    )
    // Note: There are two "Intel" links - one in Sector 01 (anchor) and one in System (full page)
    const intelLinks = screen.getAllByRole("link", { name: "Intel" })
    expect(intelLinks[1]).toHaveAttribute("href", "/intel")
  })

  it("renders copyright text with current year", () => {
    render(<Footer />)
    const year = new Date().getFullYear()
    expect(
      screen.getByText(new RegExp(`${year}.*DATABRICKS SWORD`)),
    ).toBeInTheDocument()
  })
})
