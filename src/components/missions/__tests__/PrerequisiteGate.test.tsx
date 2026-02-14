/**
 * @file PrerequisiteGate.test.tsx
 * @description Tests for PrerequisiteGate component - enforces mission prerequisites
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PrerequisiteGate } from "../PrerequisiteGate"

// Mock checkPrerequisites
vi.mock("@/lib/missions/prerequisites", () => ({
  checkPrerequisites: vi.fn(),
}))

// Mock getMission
vi.mock("@/lib/missions/loader", () => ({
  getMission: vi.fn(),
}))

import { getMission } from "@/lib/missions/loader"
import { checkPrerequisites } from "@/lib/missions/prerequisites"
import type { Mission } from "@/lib/missions/types"

const mockMission: Mission = {
  id: "test-mission",
  title: "Test Mission",
  subtitle: "Test Subtitle",
  description: "Test Description",
  industry: "finance",
  rank: "B",
  xpRequired: 100,
  xpReward: 200,
  estimatedMinutes: 60,
  primaryFeatures: [],
  prerequisites: ["prereq-1", "prereq-2"],
  databricksEnabled: false,
  stages: [],
  sideQuests: [],
  achievements: [],
}

describe("PrerequisiteGate", () => {
  describe("Prerequisites Met", () => {
    it("renders children when all prerequisites are met", async () => {
      vi.mocked(getMission).mockResolvedValue(mockMission)
      vi.mocked(checkPrerequisites).mockResolvedValue({
        met: true,
        missing: [],
      })

      const { container } = render(
        await PrerequisiteGate({
          missionId: "test-mission",
          completedMissions: ["prereq-1", "prereq-2"],
          children: <div data-testid="mission-content">Mission Content</div>,
        }),
      )

      expect(screen.getByTestId("mission-content")).toBeInTheDocument()
      expect(screen.queryByText(/prerequisites required/i)).not.toBeInTheDocument()
    })

    it("renders children when mission has no prerequisites", async () => {
      const noPrerequMission: Mission = {
        ...mockMission,
        prerequisites: [],
      }

      vi.mocked(getMission).mockResolvedValue(noPrerequMission)
      vi.mocked(checkPrerequisites).mockResolvedValue({
        met: true,
        missing: [],
      })

      const { container } = render(
        await PrerequisiteGate({
          missionId: "test-mission",
          completedMissions: [],
          children: <div data-testid="mission-content">Mission Content</div>,
        }),
      )

      expect(screen.getByTestId("mission-content")).toBeInTheDocument()
    })
  })

  describe("Prerequisites Not Met", () => {
    it("shows locked screen when prerequisites are not met", async () => {
      vi.mocked(getMission).mockResolvedValue(mockMission)
      vi.mocked(checkPrerequisites).mockResolvedValue({
        met: false,
        missing: ["prereq-1", "prereq-2"],
      })

      const { container } = render(
        await PrerequisiteGate({
          missionId: "test-mission",
          completedMissions: [],
          children: <div data-testid="mission-content">Mission Content</div>,
        }),
      )

      expect(screen.getByText(/prerequisites required/i)).toBeInTheDocument()
      expect(screen.queryByTestId("mission-content")).not.toBeInTheDocument()
    })

    it("displays list of missing prerequisites", async () => {
      vi.mocked(getMission).mockResolvedValue(mockMission)
      vi.mocked(checkPrerequisites).mockResolvedValue({
        met: false,
        missing: ["prereq-1", "prereq-2"],
      })

      const { container } = render(
        await PrerequisiteGate({
          missionId: "test-mission",
          completedMissions: [],
          children: <div data-testid="mission-content">Mission Content</div>,
        }),
      )

      // Should show the prerequisite mission IDs
      expect(screen.getByText(/prereq-1/i)).toBeInTheDocument()
      expect(screen.getByText(/prereq-2/i)).toBeInTheDocument()
    })

    it("shows lock icon when prerequisites not met", async () => {
      vi.mocked(getMission).mockResolvedValue(mockMission)
      vi.mocked(checkPrerequisites).mockResolvedValue({
        met: false,
        missing: ["prereq-1"],
      })

      const { container } = render(
        await PrerequisiteGate({
          missionId: "test-mission",
          completedMissions: [],
          children: <div data-testid="mission-content">Mission Content</div>,
        }),
      )

      // Lock icon should be present (using lucide-react Lock icon)
      const lockIcon = container.querySelector('svg')
      expect(lockIcon).toBeInTheDocument()
    })

    it("links to missing prerequisite missions", async () => {
      vi.mocked(getMission).mockResolvedValue(mockMission)
      vi.mocked(checkPrerequisites).mockResolvedValue({
        met: false,
        missing: ["prereq-1"],
      })

      const { container } = render(
        await PrerequisiteGate({
          missionId: "test-mission",
          completedMissions: [],
          children: <div data-testid="mission-content">Mission Content</div>,
        }),
      )

      const link = screen.getByRole("link", { name: /prereq-1/i })
      expect(link).toHaveAttribute("href", "/missions/prereq-1")
    })
  })
})
