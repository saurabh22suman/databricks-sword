import { authenticateApiRequest } from "@/lib/auth/api-auth";
import { decryptPat, evaluateMission, type EvaluationQuery } from "@/lib/databricks";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/** Only allow safe slug characters — prevents path traversal and command injection */
const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

const evaluateRequestSchema = z.object({
  missionSlug: z.string().min(1).regex(SAFE_SLUG, "Invalid mission slug format"),
  stageId: z.string().min(1, "stageId is required"),
  warehouseId: z.string().optional(),
});

// Define the shape of stage config that includes evaluation queries
type StageConfigWithQueries = {
  evaluationQueries?: EvaluationQuery[];
};

/**
 * POST /api/databricks/evaluate
 * Evaluates a mission stage against the user's Databricks workspace.
 * UserId is derived from the authenticated session — not from request body.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate via session — prevents IDOR
    const authResult = await authenticateApiRequest();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { userId } = authResult;

    const body = await request.json();
    const parsed = evaluateRequestSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { missionSlug, stageId, warehouseId } = parsed.data;

    // Get user's connection from database
    let connection;
    try {
      const { getDb, databricksConnections } = await import("@/lib/db");
      const { eq } = await import("drizzle-orm");

      const connections = await getDb()
        .select()
        .from(databricksConnections)
        .where(eq(databricksConnections.userId, userId));

      connection = connections[0];
    } catch {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    if (!connection) {
      return NextResponse.json(
        { error: "No Databricks connection found for user" },
        { status: 404 }
      );
    }

    // Get stage config with evaluation queries
    let evaluationQueries: EvaluationQuery[] | undefined;
    try {
      const { getStageConfig } = await import("@/lib/missions");
      const stageConfig = await getStageConfig(missionSlug, stageId) as StageConfigWithQueries | null;
      evaluationQueries = stageConfig?.evaluationQueries;
    } catch {
      return NextResponse.json(
        { error: "Failed to load stage configuration" },
        { status: 500 }
      );
    }

    if (!evaluationQueries || evaluationQueries.length === 0) {
      return NextResponse.json(
        { error: "No evaluation queries defined for this stage" },
        { status: 400 }
      );
    }

    // Decrypt the PAT
    const pat = decryptPat(connection.encryptedPat);

    // Evaluate the mission
    const results = await evaluateMission(
      connection.workspaceUrl,
      pat,
      evaluationQueries,
      warehouseId
    );

    const allPassed = results.every((r) => r.passed);

    return NextResponse.json({
      results,
      allPassed,
      evaluatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api/databricks/evaluate]", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
