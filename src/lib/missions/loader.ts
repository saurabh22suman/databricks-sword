import fs from "fs"
import path from "path"
import type { BriefingConfig, DebriefConfig, FurtherReading, Industry, Mission, MissionRank } from "./types"
import { MissionSchema } from "./types"

/**
 * Mission Loader
 * 
 * Auto-discovery and loading of mission content from src/content/missions/.
 * Validates all mission data with Zod schemas.
 */

/**
 * Base path to mission content directory.
 */
const MISSIONS_DIR = path.join(process.cwd(), "src", "content", "missions")

/**
 * Rank sort order for missions.
 */
const RANK_ORDER: Record<MissionRank, number> = {
  B: 1,
  A: 2,
  S: 3,
}

type MissionCacheEntry = {
  expiresAt: number
  missions: Mission[]
}

const MISSION_CACHE_TTL_MS = 30_000
let missionCache: MissionCacheEntry | null = null
const isTestRuntime = process.env.NODE_ENV === "test"

/**
 * Discovers all mission slugs from the content directory.
 * 
 * @returns Array of mission directory names (slugs)
 * 
 * @example
 * ```ts
 * const slugs = getMissionSlugs()
 * // ['financial-pipeline', 'healthcare-analytics', ...]
 * ```
 */
export function getMissionSlugs(): string[] {
  try {
    const entries = fs.readdirSync(MISSIONS_DIR, { withFileTypes: true })
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  } catch (error) {
    // Directory doesn't exist yet
    return []
  }
}

/**
 * Loads a single mission by slug.
 * 
 * @param slug - Mission directory name
 * @returns Parsed and validated Mission object
 * @throws Error if mission doesn't exist or validation fails
 * 
 * @example
 * ```ts
 * const mission = await getMission('financial-pipeline')
 * console.log(mission.title) // 'Financial Data Pipeline'
 * ```
 */
