import { getAllChallenges } from "@/lib/challenges"
import { getAllMissions } from "@/lib/missions"
import fs from "fs"
import type { MetadataRoute } from "next"
import path from "path"

const DEFAULT_DYNAMIC_LAST_MODIFIED = new Date("2024-01-01T00:00:00.000Z")
const MISSIONS_DIR = path.join(process.cwd(), "src", "content", "missions")
const CHALLENGES_DIR = path.join(process.cwd(), "src", "content", "challenges")

function getLatestMtimeFromDirectory(directoryPath: string): Date | null {
  try {
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true })
    let latestMtimeMs = 0

    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name)

      if (entry.isDirectory()) {
        const nestedLatest = getLatestMtimeFromDirectory(entryPath)
        if (nestedLatest) {
          latestMtimeMs = Math.max(latestMtimeMs, nestedLatest.getTime())
        }
        continue
      }

      const mtimeMs = fs.statSync(entryPath).mtime.getTime()
      latestMtimeMs = Math.max(latestMtimeMs, mtimeMs)
    }

    return latestMtimeMs > 0 ? new Date(latestMtimeMs) : null
  } catch {
    return null
  }
}

function getMissionLastModified(missionId: string): Date {
  const missionDir = path.join(MISSIONS_DIR, missionId)
  return getLatestMtimeFromDirectory(missionDir) ?? DEFAULT_DYNAMIC_LAST_MODIFIED
}

function getChallengeLastModified(category: string, challengeId: string): Date {
  const categoryDir = path.join(CHALLENGES_DIR, category)

  try {
    const files = fs.readdirSync(categoryDir)

    for (const file of files) {
      if (!file.endsWith(".json")) continue

      const filePath = path.join(categoryDir, file)
      const fileContent = fs.readFileSync(filePath, "utf-8")
      const parsed = JSON.parse(fileContent) as { id?: string }

      if (parsed.id === challengeId) {
        return fs.statSync(filePath).mtime
      }
    }
  } catch {
    // Fall through to default timestamp
  }

  return DEFAULT_DYNAMIC_LAST_MODIFIED
}

/**
 * Generates sitemap for Databricks Sword.
 * Automatically includes all missions and challenges.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://databricks-sword.com"

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/missions`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/challenges`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/daily`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/profile`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/review`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/intel`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/updates`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/use-cases`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/playground`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/learn`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ]

  // Dynamic mission pages
  const missions = await getAllMissions()
  const missionPages: MetadataRoute.Sitemap = missions.map((mission) => ({
    url: `${baseUrl}/missions/${mission.id}`,
    lastModified: getMissionLastModified(mission.id),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  // Dynamic challenge pages
  const challenges = await getAllChallenges()
  const challengePages: MetadataRoute.Sitemap = challenges.map((challenge) => ({
    url: `${baseUrl}/challenges/${challenge.id}`,
    lastModified: getChallengeLastModified(challenge.category, challenge.id),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))

  return [...staticPages, ...missionPages, ...challengePages]
}
