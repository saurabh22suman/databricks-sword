import fs from "fs/promises"
import path from "path"
import type { Industry, ValidationConfig } from "./types"

type MissionValidationLegacy = {
  checkName?: string
  description?: string
  query?: string
  expectedResult?: "exists" | "count" | "value"
  expectedValue?: string | number
}

type MissionValidationAdvanced = {
  id?: string
  name?: string
  hint?: string
  query?: string
  expected?: string | number
}

type MissionJson = {
  id?: string
  industry?: Industry
  title?: string
  subtitle?: string
  description?: string
  scenario?: string | {
    challenge?: string
    deployment?: string
    industry?: string
  }
  situation?: string
  objectives?: string[]
  dataFiles?: string[]
  notebooks?: string[]
  validations?: Array<MissionValidationLegacy | MissionValidationAdvanced>
  hints?: string[]
  hintsInNotebooks?: boolean
  hintsNote?: string
  xpReward?: number
  estimatedMinutes?: number
}

export type NormalizedFieldOpsContent = {
  id: string
  industry: Industry
  title: string
  subtitle?: string
  description: string
  scenario: string
  objectives: string[]
  dataFiles: string[]
  notebooks: string[]
  validations: ValidationConfig[]
  hints: string[]
  hintsInNotebooks: boolean
  hintsNote?: string
  xpReward?: number
  estimatedMinutes?: number
}

const contentCache = new Map<Industry, NormalizedFieldOpsContent>()

const CHECK_KEY_SEP_REGEX = /[^a-z0-9]+/g

function toCheckKey(input: string): string {
  return input
    .toLowerCase()
    .replace(CHECK_KEY_SEP_REGEX, "_")
    .replace(/^_+|_+$/g, "")
}

function normalizeScenario(
  scenario: MissionJson["scenario"],
  situation: MissionJson["situation"]
): string {
  if (typeof scenario === "string") {
    return situation ? `${scenario}\n\n${situation}` : scenario
  }

  if (scenario && typeof scenario === "object") {
    const parts = [scenario.challenge, scenario.deployment].filter(
      (value): value is string => Boolean(value && value.trim())
    )
    if (parts.length > 0) {
      return parts.join("\n\n")
    }
  }

  return situation ?? ""
}

function normalizeValidations(validations: MissionJson["validations"]): ValidationConfig[] {
  if (!Array.isArray(validations)) {
    return []
  }

  return validations
    .map((validation) => {
      const isAdvanced = "name" in validation || "id" in validation || "expected" in validation

      if (isAdvanced) {
        const advanced = validation as MissionValidationAdvanced
        const checkName = advanced.name?.trim() || advanced.id?.trim() || "Validation"
        const expectedValue = advanced.expected
        return {
          checkKey: toCheckKey(advanced.id?.trim() || checkName),
          checkName,
          description: advanced.hint?.trim() || checkName,
          query: advanced.query?.trim() || "",
          expectedResult: "count" as const,
          expectedValue,
        }
      }

      const legacy = validation as MissionValidationLegacy
      const checkName = legacy.checkName?.trim() || "Validation"
      return {
        checkKey: toCheckKey(checkName),
        checkName,
        description: legacy.description?.trim() || checkName,
        query: legacy.query?.trim() || "",
        expectedResult: legacy.expectedResult || "count",
        expectedValue: legacy.expectedValue,
      }
    })
    .filter((validation) => validation.query.length > 0)
}

function assertContent(content: NormalizedFieldOpsContent, industry: Industry): void {
  if (!content.title) throw new Error(`Missing title for ${industry}`)
  if (!content.description) throw new Error(`Missing description for ${industry}`)
  if (content.validations.length === 0) throw new Error(`No validations found for ${industry}`)
  if (content.objectives.length === 0) throw new Error(`No objectives found for ${industry}`)
}

export async function loadFieldOpsContent(industry: Industry): Promise<NormalizedFieldOpsContent> {
  const cached = contentCache.get(industry)
  if (cached) {
    return cached
  }

  const missionPath = path.join(process.cwd(), "src", "content", "field-ops", industry, "mission.json")
  const raw = await fs.readFile(missionPath, "utf-8")
  const parsed = JSON.parse(raw) as MissionJson

  const normalized: NormalizedFieldOpsContent = {
    id: parsed.id || `${industry}-mission`,
    industry: parsed.industry || industry,
    title: parsed.title || industry,
    subtitle: parsed.subtitle,
    description: parsed.description || "",
    scenario: normalizeScenario(parsed.scenario, parsed.situation),
    objectives: parsed.objectives || [],
    dataFiles: parsed.dataFiles || [],
    notebooks: parsed.notebooks || [],
    validations: normalizeValidations(parsed.validations),
    hints: parsed.hints || [],
    hintsInNotebooks: parsed.hintsInNotebooks ?? false,
    hintsNote: parsed.hintsNote,
    xpReward: parsed.xpReward,
    estimatedMinutes: parsed.estimatedMinutes,
  }

  assertContent(normalized, industry)
  contentCache.set(industry, normalized)

  return normalized
}

export function getCheckKey(input: string): string {
  return toCheckKey(input)
}
