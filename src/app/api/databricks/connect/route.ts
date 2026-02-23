import { authenticateApiRequest } from "@/lib/auth/api-auth";
import { encryptPat, validateConnection } from "@/lib/databricks";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ALLOWED_DATABRICKS_HOST_SUFFIXES = [
  ".cloud.databricks.com",
  ".azuredatabricks.net",
  ".gcp.databricks.com",
] as const;

const connectRequestSchema = z.object({
  workspaceUrl: z.string().min(1, "workspaceUrl is required"),
  pat: z.string().min(1, "Personal Access Token is required"),
  warehouseId: z.string().regex(/^[a-f0-9]{16}$/i, "Invalid warehouse ID format").optional(),
  catalogName: z.string().regex(/^[a-z_][a-z0-9_]*$/i, "Invalid catalog name").default("dev"),
});

/**
 * POST /api/databricks/connect
 * Validates and stores a Databricks workspace connection.
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
    const parsed = connectRequestSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { workspaceUrl, pat, warehouseId, catalogName } = parsed.data;

    let parsedWorkspaceUrl: URL;
    try {
      parsedWorkspaceUrl = new URL(workspaceUrl);
    } catch {
      return NextResponse.json({ error: "Invalid Databricks workspace URL" }, { status: 400 });
    }

    if (parsedWorkspaceUrl.protocol !== "https:") {
      return NextResponse.json({ error: "Databricks workspace URL must use HTTPS" }, { status: 400 });
    }

    const hasAllowedHostSuffix = ALLOWED_DATABRICKS_HOST_SUFFIXES.some((suffix) =>
      parsedWorkspaceUrl.hostname.endsWith(suffix)
    );

    if (!hasAllowedHostSuffix) {
      return NextResponse.json({ error: "Invalid Databricks workspace URL hostname" }, { status: 400 });
    }

    // Validate the connection
    const validation = await validateConnection(workspaceUrl, pat);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || "Invalid credentials" }, { status: 401 });
    }

    // Encrypt the PAT
    const encryptedPat = encryptPat(pat);

    // Store in database
    try {
      const { getDb, databricksConnections } = await import("@/lib/db");
      const { randomUUID } = await import("crypto");

      await getDb()
        .insert(databricksConnections)
        .values({
          id: randomUUID(),
          userId,
          workspaceUrl,
          encryptedPat,
          warehouseId: warehouseId || null,
          catalogName,
          connectedAt: new Date(),
          lastValidatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: databricksConnections.userId,
          set: {
            workspaceUrl,
            encryptedPat,
            warehouseId: warehouseId || null,
            catalogName,
            lastValidatedAt: new Date(),
          },
        });
    } catch (error) {
      console.error(
        "[api/databricks/connect] Failed to persist Databricks connection",
        error instanceof Error ? error.message : "Unknown error"
      );
      return NextResponse.json(
        { error: "Failed to persist Databricks connection" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      workspaceUrl,
      warehouseId,
      catalogName,
      message: "Successfully connected to Databricks workspace",
    });
  } catch (error) {
    console.error("[api/databricks/connect]", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
