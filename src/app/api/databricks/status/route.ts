import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { decryptPat, getBundleStatus, validateConnection } from "@/lib/databricks"
import { getDb, databricksConnections } from "@/lib/db"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

/** Only allow safe slug characters — prevents path traversal and command injection */
const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/

/**
 * GET /api/databricks/status
 * Returns connection health and bundle deployment status for the authenticated user.
 * UserId is derived from the session — not from query params.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log("[databricks/status] Starting request");

  try {
    // Authenticate via session — prevents IDOR
    const authResult = await authenticateApiRequest();
    if (!authResult.authenticated) {
      console.log("[databricks/status] Auth failed:", authResult.error);
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { userId } = authResult;
    console.log("[databricks/status] Auth userId:", userId);

    const { searchParams } = new URL(request.url);
    const missionSlug = searchParams.get("missionSlug");
    const shouldValidate = searchParams.get("validate") === "true";
    console.log("[databricks/status] validate:", shouldValidate);

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
      console.log("[databricks/status] Fetching connection for userId:", userId);

      const connections = await getDb()
        .select()
        .from(databricksConnections)
        .where(eq(databricksConnections.userId, userId))

      connection = connections[0];
      console.log("[databricks/status] Found connection:", !!connection);
    } catch (error) {
      console.error("[databricks/status] DB error:", error instanceof Error ? error.message : error);
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
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[databricks/status] ERROR:", msg, error);
    return NextResponse.json(
      { error: "Internal server error", details: msg },
      { status: 500 }
    );
  }
}
