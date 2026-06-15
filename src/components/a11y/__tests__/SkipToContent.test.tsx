import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { SkipToContent } from "../SkipToContent"

describe("SkipToContent", () => {
  it("renders a link to the main content", () => {
    render(
      <>
        <SkipToContent />
        <main id="main-content" tabIndex={-1} />
      </>
    )
    const link = screen.getByText(/skip to main content/i)
    expect(link).toHaveAttribute("href", "#main-content")
  })

  it("is screen-reader-only by default but becomes visible on focus", () => {
    render(
      <>
        <SkipToContent />
        <main id="main-content" tabIndex={-1} />
      </>
    )
    const link = screen.getByText(/skip to main content/i)
    expect(link.className).toContain("sr-only")
    expect(link.className).toContain("focus:not-sr-only")
  })
})
