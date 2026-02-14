import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { StagePlayerClient } from "../StagePlayerClient"

// Mock useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// Mock mission components - intercept ArchitectureDiagram
vi.mock("@/components/missions", async () => {
  const actual = await vi.importActual("@/components/missions")
  return {
    ...actual,
    ArchitectureDiagram: ({
      config,
      onComplete,
    }: {
      config: unknown
      onComplete: () => void
    }) => (
      <div data-testid="architecture-diagram">
        Architecture Diagram Component
        <button onClick={onComplete}>Complete Diagram</button>
      </div>
    ),
    DatabricksStagePlayer: ({
      missionSlug,
      stageId,
      bundleStatus,
    }: {
      missionSlug: string
      stageId: string
      bundleStatus: string
    }) => (
      <div data-testid="databricks-stage-player">
        Databricks Mode: {missionSlug} / {stageId} / {bundleStatus}
      </div>
    ),
  }
})

describe("StagePlayerClient — Diagram Stage", () => {
  const diagramConfig = {
    components: [
      { id: "comp1", label: "Bronze Layer", icon: "database" },
      { id: "comp2", label: "Silver Layer", icon: "table" },
    ],
    dropZones: [
      { id: "zone1", label: "Layer 1", position: { x: 100, y: 100 } },
      { id: "zone2", label: "Layer 2", position: { x: 300, y: 100 } },
    ],
    correctPlacements: [
      { componentId: "comp1", zoneId: "zone1" },
      { componentId: "comp2", zoneId: "zone2" },
    ],
  }

  it("renders ArchitectureDiagram component for diagram stage type", () => {
    render(
      <StagePlayerClient
        stageType="diagram"
        config={diagramConfig}
        nextUrl="/missions/test/stage/03"
        missionId="test-mission"
        stageId="02-diagram"
      />,
    )

    expect(screen.getByTestId("architecture-diagram")).toBeInTheDocument()
    expect(screen.getByText("Architecture Diagram Component")).toBeInTheDocument()
  })

  it("does not render a stub placeholder for diagram stages", () => {
    render(
      <StagePlayerClient
        stageType="diagram"
        config={diagramConfig}
        nextUrl="/missions/test/stage/03"
        missionId="test-mission"
        stageId="02-diagram"
      />,
    )

    expect(screen.queryByText("This stage type is not yet implemented")).not.toBeInTheDocument()
    expect(screen.queryByText("Skip to Next Stage")).not.toBeInTheDocument()
  })
})
