import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { ResumeMissionCard } from "../ResumeMissionCard"
import { initializeSandbox, saveSandbox, updateSandbox } from "@/lib/sandbox"

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe("ResumeMissionCard", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("renders nothing when no in-progress mission exists", async () => {
    const { container } = render(<ResumeMissionCard />)
    await new Promise((r) => setTimeout(r, 0))
    expect(container.firstChild).toBeNull()
  })

  it("renders the resume card when an in-progress mission exists", async () => {
    // Seed a fully-valid sandbox via initializeSandbox + updateSandbox so the
    // save -> load -> zod validate path is exercised end-to-end.
    const seeded = initializeSandbox()
    saveSandbox(seeded)
    updateSandbox((data) => ({
      ...data,
      missionProgress: {
        ...data.missionProgress,
        "lakehouse-fundamentals": {
          started: true,
          completed: false,
          stageProgress: {
            "01-briefing": {
              completed: true,
              completedAt: "2026-06-14T10:00:00Z",
              xpEarned: 50,
              codeAttempts: [],
              hintsUsed: 0,
            },
            "02-diagram": {
              completed: false,
              xpEarned: 0,
              codeAttempts: [],
              hintsUsed: 0,
            },
          },
          sideQuestsCompleted: [],
          totalXpEarned: 50,
        },
      },
    }))
    render(<ResumeMissionCard />)
    const card = await screen.findByTestId("resume-mission-card")
    expect(card).toBeInTheDocument()
    expect(screen.getByText(/continue mission/i)).toBeInTheDocument()
    expect(screen.getByText(/Lakehouse Fundamentals/i)).toBeInTheDocument()
    expect(screen.getByText(/Stage 2 of 2/i)).toBeInTheDocument()
  })
})
