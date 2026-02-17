import { NextResponse } from "next/server"

/**
 * GET /api/health
 * Lightweight health endpoint for container probes.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  })
}
