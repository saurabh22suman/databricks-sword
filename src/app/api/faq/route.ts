import { faqItems, getDb } from "@/lib/db"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

/**
 * GET /api/faq - List all published FAQ items
 */
export async function GET(): Promise<NextResponse> {
  try {
    const db = getDb()
    const items = await db
      .select()
      .from(faqItems)
      .where(eq(faqItems.status, "published"))
      .orderBy(faqItems.displayOrder)

    const faqs = items.map((item) => ({
      id: item.id,
      category: item.category,
      question: item.question,
      answer: item.answer,
      codeExample: item.codeExample,
      keyPoints: JSON.parse(item.keyPoints ?? "[]"),
      displayOrder: item.displayOrder,
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
