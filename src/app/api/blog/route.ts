import { blogPosts, getDb } from "@/lib/db"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

/**
 * GET /api/blog - List all published blog posts
 */
export async function GET(): Promise<NextResponse> {
  try {
    const db = getDb()
    const posts = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.status, "published"))

    const blogs = posts.map((post) => ({
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
    }))

    // Sort by publishedAt, newest first
    blogs.sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )

    return NextResponse.json({ blogs })
  } catch (error) {
    console.error("Failed to list blogs:", error)
    return NextResponse.json(
      { error: "Failed to list blogs" },
      { status: 500 }
    )
  }
}
