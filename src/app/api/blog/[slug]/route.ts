import { blogPosts, getDb } from "@/lib/db"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

type Params = { slug: string }

/**
 * GET /api/blog/[slug] - Get a single published blog post
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { slug } = await params
    const db = getDb()

    const [post] = await db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")))
      .limit(1)

    if (!post) {
      return NextResponse.json(
        { error: "Blog post not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      blog: {
        id: post.id,
        slug: post.slug,
        title: post.title,
        description: post.description,
        content: post.content,
        author: post.author,
        category: post.category,
        tags: JSON.parse(post.tags),
        publishedAt: post.publishedAt?.toISOString().split("T")[0] ?? "",
        featured: post.featured,
        sourceUrl: post.sourceUrl,
        citations: JSON.parse(post.citations ?? "[]"),
      },
    })
  } catch (error) {
    console.error("Failed to get blog:", error)
    return NextResponse.json(
      { error: "Failed to get blog post" },
      { status: 500 }
    )
  }
}
