import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { Badge } from "../Badge"

describe("Badge", () => {
  it("renders children text", () => {
    render(<Badge>Beginner</Badge>)
    expect(screen.getByText("Beginner")).toBeInTheDocument()
  })

  it("renders with default variant styling", () => {
    render(<Badge>Default</Badge>)
    const badge = screen.getByText("Default")
    expect(badge.tagName).toBe("SPAN")
  })

  it("renders with beginner variant", () => {
    render(<Badge variant="beginner">Easy</Badge>)
    expect(screen.getByText("Easy")).toBeInTheDocument()
  })

  it("renders with intermediate variant", () => {
    render(<Badge variant="intermediate">Medium</Badge>)
    expect(screen.getByText("Medium")).toBeInTheDocument()
  })

  it("renders with advanced variant", () => {
    render(<Badge variant="advanced">Hard</Badge>)
    expect(screen.getByText("Hard")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    render(<Badge className="custom-class">Custom</Badge>)
    const badge = screen.getByText("Custom")
    expect(badge).toHaveClass("custom-class")
  })
})
