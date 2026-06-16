import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MissionStatusCard } from "../MissionStatusCard"
import { initializeSandbox, updateSandbox } from "@/lib/sandbox"

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe("MissionStatusCard", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("shows the empty state when no in-progress mission exists", async () => {
    render(<MissionStatusCard />)
    await waitFor(() => {
      expect(screen.getByTestId("no-mission-empty-state")).toBeInTheDocument()
    })
  })

  it("shows the resume card when an in-progress mission exists", async () => {
    initializeSandbox()
    updateSandbox((data) => ({
      ...data,
      missionProgress: {
        ...data.missionProgress,
        "sql-essentials": {
          started: true,
          completed: false,
          stageProgress: {
            "01-intro": {
              completed: true,
              completedAt: "2026-06-14T10:00:00Z",
              xpEarned: 50,
              codeAttempts: [],
              hintsUsed: 0,
            },
            "02-select": {
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
    render(<MissionStatusCard />)
    await waitFor(() => {
      expect(screen.getByTestId("resume-mission-card")).toBeInTheDocument()
    })
  })

  it("shows the all-complete state when every started mission is finished", async () => {
    initializeSandbox()
    updateSandbox((data) => ({
      ...data,
      missionProgress: {
        ...data.missionProgress,
        "sql-essentials": {
          started: true,
          completed: true,
          stageProgress: {},
          sideQuestsCompleted: [],
          totalXpEarned: 100,
        },
        "pyspark-intro": {
          started: true,
          completed: true,
          stageProgress: {},
          sideQuestsCompleted: [],
          totalXpEarned: 150,
        },
      },
    }))
    render(<MissionStatusCard />)
    await waitFor(() => {
      expect(screen.getByTestId("all-missions-complete-state")).toBeInTheDocument()
    })
    expect(screen.queryByTestId("no-mission-empty-state")).not.toBeInTheDocument()
  })
})
