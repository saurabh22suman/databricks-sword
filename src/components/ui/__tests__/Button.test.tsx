import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Button } from "../Button"

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

describe("Button", () => {
  it("renders children text", () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument()
  })

  it("renders as a button element by default", () => {
    render(<Button>Submit</Button>)
    expect(screen.getByRole("button", { name: "Submit" }).tagName).toBe(
      "BUTTON",
    )
  })

  it("renders as a link when href is provided", () => {
    render(<Button href="/learn">Start</Button>)
    expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute(
      "href",
      "/learn",
    )
  })

  it("is disabled when disabled prop is set", () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled()
  })

  it("applies custom className", () => {
    render(<Button className="my-class">Styled</Button>)
    expect(screen.getByRole("button", { name: "Styled" })).toHaveClass(
      "my-class",
    )
  })

  it("renders with small size", () => {
    render(<Button size="sm">Small</Button>)
    expect(screen.getByRole("button", { name: "Small" })).toBeInTheDocument()
  })

  it("renders with large size", () => {
    render(<Button size="lg">Large</Button>)
    expect(screen.getByRole("button", { name: "Large" })).toBeInTheDocument()
  })

  it("renders with secondary variant", () => {
    render(<Button variant="secondary">Secondary</Button>)
    expect(
      screen.getByRole("button", { name: "Secondary" }),
    ).toBeInTheDocument()
  })

  it("renders with ghost variant", () => {
    render(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole("button", { name: "Ghost" })).toBeInTheDocument()
  })
})
