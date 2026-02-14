import { beforeEach, describe, expect, it, vi } from "vitest"
import {
    getAllMissions,
    getMission,
    getMissionsByIndustry,
    getMissionsByRank,
    getMissionSlugs,
    getStageConfig,
} from "../loader"
import type { BriefingConfig, Mission } from "../types"

// Mock fs and path modules
vi.mock("fs", () => ({
  default: {
    readdirSync: vi.fn(),
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}))

vi.mock("path", () => ({
  default: {
    join: vi.fn((...args) => args.join("/")),
  },
}))

describe("Mission Loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getMissionSlugs", () => {
    it("returns array of mission directory names", async () => {
      const fs = await import("fs")
      vi.mocked(fs.default.readdirSync).mockReturnValue([
        { name: "financial-pipeline", isDirectory: () => true } as any,
        { name: "healthcare-analytics", isDirectory: () => true } as any,
        { name: "README.md", isDirectory: () => false } as any,
      ])

      const slugs = getMissionSlugs()

      expect(slugs).toEqual(["financial-pipeline", "healthcare-analytics"])
    })

    it("returns empty array when no missions exist", async () => {
      const fs = await import("fs")
      vi.mocked(fs.default.readdirSync).mockReturnValue([])

      const slugs = getMissionSlugs()

      expect(slugs).toEqual([])
    })

    it("filters out non-directory entries", async () => {
      const fs = await import("fs")
      vi.mocked(fs.default.readdirSync).mockReturnValue([
        { name: "mission-1", isDirectory: () => true } as any,
        { name: "file.txt", isDirectory: () => false } as any,
        { name: ".DS_Store", isDirectory: () => false } as any,
      ])

      const slugs = getMissionSlugs()

      expect(slugs).toEqual(["mission-1"])
    })
  })

  describe("getMission", () => {
    it("loads and parses mission.json", async () => {
      const fs = await import("fs")
      const mockMission: Mission = {
        id: "financial-pipeline",
        title: "Financial Data Pipeline",
        subtitle: "Build a real-time trading pipeline",
        description: "Learn to process high-frequency trading data",
        industry: "finance",
        rank: "B",
        xpRequired: 0,
        xpReward: 500,
        estimatedMinutes: 90,
        primaryFeatures: ["Delta Lake", "Streaming"],
        prerequisites: [],
        databricksEnabled: false,
        stages: [
          {
            id: "stage-1",
            title: "Briefing",
            type: "briefing",
            configFile: "stages/01-briefing.json",
            xpReward: 50,
            estimatedMinutes: 10,
          },
        ],
        sideQuests: [],
        achievements: ["first-blood"],
      }

      vi.mocked(fs.default.existsSync).mockReturnValue(true)
      vi.mocked(fs.default.readFileSync).mockReturnValue(
        JSON.stringify(mockMission),
      )

      const mission = await getMission("financial-pipeline")

      expect(mission).toEqual(mockMission)
    })

    it("throws error for non-existent mission", async () => {
      const fs = await import("fs")
      vi.mocked(fs.default.existsSync).mockReturnValue(false)

      await expect(getMission("non-existent")).rejects.toThrow()
    })

    it("throws error for invalid JSON", async () => {
      const fs = await import("fs")
      vi.mocked(fs.default.existsSync).mockReturnValue(true)
      vi.mocked(fs.default.readFileSync).mockReturnValue("invalid json{{{")

      await expect(getMission("invalid-mission")).rejects.toThrow()
    })

    it("throws error for mission failing validation", async () => {
      const fs = await import("fs")
      const invalidMission = {
        id: "test",
        // Missing required fields
      }

      vi.mocked(fs.default.existsSync).mockReturnValue(true)
      vi.mocked(fs.default.readFileSync).mockReturnValue(
        JSON.stringify(invalidMission),
      )

      await expect(getMission("test")).rejects.toThrow()
    })
  })

  describe("getAllMissions", () => {
    it("loads all missions from content directory", async () => {
      const fs = await import("fs")

      // Mock directory listing
      vi.mocked(fs.default.readdirSync).mockReturnValue([
        { name: "mission-1", isDirectory: () => true } as any,
        { name: "mission-2", isDirectory: () => true } as any,
      ])

      // Mock mission files
      vi.mocked(fs.default.existsSync).mockReturnValue(true)
      vi.mocked(fs.default.readFileSync)
        .mockReturnValueOnce(
          JSON.stringify({
            id: "mission-1",
            title: "Mission 1",
            subtitle: "Subtitle 1",
            description: "Description 1",
            industry: "finance",
            rank: "B",
            xpRequired: 0,
            xpReward: 500,
            estimatedMinutes: 90,
            primaryFeatures: [],
            prerequisites: [],
            stages: [
              {
                id: "stage-1",
                title: "Stage 1",
                type: "briefing",
                configFile: "stages/01.json",
                xpReward: 50,
                estimatedMinutes: 10,
              },
            ],
            sideQuests: [],
            achievements: [],
          }),
        )
        .mockReturnValueOnce(
          JSON.stringify({
            id: "mission-2",
            title: "Mission 2",
            subtitle: "Subtitle 2",
            description: "Description 2",
            industry: "healthcare",
            rank: "A",
            xpRequired: 500,
            xpReward: 800,
            estimatedMinutes: 120,
            primaryFeatures: [],
            prerequisites: [],
            stages: [
              {
                id: "stage-1",
                title: "Stage 1",
                type: "briefing",
                configFile: "stages/01.json",
                xpReward: 50,
                estimatedMinutes: 10,
              },
            ],
            sideQuests: [],
            achievements: [],
          }),
        )

      const missions = await getAllMissions()

      expect(missions).toHaveLength(2)
      expect(missions[0].id).toBe("mission-1")
      expect(missions[1].id).toBe("mission-2")
    })

    it("sorts missions by industry then rank", async () => {
      const fs = await import("fs")

      vi.mocked(fs.default.readdirSync).mockReturnValue([
        { name: "m1", isDirectory: () => true } as any,
        { name: "m2", isDirectory: () => true } as any,
        { name: "m3", isDirectory: () => true } as any,
      ])

      vi.mocked(fs.default.existsSync).mockReturnValue(true)
      vi.mocked(fs.default.readFileSync)
        .mockReturnValueOnce(
          JSON.stringify({
            id: "m1",
            title: "M1",
            subtitle: "S",
            description: "D",
            industry: "healthcare",
            rank: "B",
            xpRequired: 0,
            xpReward: 500,
            estimatedMinutes: 90,
            primaryFeatures: [],
            prerequisites: [],
            stages: [
              {
                id: "s1",
                title: "S1",
                type: "briefing",
                configFile: "s.json",
                xpReward: 50,
                estimatedMinutes: 10,
              },
            ],
            sideQuests: [],
            achievements: [],
          }),
        )
        .mockReturnValueOnce(
          JSON.stringify({
            id: "m2",
            title: "M2",
            subtitle: "S",
            description: "D",
            industry: "finance",
            rank: "S",
            xpRequired: 0,
            xpReward: 500,
            estimatedMinutes: 90,
            primaryFeatures: [],
            prerequisites: [],
            stages: [
              {
                id: "s1",
                title: "S1",
                type: "briefing",
                configFile: "s.json",
                xpReward: 50,
                estimatedMinutes: 10,
              },
            ],
            sideQuests: [],
            achievements: [],
          }),
        )
        .mockReturnValueOnce(
          JSON.stringify({
            id: "m3",
            title: "M3",
            subtitle: "S",
            description: "D",
            industry: "finance",
            rank: "B",
            xpRequired: 0,
            xpReward: 500,
            estimatedMinutes: 90,
            primaryFeatures: [],
            prerequisites: [],
            stages: [
              {
                id: "s1",
                title: "S1",
                type: "briefing",
                configFile: "s.json",
                xpReward: 50,
                estimatedMinutes: 10,
              },
            ],
            sideQuests: [],
            achievements: [],
          }),
        )

      const missions = await getAllMissions()

      // Should be sorted: finance-B, finance-S, healthcare-B
      expect(missions[0].id).toBe("m3")
      expect(missions[1].id).toBe("m2")
      expect(missions[2].id).toBe("m1")
    })

    it("returns empty array when no missions exist", async () => {
      const fs = await import("fs")
      vi.mocked(fs.default.readdirSync).mockReturnValue([])

      const missions = await getAllMissions()

      expect(missions).toEqual([])
    })
  })

  describe("getMissionsByIndustry", () => {
    it("filters missions by industry", async () => {
      const fs = await import("fs")

      vi.mocked(fs.default.readdirSync).mockReturnValue([
        { name: "m1", isDirectory: () => true } as any,
        { name: "m2", isDirectory: () => true } as any,
      ])

      vi.mocked(fs.default.existsSync).mockReturnValue(true)
      vi.mocked(fs.default.readFileSync)
        .mockReturnValueOnce(
          JSON.stringify({
            id: "m1",
            title: "M1",
            subtitle: "S",
            description: "D",
            industry: "finance",
            rank: "B",
            xpRequired: 0,
            xpReward: 500,
            estimatedMinutes: 90,
            primaryFeatures: [],
            prerequisites: [],
            stages: [
              {
                id: "s1",
                title: "S1",
                type: "briefing",
                configFile: "s.json",
                xpReward: 50,
                estimatedMinutes: 10,
              },
            ],
            sideQuests: [],
            achievements: [],
          }),
        )
        .mockReturnValueOnce(
          JSON.stringify({
            id: "m2",
            title: "M2",
            subtitle: "S",
            description: "D",
            industry: "healthcare",
            rank: "A",
            xpRequired: 0,
            xpReward: 500,
            estimatedMinutes: 90,
            primaryFeatures: [],
            prerequisites: [],
            stages: [
              {
                id: "s1",
                title: "S1",
                type: "briefing",
                configFile: "s.json",
                xpReward: 50,
                estimatedMinutes: 10,
              },
            ],
            sideQuests: [],
            achievements: [],
          }),
        )

      const missions = await getMissionsByIndustry("finance")

      expect(missions).toHaveLength(1)
      expect(missions[0].industry).toBe("finance")
    })

    it("returns empty array when no missions match industry", async () => {
      const fs = await import("fs")
      vi.mocked(fs.default.readdirSync).mockReturnValue([])

      const missions = await getMissionsByIndustry("retail")

      expect(missions).toEqual([])
    })
  })

  describe("getMissionsByRank", () => {
    it("filters missions by rank", async () => {
      const fs = await import("fs")

      vi.mocked(fs.default.readdirSync).mockReturnValue([
        { name: "m1", isDirectory: () => true } as any,
        { name: "m2", isDirectory: () => true } as any,
      ])

      vi.mocked(fs.default.existsSync).mockReturnValue(true)
      vi.mocked(fs.default.readFileSync)
        .mockReturnValueOnce(
          JSON.stringify({
            id: "m1",
            title: "M1",
            subtitle: "S",
            description: "D",
            industry: "finance",
            rank: "B",
            xpRequired: 0,
            xpReward: 500,
            estimatedMinutes: 90,
            primaryFeatures: [],
            prerequisites: [],
            stages: [
              {
                id: "s1",
                title: "S1",
                type: "briefing",
                configFile: "s.json",
                xpReward: 50,
                estimatedMinutes: 10,
              },
            ],
            sideQuests: [],
            achievements: [],
          }),
        )
        .mockReturnValueOnce(
          JSON.stringify({
            id: "m2",
            title: "M2",
            subtitle: "S",
            description: "D",
            industry: "healthcare",
            rank: "S",
            xpRequired: 0,
            xpReward: 500,
            estimatedMinutes: 90,
            primaryFeatures: [],
            prerequisites: [],
            stages: [
              {
                id: "s1",
                title: "S1",
                type: "briefing",
                configFile: "s.json",
                xpReward: 50,
                estimatedMinutes: 10,
              },
            ],
            sideQuests: [],
            achievements: [],
          }),
        )

      const missions = await getMissionsByRank("S")

      expect(missions).toHaveLength(1)
      expect(missions[0].rank).toBe("S")
    })
  })

  describe("getStageConfig", () => {
    it("loads and parses stage config file", async () => {
      const fs = await import("fs")
      const mockConfig: BriefingConfig = {
        narrative: "You've been tasked with...",
        objective: "Build a pipeline",
        learningGoals: ["Goal 1", "Goal 2"],
      }

      vi.mocked(fs.default.existsSync).mockReturnValue(true)
      vi.mocked(fs.default.readFileSync).mockReturnValue(
        JSON.stringify(mockConfig),
      )

      const config = await getStageConfig<BriefingConfig>(
        "mission-1",
        "stages/01-briefing.json",
      )

      expect(config).toEqual(mockConfig)
    })

    it("throws error for non-existent config", async () => {
      const fs = await import("fs")
      vi.mocked(fs.default.existsSync).mockReturnValue(false)

      await expect(
        getStageConfig("mission-1", "non-existent.json"),
      ).rejects.toThrow()
    })

    it("throws error for invalid JSON", async () => {
      const fs = await import("fs")
      vi.mocked(fs.default.existsSync).mockReturnValue(true)
      vi.mocked(fs.default.readFileSync).mockReturnValue("invalid{{{")

      await expect(getStageConfig("mission-1", "invalid.json")).rejects.toThrow()
    })
  })
})
