import { authenticateApiRequest } from "@/lib/auth/api-auth";
import { decryptPat, getBundleStatus, validateConnection } from "@/lib/databricks";
import { NextRequest, NextResponse } from "next/server";

/** Only allow safe slug characters — prevents path traversal and command injection */
const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

/**
 * GET /api/databricks/status
 * Returns connection health and bundle deployment status for the authenticated user.
 * UserId is derived from the session — not from query params.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate via session — prevents IDOR
    const authResult = await authenticateApiRequest();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { userId } = authResult;

    const { searchParams } = new URL(request.url);
    const missionSlug = searchParams.get("missionSlug");
    const shouldValidate = searchParams.get("validate") === "true";

    // Validate missionSlug format if provided
    if (missionSlug && !SAFE_SLUG.test(missionSlug)) {
      return NextResponse.json(
        { error: "Invalid mission slug format" },
        { status: 400 }
      );
    }

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
      // Database not configured - return disconnected status
      return NextResponse.json({
        connected: false,
        error: "Database not configured",
      });
    }

    if (!connection) {
      return NextResponse.json({
        connected: false,
      });
    }

    // Build response
    const response: {
      connected: boolean;
      workspaceUrl?: string;
      lastValidatedAt?: Date | null;
      bundleStatus?: ReturnType<typeof getBundleStatus>;
      connectionHealthy?: boolean;
      healthError?: string;
    } = {
      connected: true,
      workspaceUrl: connection.workspaceUrl,
      lastValidatedAt: connection.lastValidatedAt,
    };

    // Get bundle status if missionSlug is provided
    if (missionSlug) {
      response.bundleStatus = getBundleStatus(userId, missionSlug);
    }

    // Validate connection health if requested
    if (shouldValidate) {
      const pat = decryptPat(connection.encryptedPat);
      const validation = await validateConnection(connection.workspaceUrl, pat);
      response.connectionHealthy = validation.valid;
      if (!validation.valid) {
        response.healthError = validation.error;
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[api/databricks/status]", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
