/**
 * Databricks Connection Test API
 * POST /api/databricks/test
 * Test Databricks connection with provided credentials.
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { testConnection } from "@/lib/databricks/cli"

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { workspaceUrl, token, warehouseId, catalog } = body

    if (!workspaceUrl || !token || !warehouseId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Test connection
    const result = await testConnection({
      workspaceUrl,
      token,
      warehouseId,
      catalog: catalog || "default",
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Connection successful",
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.errorMessage || "Connection failed",
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Connection test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Connection test failed",
      },
      { status: 500 }
    )
  }
}
