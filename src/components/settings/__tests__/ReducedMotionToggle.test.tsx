import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, beforeEach } from "vitest"
import { ReducedMotionToggle } from "../ReducedMotionToggle"

describe("ReducedMotionToggle", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute("data-reduce-motion")
  })

  it("renders three radio-like options", () => {
    render(<ReducedMotionToggle />)
    expect(screen.getByLabelText(/match system/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/reduce motion/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/full motion/i)).toBeInTheDocument()
  })

  it("reflects stored 'reduce' preference on mount", async () => {
    localStorage.setItem("reduceMotion", "true")
    render(<ReducedMotionToggle />)
    // Wait for hydration effect to set state
    const reduceRadio = await screen.findByLabelText(/reduce motion/i)
    expect((reduceRadio as HTMLInputElement).checked).toBe(true)
  })

  it("updates localStorage and html attribute when 'reduce' is selected", () => {
    render(<ReducedMotionToggle />)
    const reduceRadio = screen.getByLabelText(/reduce motion/i) as HTMLInputElement
    fireEvent.click(reduceRadio)
    expect(localStorage.getItem("reduceMotion")).toBe("true")
    expect(document.documentElement.getAttribute("data-reduce-motion")).toBe("true")
  })

  it("removes the data attribute when 'match system' is selected", () => {
    localStorage.setItem("reduceMotion", "true")
    document.documentElement.setAttribute("data-reduce-motion", "true")
    render(<ReducedMotionToggle />)
    const systemRadio = screen.getByLabelText(/match system/i) as HTMLInputElement
    fireEvent.click(systemRadio)
    expect(localStorage.getItem("reduceMotion")).toBeNull()
    expect(document.documentElement.getAttribute("data-reduce-motion")).toBeNull()
  })
})
