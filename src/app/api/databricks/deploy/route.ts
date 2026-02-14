import { authenticateApiRequest } from "@/lib/auth/api-auth";
import { decryptPat, deployBundle } from "@/lib/databricks";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/** Only allow safe slug characters — prevents path traversal and command injection */
const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

const deployRequestSchema = z.object({
  missionSlug: z.string().min(1).regex(SAFE_SLUG, "Invalid mission slug format"),
});

/**
 * POST /api/databricks/deploy
 * Deploys a Databricks Asset Bundle for a mission.
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
    const parsed = deployRequestSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { missionSlug } = parsed.data;

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

    // Decrypt the PAT
    const pat = decryptPat(connection.encryptedPat);

    // Deploy the bundle
    const result = await deployBundle(
      userId,
      missionSlug,
      connection.workspaceUrl,
      pat
    );

    if (result.status === "error") {
      return NextResponse.json(
        { error: result.error || "Deployment failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: result.status,
      deployedAt: result.deployedAt,
    });
  } catch (error) {
    console.error("[api/databricks/deploy]", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
