import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/missions", () => ({
  getAllMissions: vi.fn(),
}))

vi.mock("@/lib/challenges", () => ({
  getAllChallenges: vi.fn(),
}))

vi.mock("fs", () => ({
  default: {
    readdirSync: vi.fn(),
    statSync: vi.fn(),
    readFileSync: vi.fn(),
  },
  readdirSync: vi.fn(),
  statSync: vi.fn(),
  readFileSync: vi.fn(),
}))

vi.mock("path", () => ({
  default: {
    join: vi.fn((...parts: string[]) => parts.join("/")),
  },
  join: vi.fn((...parts: string[]) => parts.join("/")),
}))

describe("app sitemap", () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com"

    const fs = await import("fs")

    const mockDirents = [
      { name: "mission.json", isDirectory: () => false },
      { name: "extra.mdx", isDirectory: () => false },
    ]

    vi.mocked(fs.default.readdirSync).mockImplementation((dirPath: unknown) => {
      const normalized = String(dirPath)
      if (normalized.includes("/src/content/missions/")) {
        return mockDirents as never
      }
      if (normalized.includes("/src/content/challenges/sql")) {
        return ["sql-challenge.json"] as never
      }
      return [] as never
    })

    vi.mocked(fs.default.statSync).mockImplementation((filePath: unknown) => {
      const normalized = String(filePath)

      if (normalized.includes("mission-alpha")) {
        return { mtime: new Date("2024-03-10T12:00:00.000Z") } as never
      }
      if (normalized.includes("mission-beta")) {
        return { mtime: new Date("2024-02-20T08:30:00.000Z") } as never
      }
      if (normalized.includes("sql-challenge.json")) {
        return { mtime: new Date("2024-03-15T09:15:00.000Z") } as never
      }

      return { mtime: new Date("2024-01-01T00:00:00.000Z") } as never
    })

    vi.mocked(fs.default.readFileSync).mockImplementation((filePath: unknown) => {
      const normalized = String(filePath)
      if (normalized.includes("sql-challenge.json")) {
        return JSON.stringify({ id: "challenge-123" })
      }
      return "{}"
    })
  })

  it("includes dynamic mission and challenge pages", async () => {
    const { getAllMissions } = await import("@/lib/missions")
    const { getAllChallenges } = await import("@/lib/challenges")

    vi.mocked(getAllMissions).mockResolvedValue([
      {
        id: "mission-alpha",
      } as never,
    ])
    vi.mocked(getAllChallenges).mockResolvedValue([
      {
        id: "challenge-123",
      } as never,
    ])

    const { default: sitemap } = await import("../sitemap")
    const entries = await sitemap()

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: "https://example.com/missions/mission-alpha" }),
        expect.objectContaining({ url: "https://example.com/challenges/challenge-123" }),
      ]),
    )
  })

  it("uses content-derived lastModified for dynamic entries", async () => {
    const { getAllMissions } = await import("@/lib/missions")
    const { getAllChallenges } = await import("@/lib/challenges")

    vi.mocked(getAllMissions).mockResolvedValue([
      { id: "mission-alpha" } as never,
      { id: "mission-beta" } as never,
    ])
    vi.mocked(getAllChallenges).mockResolvedValue([
      { id: "challenge-123", category: "sql" } as never,
    ])

    const { default: sitemap } = await import("../sitemap")
    const entries = await sitemap()

    const missionAlpha = entries.find((entry) => entry.url.endsWith("/missions/mission-alpha"))
    const missionBeta = entries.find((entry) => entry.url.endsWith("/missions/mission-beta"))
    const challenge = entries.find((entry) => entry.url.endsWith("/challenges/challenge-123"))

    expect(missionAlpha?.lastModified).toEqual(new Date("2024-03-10T12:00:00.000Z"))
    expect(missionBeta?.lastModified).toEqual(new Date("2024-02-20T08:30:00.000Z"))
    expect(challenge?.lastModified).toEqual(new Date("2024-03-15T09:15:00.000Z"))
  })
})
