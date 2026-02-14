/**
 * Challenge Library
 *
 * Standalone challenges for drilling specific Databricks skills.
 * Categories: pyspark, sql, delta-lake, streaming, mlflow, unity-catalog, architecture
 */

// Types
export type {
    Challenge, ChallengeBlank, ChallengeCategory, ChallengeCodeBlock, ChallengeDifficulty,
    ChallengeFormat, ChallengeResult, DragDropChallengeData,
    FillBlankChallengeData,
    FreeTextChallengeData, ValidationResult
} from "./types"

// Zod Schemas
export {
    ChallengeBlankSchema, ChallengeCategorySchema, ChallengeCodeBlockSchema, ChallengeDifficultySchema,
    ChallengeFormatSchema, ChallengeSchema, DragDropChallengeDataSchema,
    FillBlankChallengeDataSchema,
    FreeTextChallengeDataSchema
} from "./types"

// Loader functions
export {
    getAllChallenges, getChallenge, getChallengesByCategory, validateChallengeResponse
} from "./loader"

