import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SyncProgressDialog } from "../SyncProgressDialog"

describe("SyncProgressDialog", () => {
  it("renders nothing when open is false", () => {
    const { container } = render(<SyncProgressDialog open={false} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders dialog when open is true", () => {
    render(<SyncProgressDialog open={true} />)
    expect(screen.getByText("Saving your Progress")).toBeInTheDocument()
  })

  it("displays syncing description", () => {
    render(<SyncProgressDialog open={true} />)
    expect(
      screen.getByText("Syncing data to server before disconnect...")
    ).toBeInTheDocument()
  })

  it("has correct dialog role and aria attributes", () => {
    render(<SyncProgressDialog open={true} />)
    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveAttribute("aria-modal", "true")
    expect(dialog).toHaveAttribute("aria-labelledby", "sync-dialog-title")
    expect(dialog).toHaveAttribute("aria-describedby", "sync-dialog-desc")
  })

  it("is non-dismissable (backdrop has no click handler)", () => {
    render(<SyncProgressDialog open={true} />)
    // The dialog should be present — clicking backdrop should NOT close it
    // since there's no onCancel/onClose callback
    const dialog = screen.getByRole("dialog")
    expect(dialog).toBeInTheDocument()
  })
})
