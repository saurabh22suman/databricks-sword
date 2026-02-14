import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { StagePlayerClient } from "../StagePlayerClient"

// Track router.push calls
const mockPush = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock mission components, capturing SideQuestModal
vi.mock("@/components/missions", async () => {
  const actual = await vi.importActual("@/components/missions")
  return {
    ...actual,
    MissionBriefing: ({
      onStart,
    }: {
      config: unknown
      onStart: () => void
      estimatedMinutes?: number
    }) => (
      <div data-testid="briefing">
        <button onClick={onStart}>Start</button>
      </div>
    ),
    DragDropChallenge: ({
      onComplete,
    }: {
      config: unknown
      onComplete: () => void
    }) => (
      <div data-testid="drag-drop">
        <button onClick={onComplete}>Complete</button>
      </div>
    ),
    ArchitectureDiagram: ({
      onComplete,
    }: {
      config: unknown
      onComplete: () => void
    }) => (
      <div data-testid="architecture-diagram">
        <button onClick={onComplete}>Complete Diagram</button>
      </div>
    ),
    SideQuestModal: ({
      sideQuest,
      isOpen,
      onSkip,
      onComplete,
      onClose,
    }: {
      sideQuest: { id: string; title: string }
      isOpen: boolean
      onSkip: () => void
      onComplete: (xp: number) => void
      onClose: () => void
    }) =>
      isOpen ? (
        <div data-testid="side-quest-modal">
          <span>{sideQuest.title}</span>
          <button onClick={onSkip}>Skip Quest</button>
          <button onClick={() => onComplete(50)}>Complete Quest</button>
        </div>
      ) : null,
    DatabricksStagePlayer: () => <div data-testid="databricks-stage-player" />,
  }
})

describe("StagePlayerClient — Side Quests", () => {
  const briefingConfig = {
    narrative: "Welcome to the mission",
    objective: "Learn and build a data pipeline",
    learningGoals: ["Learn X", "Build Y"],
    industryContext: { domain: "Healthcare", realWorldApplication: "Patient data pipelines" },
  }

  const sideQuestsForMission = [
    {
      id: "delta-lake-oss",
      title: "Delta Lake: The Open Source Engine",
      description: "Explore the open-source Delta Lake engine",
      ossProject: "Delta Lake",
      trigger: "after" as const,
      parentStageId: "01-briefing",
      type: "quiz" as const,
      configFile: "side-quests/delta-lake-oss.json",
      xpBonus: 50,
      optional: true,
      content: {
        questions: [
          {
            id: "q1",
            question: "What is Delta Lake?",
            options: ["A", "B", "C", "D"],
            correctAnswer: 0,
            explanation: "explanation",
          },
        ],
        passingScore: 60,
      },
    },
  ]

  it("shows side quest modal after completing a stage that has a side quest trigger", async () => {
    const user = userEvent.setup()

    render(
      <StagePlayerClient
        stageType="briefing"
        config={briefingConfig}
        nextUrl="/missions/test/stage/02"
        missionId="test-mission"
        stageId="01-briefing"
        sideQuests={sideQuestsForMission}
      />,
    )

    // Complete the stage
    await user.click(screen.getByText("Start"))

    // Side quest modal should appear
    expect(screen.getByTestId("side-quest-modal")).toBeInTheDocument()
    expect(screen.getByText("Delta Lake: The Open Source Engine")).toBeInTheDocument()
  })

  it("navigates to next stage after skipping side quest", async () => {
    const user = userEvent.setup()

    render(
      <StagePlayerClient
        stageType="briefing"
        config={briefingConfig}
        nextUrl="/missions/test/stage/02"
        missionId="test-mission"
        stageId="01-briefing"
        sideQuests={sideQuestsForMission}
      />,
    )

    // Complete stage → side quest appears
    await user.click(screen.getByText("Start"))
    expect(screen.getByTestId("side-quest-modal")).toBeInTheDocument()

    // Skip side quest → navigate to next stage
    await user.click(screen.getByText("Skip Quest"))
    expect(mockPush).toHaveBeenCalledWith("/missions/test/stage/02")
  })

  it("navigates to next stage after completing side quest", async () => {
    const user = userEvent.setup()

    render(
      <StagePlayerClient
        stageType="briefing"
        config={briefingConfig}
        nextUrl="/missions/test/stage/02"
        missionId="test-mission"
        stageId="01-briefing"
        sideQuests={sideQuestsForMission}
      />,
    )

    // Complete stage → side quest appears
    await user.click(screen.getByText("Start"))

    // Complete side quest → navigate to next stage
    await user.click(screen.getByText("Complete Quest"))
    expect(mockPush).toHaveBeenCalledWith("/missions/test/stage/02")
  })

  it("does not show side quest modal when no side quests match current stage", async () => {
    const user = userEvent.setup()

    const unrelatedSideQuests = [
      {
        ...sideQuestsForMission[0],
        parentStageId: "03-quiz", // Different stage
      },
    ]

    render(
      <StagePlayerClient
        stageType="briefing"
        config={briefingConfig}
        nextUrl="/missions/test/stage/02"
        missionId="test-mission"
        stageId="01-briefing"
        sideQuests={unrelatedSideQuests}
      />,
    )

    // Complete stage
    await user.click(screen.getByText("Start"))

    // No side quest modal should appear, should navigate directly
    expect(screen.queryByTestId("side-quest-modal")).not.toBeInTheDocument()
    expect(mockPush).toHaveBeenCalledWith("/missions/test/stage/02")
  })

  it("does not show side quest modal when sideQuests prop is empty", async () => {
    const user = userEvent.setup()

    render(
      <StagePlayerClient
        stageType="briefing"
        config={briefingConfig}
        nextUrl="/missions/test/stage/02"
        missionId="test-mission"
        stageId="01-briefing"
        sideQuests={[]}
      />,
    )

    // Complete stage
    await user.click(screen.getByText("Start"))

    // Should navigate directly
    expect(screen.queryByTestId("side-quest-modal")).not.toBeInTheDocument()
    expect(mockPush).toHaveBeenCalledWith("/missions/test/stage/02")
  })
})
