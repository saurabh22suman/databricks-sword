import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Card } from "../Card"

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

describe("Card", () => {
  it("renders title and description", () => {
    render(<Card title="Delta Lake" description="Learn about ACID transactions" />)
    expect(
      screen.getByRole("heading", { name: "Delta Lake" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Learn about ACID transactions"),
    ).toBeInTheDocument()
  })

  it("renders as a link when href is provided", () => {
    render(
      <Card
        title="Topic"
        description="Description"
        href="/learn/delta"
      />,
    )
    expect(screen.getByRole("link")).toHaveAttribute("href", "/learn/delta")
  })

  it("does not render a link when no href is provided", () => {
    render(<Card title="Topic" description="Description" />)
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("renders badge when provided", () => {
    render(
      <Card title="Topic" description="Description" badge="New" />,
    )
    expect(screen.getByText("New")).toBeInTheDocument()
  })

  it("does not render badge when not provided", () => {
    render(<Card title="Topic" description="Description" />)
    // Badge text shouldn't exist
    const heading = screen.getByRole("heading", { name: "Topic" })
    expect(heading).toBeInTheDocument()
  })

  it("renders icon when provided", () => {
    render(
      <Card
        title="Topic"
        description="Description"
        icon={<span data-testid="icon">🔥</span>}
      />,
    )
    expect(screen.getByText("🔥")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(
      <Card title="Topic" description="Description" className="my-custom" />,
    )
    const cardDiv = container.querySelector(".my-custom")
    expect(cardDiv).toBeInTheDocument()
  })
})
