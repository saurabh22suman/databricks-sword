import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { DeployConfirmDialog } from "../DeployConfirmDialog"

describe("DeployConfirmDialog", () => {
  const defaultProps = {
    isOpen: true,
    industryName: "Lakehouse Fundamentals",
    estimatedCost: "$0.50",
    estimatedTime: "3-8 min",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  it("renders nothing when closed", () => {
    render(<DeployConfirmDialog {...defaultProps} isOpen={false} />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("renders confirmation details when open", () => {
    render(<DeployConfirmDialog {...defaultProps} />)
    expect(screen.getByText(/lakehouse fundamentals/i)).toBeInTheDocument()
    expect(screen.getByText(/\$0\.50/)).toBeInTheDocument()
    expect(screen.getByText(/3-8 min/)).toBeInTheDocument()
    expect(screen.getByText(/cleanup/i)).toBeInTheDocument()
  })

  it("calls onConfirm when confirm button clicked", () => {
    const onConfirm = vi.fn()
    render(<DeployConfirmDialog {...defaultProps} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole("button", { name: /confirm deploy/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("calls onCancel when cancel button clicked", () => {
    const onCancel = vi.fn()
    render(<DeployConfirmDialog {...defaultProps} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("calls onCancel when Escape key is pressed", () => {
    const onCancel = vi.fn()
    render(<DeployConfirmDialog {...defaultProps} onCancel={onCancel} />)
    fireEvent.keyDown(document, { key: "Escape" })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
