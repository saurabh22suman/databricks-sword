import { z } from "zod"

/**
 * Mission System Types
 * 
 * Types for story-driven missions across 10 industries.
 * Each mission follows the full pedagogical loop:
 * Briefing (WHY) → Diagram (WHERE/WHAT) → Code Challenges (HOW) 
 * → Quiz (RECALL) → Debrief (REFLECT)
 */

/**
 * Industry vertical for mission context.
 */
export type Industry =
  | "finance"
  | "healthcare"
  | "retail"
  | "manufacturing"
  | "media"
  | "public-sector"
  | "energy"
  | "market-research"
  | "cross-industry"
  | "technology"
  | "enterprise"
  | "fintech"
  | "gaming"
  | "logistics"
  | "e-commerce"
  | "government"

export const IndustrySchema = z.enum([
  "finance",
  "healthcare",
  "retail",
  "manufacturing",
  "media",
  "public-sector",
  "energy",
  "market-research",
  "cross-industry",
  "technology",
  "enterprise",
  "fintech",
  "gaming",
  "logistics",
  "e-commerce",
  "government",
])

/**
 * Mission difficulty rank.
 * B = Beginner, A = Intermediate, S = Advanced
 */
export type MissionRank = "B" | "A" | "S"

export const MissionRankSchema = z.enum(["B", "A", "S"])

/**
 * Stage type for different learning formats.
 */
export type StageType =
  | "briefing"
  | "diagram"
  | "drag-drop"
  | "fill-blank"
  | "free-text"
  | "quiz"
  | "compare"
  | "debrief"

export const StageTypeSchema = z.enum([
  "briefing",
  "diagram",
  "drag-drop",
  "fill-blank",
  "free-text",
  "quiz",
  "compare",
  "debrief",
])

/**
 * Stage within a mission.
 */
export type Stage = {
  id: string
  title: string
  type: StageType
  configFile: string // relative path to stage config JSON
  xpReward: number
  estimatedMinutes: number
}

export const StageSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    type: StageTypeSchema,
    configFile: z.string().optional(),
    file: z.string().optional(),
    xpReward: z.number().nonnegative().default(0),
    estimatedMinutes: z.number().positive().default(5),
  })
  .transform((data) => ({
    id: data.id,
    title: data.title,
    type: data.type,
    configFile: data.configFile ?? data.file ?? "",
    xpReward: data.xpReward,
    estimatedMinutes: data.estimatedMinutes,
  }))

/**
 * Side quest for OSS deep dives.
 */
export type SideQuest = {
  id: string
  title: string
  ossProject: string
  trigger: "before" | "after"
  parentStageId: string
  type: StageType
  configFile: string
  xpBonus: number
  optional: boolean
}

export const SideQuestSchema = z.object({
  id: z.string(),
  title: z.string(),
  ossProject: z.string(),
  trigger: z.enum(["before", "after"]),
  parentStageId: z.string(),
  type: StageTypeSchema,
  configFile: z.string(),
  xpBonus: z.number().nonnegative(),
  optional: z.boolean(),
})

/**
 * Complete mission definition.
 */
/**
 * A concept to convert into a flashcard after mission completion.
 */
export type MissionConcept = {
  question: string
  answer: string
  hint?: string
  codeExample?: string
  tags?: string[]
  difficulty?: MissionRank
  type?: 'concept' | 'code' | 'comparison' | 'procedure'
}

export const MissionConceptSchema = z.object({
  question: z.string(),
  answer: z.string(),
  hint: z.string().optional(),
  codeExample: z.string().optional(),
  tags: z.array(z.string()).optional(),
  difficulty: MissionRankSchema.optional(),
  type: z.enum(['concept', 'code', 'comparison', 'procedure']).optional(),
})

export type Mission = {
  id: string
  title: string
  subtitle: string
  description: string
  industry: Industry
  rank: MissionRank
  xpRequired: number
  xpReward: number
  estimatedMinutes: number
  primaryFeatures: string[]
  prerequisites: string[]
  databricksEnabled: boolean
  stages: Stage[]
  sideQuests: SideQuest[]
  achievements: string[]
  /** Concepts that become flashcards after mission completion. */
  concepts?: MissionConcept[]
}

