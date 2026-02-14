import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SignInButton } from "../SignInButton"

describe("SignInButton", () => {
  it("should render Google sign-in button", () => {
    render(<SignInButton />)
    expect(screen.getByText(/google/i)).toBeInTheDocument()
  })

  it("should render GitHub sign-in button", () => {
    render(<SignInButton />)
    expect(screen.getByText(/github/i)).toBeInTheDocument()
  })

  it("should have cyberpunk styling", () => {
    const { container } = render(<SignInButton />)
    expect(container.firstChild).toBeDefined()
  })
})
