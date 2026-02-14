import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Callout } from "../Callout"

describe("Callout", () => {
  it("renders children content", () => {
    render(<Callout>This is important info</Callout>)
    expect(screen.getByText("This is important info")).toBeInTheDocument()
  })

  it("renders with a title", () => {
    render(<Callout title="Note">Content here</Callout>)
    expect(screen.getByText("Note")).toBeInTheDocument()
    expect(screen.getByText("Content here")).toBeInTheDocument()
  })

  it("has the note role for accessibility", () => {
    render(<Callout>Accessible content</Callout>)
    expect(screen.getByRole("note")).toBeInTheDocument()
  })

  it("renders different callout types", () => {
    const { rerender } = render(<Callout type="warning">Warning!</Callout>)
    expect(screen.getByRole("note")).toBeInTheDocument()

    rerender(<Callout type="tip">Pro tip!</Callout>)
    expect(screen.getByText("Pro tip!")).toBeInTheDocument()

    rerender(<Callout type="important">Critical info</Callout>)
    expect(screen.getByText("Critical info")).toBeInTheDocument()
  })
})