export const MissionSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  description: z.string(),
  industry: IndustrySchema,
  rank: MissionRankSchema,
  xpRequired: z.number().nonnegative(),
  xpReward: z.number().nonnegative(),
  estimatedMinutes: z.number().positive(),
  primaryFeatures: z.array(z.string()),
  prerequisites: z.array(z.string()),
  databricksEnabled: z.boolean().default(false),
  stages: z.array(StageSchema).min(1),
  sideQuests: z.array(SideQuestSchema).default([]),
  achievements: z.array(z.string()).default([]),
  concepts: z.array(MissionConceptSchema).optional(),
})

/**
 * Evaluation query for real Databricks mode.
 * Used to verify the user's work via SQL queries.
 */
export type EvaluationQuery = {
  sql: string
  expectedResult: Record<string, unknown>
  description: string
  tolerance?: number
}

export const EvaluationQuerySchema = z.object({
  sql: z.string(),
  expectedResult: z.any(),
  description: z.string(),
  tolerance: z.number().optional(),
})

/**
 * Briefing stage config.
 */
export type BriefingConfig = {
  narrative: string
  objective: string
  learningGoals: string[]
  industryContext?: {
    domain?: string
    realWorldApplication?: string
    keyStakeholders?: string[]
  }
}

export const BriefingConfigSchema = z.object({
  narrative: z.string(),
  objective: z.string(),
  learningGoals: z.array(z.string()).min(1),
  industryContext: z
    .object({
      domain: z.string().optional(),
      realWorldApplication: z.string().optional(),
      keyStakeholders: z.array(z.string()).optional(),
    })
    .optional(),
})

/**
 * Diagram component for architecture stages.
 */
export type DiagramComponent = {
  id: string
  label: string
  icon: string
}

export const DiagramComponentSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string(),
})

/**
 * Drop zone for diagram placement.
 */
export type DropZone = {
  id: string
  label: string
  position: { x: number; y: number }
}

export const DropZoneSchema = z.object({
  id: z.string(),
  label: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
})

/**
 * Correct placement for diagram validation.
 */
export type Placement = {
  componentId: string
  zoneId: string
}

export const PlacementSchema = z.object({
  componentId: z.string(),
  zoneId: z.string(),
})

/**
 * Diagram stage config.
 */
export type DiagramConfig = {
  components: DiagramComponent[]
  dropZones: DropZone[]
  correctPlacements: Placement[]
  /** Instructions shown at the top of the stage */
  instructions?: string
  /** Learnings shown after correct placement */
  learnings?: string[]
}

export const DiagramConfigSchema = z.object({
  components: z.array(DiagramComponentSchema),
  dropZones: z.array(DropZoneSchema),
  correctPlacements: z.array(PlacementSchema),
  instructions: z.string().optional(),
  learnings: z.array(z.string()).optional(),
})

/**
 * Code block for drag-drop challenges.
 */
export type CodeBlock = {
  id: string
  code: string
  label?: string // optional label for the block
}

export const CodeBlockSchema = z.object({
  id: z.string(),
  code: z.string(),
  label: z.string().optional(),
})

/**
 * Drag-drop stage config.
 */
export type DragDropConfig = {
  description: string
  instructions?: string // guidance on what logical flow to follow
  blocks: CodeBlock[]
  correctOrder: string[] // block IDs in correct order
  hints: string[]
  explanation?: string // optional explanation shown after correct validation
  learnings?: string[] // optional learnings shown after correct validation
  evaluationQueries?: EvaluationQuery[]
}

export const DragDropConfigSchema = z.object({
  description: z.string(),
  instructions: z.string().optional(),
  blocks: z.array(CodeBlockSchema).min(2),
  correctOrder: z.array(z.string()),
  hints: z.array(z.string()),
  explanation: z.string().optional(),
  learnings: z.array(z.string()).optional(),
  evaluationQueries: z.array(z.object({
    sql: z.string(),
    expectedResult: z.any(),
    description: z.string().optional(),
    tolerance: z.number().optional(),
  })).optional(),
})

