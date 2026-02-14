/**
 * Mission System
 * 
 * Story-driven missions across 10 industries following the full pedagogical loop:
 * Briefing (WHY) → Diagram (WHERE/WHAT) → Code Challenges (HOW) 
 * → Quiz (RECALL) → Debrief (REFLECT)
 */

// Types
export type {
    Blank, BriefingConfig, CodeBlock, CompareConfig, DebriefConfig, DiagramComponent, DiagramConfig, DragDropConfig, DropZone, FillBlankConfig,
    FreeTextConfig, FurtherReading, Industry, Mission, MissionRank, Placement, QuizConfig, QuizQuestion, SideQuest, Stage, StageType
} from "./types"

// Zod Schemas
export {
    BlankSchema, BriefingConfigSchema, CodeBlockSchema, CompareConfigSchema, DebriefConfigSchema, DiagramComponentSchema, DiagramConfigSchema, DragDropConfigSchema, DropZoneSchema, FillBlankConfigSchema,
    FreeTextConfigSchema, FurtherReadingSchema, IndustrySchema,
    MissionRankSchema, MissionSchema, PlacementSchema, QuizConfigSchema, QuizQuestionSchema, SideQuestSchema, StageSchema, StageTypeSchema
} from "./types"

// Loader functions
export {
    getAllMissions, getMission, getMissionSlugs, getMissionsByIndustry,
    getMissionsByRank,
    getStageConfig
} from "./loader"

// Track system
export { MISSION_TRACK_MAP, TRACKS, getAllTracks, getTrackForMission } from "./tracks"
export type { Track, TrackInfo } from "./tracks"

// Quiz recall reinforcement
export { buildQuizWithRecall, loadRecallPool } from "./quizRecall"

