import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const {
  mockGetMission,
  mockGetStageConfig,
  mockBuildQuizWithRecall,
  mockLoadRecallPool,
  mockNotFound,
} = vi.hoisted(() => ({
  mockGetMission: vi.fn(),
  mockGetStageConfig: vi.fn(),
  mockBuildQuizWithRecall: vi.fn(),
  mockLoadRecallPool: vi.fn(),
  mockNotFound: vi.fn(),
}))

vi.mock("@/lib/missions", () => ({
  getMission: (...args: unknown[]) => mockGetMission(...args),
  getStageConfig: (...args: unknown[]) => mockGetStageConfig(...args),
}))

vi.mock("@/lib/missions/quizRecall", () => ({
  buildQuizWithRecall: (...args: unknown[]) => mockBuildQuizWithRecall(...args),
  loadRecallPool: (...args: unknown[]) => mockLoadRecallPool(...args),
}))

vi.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
}))

const capturedStagePlayerProps: unknown[] = []

vi.mock("@/components/missions/StagePlayerClient", () => ({
  StagePlayerClient: (props: unknown) => {
    capturedStagePlayerProps.push(props)
    return null
  },
}))

import StagePage from "../page"

describe("Stage page prop wiring", () => {
  it("passes stage and mission reward context to StagePlayerClient", async () => {
    vi.clearAllMocks()
    capturedStagePlayerProps.length = 0

    const mission = {
      id: "test-mission",
      title: "Test Mission",
      description: "desc",
      estimatedMinutes: 20,
      rank: "B",
      sideQuests: [],
      stages: [
        {
          id: "stage-1",
          type: "drag-drop",
          configFile: "stages/01.json",
          xpReward: 120,
        },
      ],
      xpReward: 500,
    }

    mockGetMission.mockResolvedValue(mission)
    mockGetStageConfig.mockResolvedValue({ description: "config" })

    const element = await StagePage({
      params: Promise.resolve({ id: "test-mission", stageId: "stage-1" }),
    })

    render(element)

    expect(capturedStagePlayerProps).toHaveLength(1)
    const props = capturedStagePlayerProps[0] as {
      stageXpReward: number
      isFinalStage: boolean
      missionXpReward: number
    }

    expect(props.stageXpReward).toBe(120)
    expect(props.isFinalStage).toBe(true)
    expect(props.missionXpReward).toBe(500)
    expect(mockNotFound).not.toHaveBeenCalled()
  })
})