/**
 * Blank to fill in fill-blank challenges.
 */
export type Blank = {
  id: number
  correctAnswer: string
  options: string[]
}

export const BlankSchema = z.object({
  id: z.number().nonnegative().int(),
  correctAnswer: z.string(),
  options: z.array(z.string()).min(2),
})

/**
 * Fill-blank stage config.
 */
export type FillBlankConfig = {
  description: string
  expectedOutput?: string // describes WHAT the completed code should produce
  codeTemplate: string // with __BLANK_0__, __BLANK_1__, etc.
  blanks: Blank[]
  hints: string[]
  learnings?: string[] // optional learnings shown after correct validation
  evaluationQueries?: EvaluationQuery[]
}

export const FillBlankConfigSchema = z.object({
  description: z.string(),
  expectedOutput: z.string().optional(),
  codeTemplate: z.string(),
  blanks: z.array(BlankSchema).min(1),
  hints: z.array(z.string()),
  learnings: z.array(z.string()).optional(),
  evaluationQueries: z.array(z.object({
    sql: z.string(),
    expectedResult: z.any(),
    description: z.string().optional(),
    tolerance: z.number().optional(),
  })).optional(),
})

/**
 * Free-text stage config.
 */
export type FreeTextConfig = {
  description: string
  starterCode: string
  expectedPattern: string // regex
  simulatedOutput: string
  hints: string[]
  evaluationQueries?: EvaluationQuery[]
}

export const FreeTextConfigSchema = z.object({
  description: z.string(),
  starterCode: z.string(),
  expectedPattern: z.string(),
  simulatedOutput: z.string(),
  hints: z.array(z.string()),
  evaluationQueries: z.array(z.object({
    sql: z.string(),
    expectedResult: z.any(),
    description: z.string().optional(),
    tolerance: z.number().optional(),
  })).optional(),
})

/**
 * Quiz question.
 */
export type QuizQuestion = {
  id: string
  question: string
  options: string[]
  correctAnswer: number // index
  explanation: string
}

export const QuizQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()).min(2),
  correctAnswer: z.number().nonnegative().int(),
  explanation: z.string(),
})

/**
 * Quiz stage config.
 */
export type QuizConfig = {
  questions: QuizQuestion[]
  passingScore: number // percentage
  learnings?: string[] // optional learnings shown after quiz completion
}

export const QuizConfigSchema = z.object({
  questions: z.array(QuizQuestionSchema).min(1),
  passingScore: z.number().min(0).max(100),
  learnings: z.array(z.string()).optional(),
})

/**
 * Further reading link.
 */
export type FurtherReading = {
  title: string
  url: string
}

export const FurtherReadingSchema = z.object({
  title: z.string(),
  url: z.string().url(),
})

/**
 * Debrief stage config.
 */
export type DebriefConfig = {
  summary: string
  industryContext: string
  alternativeApproach: string
  furtherReading: FurtherReading[]
}

export const DebriefConfigSchema = z.object({
  summary: z.string(),
  industryContext: z.string(),
  alternativeApproach: z.string(),
  furtherReading: z.array(FurtherReadingSchema),
})

/**
 * Compare stage config (compare two solutions).
 */
export type CompareConfig = {
  description: string
  solution1: {
    title: string
    code: string
    output: string
    explanation: string
  }
  solution2: {
    title: string
    code: string
    output: string
    explanation: string
  }
  comparisonPoints: string[]
}

export const CompareConfigSchema = z.object({
  description: z.string(),
  solution1: z.object({
    title: z.string(),
    code: z.string(),
    output: z.string(),
    explanation: z.string(),
  }),
  solution2: z.object({
    title: z.string(),
    code: z.string(),
    output: z.string(),
    explanation: z.string(),
  }),
  comparisonPoints: z.array(z.string()),
})