export async function getMission(slug: string): Promise<Mission> {
  const missionPath = path.join(MISSIONS_DIR, slug, "mission.json")

  if (!fs.existsSync(missionPath)) {
    throw new Error(`Mission not found: ${slug}`)
  }

  try {
    const fileContent = fs.readFileSync(missionPath, "utf-8")
    const parsed = JSON.parse(fileContent)
    const validated = MissionSchema.parse(parsed)

    return validated
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in mission ${slug}: ${error.message}`)
    }
    throw error
  }
}

/**
 * Loads all missions from the content directory.
 * Sorts by industry (alphabetically) then by rank (B → A → S).
 * 
 * @returns Array of all missions
 * 
 * @example
 * ```ts
 * const missions = await getAllMissions()
 * // Sorted: finance-B, finance-A, finance-S, healthcare-B, ...
 * ```
 */
export async function getAllMissions(): Promise<Mission[]> {
  if (!isTestRuntime && missionCache && missionCache.expiresAt > Date.now()) {
    return missionCache.missions
  }

  const slugs = getMissionSlugs()
  const missions: Mission[] = []

  for (const slug of slugs) {
    try {
      const mission = await getMission(slug)
      missions.push(mission)
    } catch (error) {
      console.error(`Failed to load mission ${slug}:`, error)
      // Skip invalid missions
    }
  }

  // Sort by industry, then by rank
  missions.sort((a, b) => {
    if (a.industry !== b.industry) {
      return a.industry.localeCompare(b.industry)
    }
    return RANK_ORDER[a.rank] - RANK_ORDER[b.rank]
  })

  if (!isTestRuntime) {
    missionCache = {
      expiresAt: Date.now() + MISSION_CACHE_TTL_MS,
      missions,
    }
  }

  return missions
}

/**
 * Clears the in-memory mission cache.
 */
export function clearMissionCache(): void {
  missionCache = null
}

/**
 * Filters missions by industry.
 * 
 * @param industry - Industry to filter by
 * @returns Missions matching the industry
 * 
 * @example
 * ```ts
 * const financeMissions = await getMissionsByIndustry('finance')
 * ```
 */
export async function getMissionsByIndustry(
  industry: Industry,
): Promise<Mission[]> {
  const allMissions = await getAllMissions()
  return allMissions.filter((mission) => mission.industry === industry)
}

/**
 * Filters missions by rank.
 * 
 * @param rank - Rank to filter by (B, A, or S)
 * @returns Missions matching the rank
 * 
 * @example
 * ```ts
 * const beginnerMissions = await getMissionsByRank('B')
 * ```
 */
export async function getMissionsByRank(rank: MissionRank): Promise<Mission[]> {
  const allMissions = await getAllMissions()
  return allMissions.filter((mission) => mission.rank === rank)
}

/**
 * Splits MDX content into sections by ## headings.
 *
 * @param content - Raw MDX file content
 * @returns Map of lowercase heading text to section body
 */
function splitMdxSections(content: string): Map<string, string> {
  const sections = new Map<string, string>()
  // Strip frontmatter if present
  let body = content.replace(/^---[\s\S]*?---\s*/, "")
  // Strip h1 title line
  body = body.replace(/^#\s+[^\n]+\n+/, "")

  const parts = body.split(/^## /m)
  for (const part of parts) {
    const newlineIndex = part.indexOf("\n")
    if (newlineIndex === -1) continue
    const heading = part.slice(0, newlineIndex).trim().toLowerCase()
    const text = part.slice(newlineIndex + 1).trim()
    if (heading) {
      sections.set(heading, text)
    }
  }
  return sections
}

/**
 * Extracts numbered/bulleted list items from markdown text.
 *
 * @param text - Markdown text with list items
 * @returns Array of cleaned list item strings
 */
function extractListItems(text: string): string[] {
  const items: string[] = []
  const lines = text.split("\n")
  for (const line of lines) {
    const match = line.match(/^\s*(?:\d+[\.\)]\s*|\*\s+|-\s+)\*{0,2}(.+?)\*{0,2}\s*$/)
    if (match) {
      items.push(match[1].replace(/\*{1,2}/g, "").trim())
    }
  }
  return items
}

/**
 * Cleans markdown formatting from text (bold, links, code).
 *
 * @param text - Raw markdown text
 * @returns Plain text with markdown stripped
 */
function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/`(.+?)`/g, "$1") // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/^>\s*/gm, "") // blockquotes
    .replace(/^---\s*$/gm, "") // hr
    .trim()
}

/**
 * Joins section content into a single narrative string.
 * Picks appropriate sections based on known heading patterns.
 * Deduplicates sections that match multiple keywords.
 *
 * @param sections - Map of heading to body
 * @param headings - Headings to include (lowercase)
 * @returns Combined text
 */
function pickSections(sections: Map<string, string>, headings: string[]): string {
  const parts: string[] = []
  const usedKeys = new Set<string>()
  for (const h of headings) {
    for (const [key, value] of sections) {
      if (key.includes(h) && !usedKeys.has(key)) {
        usedKeys.add(key)
        parts.push(cleanMarkdown(value))
        break
      }
    }
  }
  return parts.join("\n\n")
}

/**
 * Parses a briefing MDX file into a BriefingConfig.
 *
 * Handles three known heading patterns:
 * - Format 1: The Situation / The Opportunity / Your Mission / Success Criteria
 * - Format 2: Situation Report / Your Mission / Objectives / Key Intelligence
 * - Format 3: SITUATION REPORT / INTELLIGENCE BRIEFING / MISSION OBJECTIVES
 *
 * @param mdxContent - Raw MDX file content
 * @returns Structured BriefingConfig
 */
function parseBriefingFromMdx(mdxContent: string): BriefingConfig {
  const sections = splitMdxSections(mdxContent)

  // Build narrative from situation sections
  const narrative = pickSections(sections, [
    "the situation", "situation report", "situation",
    "the opportunity", "opportunity",
    "intelligence briefing", "key intelligence",
    "the stakes", "stakes",
  ]) || "Complete the mission briefing to understand your objectives."

  // Objective
  const objective = pickSections(sections, [
    "your mission", "mission objectives",
  ]) || "Complete all mission stages to earn XP and unlock achievements."

  // Learning goals from objectives/criteria sections
  let learningGoals: string[] = []
  const criteriaKeys = ["success criteria", "objectives", "mission objectives"]
  for (const key of criteriaKeys) {
    for (const [sKey, sValue] of sections) {
      if (sKey.includes(key)) {
        learningGoals = extractListItems(sValue)
        if (learningGoals.length > 0) break
      }
    }
    if (learningGoals.length > 0) break
  }

  // Fallback: extract goals from objective text if it has numbered items
  if (learningGoals.length === 0) {
    learningGoals = extractListItems(objective)
  }

  // Final fallback
  if (learningGoals.length === 0) {
    learningGoals = ["Complete all mission stages"]
  }

  return {
    narrative,
    objective: objective.split("\n")[0] || objective, // First paragraph as objective summary
    learningGoals,
  }
}

/**
 * Extracts links from markdown text as FurtherReading entries.
 *
 * @param text - Markdown text potentially containing links
 * @returns Array of { title, url } objects
 */
function extractLinks(text: string): FurtherReading[] {
  const links: FurtherReading[] = []
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
  let match: RegExpExecArray | null
  while ((match = linkRegex.exec(text)) !== null) {
    links.push({ title: match[1], url: match[2] })
  }
  // Also match bare URLs with labels like "**Title:** URL"
  const bareUrlRegex = /\*{0,2}([^*\n:]+?):\*{0,2}\s*(https?:\/\/\S+)/g
  while ((match = bareUrlRegex.exec(text)) !== null) {
    // Avoid duplicates
    if (!links.some((l) => l.url === match![2])) {
      links.push({ title: match[1].trim(), url: match[2].trim() })
    }
  }
  return links
}

/**
 * Parses a debrief MDX file into a DebriefConfig.
 *
 * @param mdxContent - Raw MDX file content
 * @returns Structured DebriefConfig
 */
function parseDebriefFromMdx(mdxContent: string): DebriefConfig {
  const sections = splitMdxSections(mdxContent)

  // Summary from first section
  const summary = pickSections(sections, [
    "what you accomplished", "results summary",
    "mission complete",
  ]) || "You have successfully completed this mission."

  // Industry context
  const industryContext = pickSections(sections, [
    "industry context", "real-world impact", "impact assessment",
    "the technology",
  ]) || "The skills you practiced are widely used across the data engineering industry."

  // Alternative approach / what's next
  const alternativeApproach = pickSections(sections, [
    "what's next", "next steps",
    "what you learned", "key takeaways", "skills acquired",
  ]) || "Continue exploring related missions to deepen your understanding."

  // Further reading links
  let furtherReading: FurtherReading[] = []
  for (const [key, value] of sections) {
    if (key.includes("further reading") || key.includes("resources")) {
      furtherReading = extractLinks(value)
      break
    }
  }
  // Fallback: scan entire content for links
  if (furtherReading.length === 0) {
    furtherReading = extractLinks(mdxContent).slice(0, 5)
  }
  // Final fallback
  if (furtherReading.length === 0) {
    furtherReading = [
      { title: "Databricks Documentation", url: "https://docs.databricks.com/" },
      { title: "Delta Lake Docs", url: "https://docs.delta.io/" },
    ]
  }

  return {
    summary,
    industryContext,
    alternativeApproach,
    furtherReading,
  }
}

/**
 * Loads a stage config file for a mission.
 * 
 * @param missionSlug - Mission directory name
 * @param configPath - Relative path to config file (e.g., 'stages/01-briefing.json')
 * @returns Parsed stage config (type depends on stage type)
 * @throws Error if config doesn't exist or is invalid JSON
 * 
 * @example
 * ```ts
 * const briefingConfig = await getStageConfig<BriefingConfig>(
 *   'financial-pipeline',
 *   'stages/01-briefing.json'
 * )
 * ```
 */
export async function getStageConfig<T>(
  missionSlug: string,
  configPath: string,
): Promise<T> {
  if (!configPath || configPath.trim() === "") {
    throw new Error(`Empty configFile path for mission: ${missionSlug}`)
  }

  const fullPath = path.join(MISSIONS_DIR, missionSlug, configPath)

  // Guard against directory reads (EISDIR)
  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    throw new Error(`Stage config not found: ${missionSlug}/${configPath}`)
  }

  try {
    const fileContent = fs.readFileSync(fullPath, "utf-8")
    const parsed = JSON.parse(fileContent)

    // Handle mdxContent reference pattern for briefing/debrief stages
    if (parsed.mdxContent && typeof parsed.mdxContent === "string") {
      const mdxPath = path.join(MISSIONS_DIR, missionSlug, parsed.mdxContent)
      if (fs.existsSync(mdxPath)) {
        const mdxContent = fs.readFileSync(mdxPath, "utf-8")

        // Determine stage type from config path
        if (configPath.includes("briefing")) {
          return parseBriefingFromMdx(mdxContent) as T
        }
        if (configPath.includes("debrief")) {
          return parseDebriefFromMdx(mdxContent) as T
        }
      }
    }

    return parsed as T
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${missionSlug}/${configPath}: ${error.message}`)
    }
    throw error
  }
}
