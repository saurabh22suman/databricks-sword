import { isAdminAuthenticated } from "@/lib/auth/admin-auth"
import { faqItems, getDb } from "@/lib/db"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

/**
 * GET /api/admin/faq - List all FAQ items from database
 */
export async function GET(): Promise<NextResponse> {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getDb()
    const items = await db
      .select()
      .from(faqItems)
      .orderBy(faqItems.displayOrder)

    const faqs = items.map((item) => ({
      id: item.id,
      category: item.category,
      question: item.question,
      answer: item.answer,
      codeExample: item.codeExample,
      keyPoints: JSON.parse(item.keyPoints ?? "[]"),
      displayOrder: item.displayOrder,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }))

    return NextResponse.json({ faqs })
  } catch (error) {
    console.error("Failed to list FAQ items:", error)
    return NextResponse.json(
      { error: "Failed to list FAQ items" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/faq - Create a new FAQ item
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      category,
      question,
      answer,
      codeExample,
      keyPoints,
      displayOrder,
      status,
    } = body

    if (!category || !question || !answer) {
      return NextResponse.json(
        { error: "Missing required fields: category, question, answer" },
        { status: 400 }
      )
    }

    const db = getDb()
    const now = new Date()

    // Get max display order if not provided
    let order = displayOrder
    if (order === undefined) {
      const maxOrder = await db
        .select({ displayOrder: faqItems.displayOrder })
        .from(faqItems)
        .orderBy(faqItems.displayOrder)
        .limit(1)
      order = (maxOrder[0]?.displayOrder ?? 0) + 1
    }

    const [newItem] = await db
      .insert(faqItems)
      .values({
        category,
        question,
        answer,
        codeExample: codeExample || null,
        keyPoints: JSON.stringify(keyPoints || []),
        displayOrder: order,
        status: status || "published",
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    return NextResponse.json({ success: true, id: newItem.id })
  } catch (error) {
    console.error("Failed to create FAQ item:", error)
    return NextResponse.json(
      { error: "Failed to create FAQ item" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/faq - Update an FAQ item
 */
export async function PATCH(request: Request): Promise<NextResponse> {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: "Missing id" },
        { status: 400 }
      )
    }

    const db = getDb()

    // Find the item
    const [existing] = await db
      .select()
      .from(faqItems)
      .where(eq(faqItems.id, id))
      .limit(1)

    if (!existing) {
      return NextResponse.json(
        { error: "FAQ item not found" },
        { status: 404 }
      )
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (updates.category !== undefined) updateData.category = updates.category
    if (updates.question !== undefined) updateData.question = updates.question
    if (updates.answer !== undefined) updateData.answer = updates.answer
    if (updates.codeExample !== undefined) updateData.codeExample = updates.codeExample
    if (updates.keyPoints !== undefined) updateData.keyPoints = JSON.stringify(updates.keyPoints)
    if (updates.displayOrder !== undefined) updateData.displayOrder = updates.displayOrder
    if (updates.status !== undefined) updateData.status = updates.status

    await db.update(faqItems).set(updateData).where(eq(faqItems.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update FAQ item:", error)
    return NextResponse.json(
      { error: "Failed to update FAQ item" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/faq - Delete an FAQ item
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Missing id" },
        { status: 400 }
      )
    }

    const db = getDb()
    await db.delete(faqItems).where(eq(faqItems.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete FAQ item:", error)
    return NextResponse.json(
      { error: "Failed to delete FAQ item" },
      { status: 500 }
    )
  }
}
