import { blogPosts, getDb } from "@/lib/db"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { isAdminAuthenticated } from "@/lib/auth/admin-auth"

/**
 * GET /api/admin/blog - List all blog posts from database
 */
export async function GET(): Promise<NextResponse> {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getDb()
    const posts = await db
      .select()
      .from(blogPosts)
      .orderBy(blogPosts.createdAt)

    const blogs = posts.map((post) => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      description: post.description,
      content: post.content,
      category: post.category,
      tags: JSON.parse(post.tags),
      publishedAt: post.publishedAt?.toISOString().split("T")[0] ?? "",
      featured: post.featured,
      status: post.status,
      sourceUrl: post.sourceUrl,
      citations: JSON.parse(post.citations ?? "[]"),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    }))

    // Sort by date, newest first
    blogs.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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

/**
 * POST /api/admin/blog - Create a new blog post
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      slug,
      title,
      description,
      content,
      category,
      tags,
      featured,
      citations,
      sourceUrl,
      status,
    } = body

    if (!slug || !title || !content) {
      return NextResponse.json(
        { error: "Missing required fields: slug, title, content" },
        { status: 400 }
      )
    }

    // Validate slug (alphanumeric, hyphens only)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Invalid slug format" },
        { status: 400 }
      )
    }

    const db = getDb()

    // Check if slug already exists
    const existing = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Blog post with this slug already exists" },
        { status: 409 }
      )
    }

    const now = new Date()
    const [newPost] = await db
      .insert(blogPosts)
      .values({
        slug,
        title,
        description: description || "",
        content,
        author: "Databricks Sword",
        category: category || "tutorials",
        tags: JSON.stringify(tags || []),
        status: status || "draft",
        sourceUrl: sourceUrl || null,
        citations: JSON.stringify(citations || []),
        featured: featured || false,
        publishedAt: status === "published" ? now : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    return NextResponse.json({ success: true, slug, id: newPost.id })
  } catch (error) {
    console.error("Failed to create blog:", error)
    return NextResponse.json(
      { error: "Failed to create blog post" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/blog - Update a blog post
 */
export async function PATCH(request: Request): Promise<NextResponse> {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, slug, ...updates } = body

    if (!id && !slug) {
      return NextResponse.json(
        { error: "Missing id or slug" },
        { status: 400 }
      )
    }

    const db = getDb()

    // Find the post
    const [existing] = id
      ? await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1)
      : await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1)

    if (!existing) {
      return NextResponse.json(
        { error: "Blog post not found" },
        { status: 404 }
      )
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.content !== undefined) updateData.content = updates.content
    if (updates.category !== undefined) updateData.category = updates.category
    if (updates.tags !== undefined) updateData.tags = JSON.stringify(updates.tags)
    if (updates.featured !== undefined) updateData.featured = updates.featured
    if (updates.citations !== undefined) updateData.citations = JSON.stringify(updates.citations)
    if (updates.sourceUrl !== undefined) updateData.sourceUrl = updates.sourceUrl
    if (updates.status !== undefined) {
      updateData.status = updates.status
      // Set publishedAt when publishing for the first time
      if (updates.status === "published" && !existing.publishedAt) {
        updateData.publishedAt = new Date()
      }
    }

    await db.update(blogPosts).set(updateData).where(eq(blogPosts.id, existing.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update blog:", error)
    return NextResponse.json(
      { error: "Failed to update blog post" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/blog - Delete a blog post
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const slug = searchParams.get("slug")

    if (!id && !slug) {
      return NextResponse.json(
        { error: "Missing id or slug" },
        { status: 400 }
      )
    }

    const db = getDb()

    if (id) {
      await db.delete(blogPosts).where(eq(blogPosts.id, id))
    } else if (slug) {
      await db.delete(blogPosts).where(eq(blogPosts.slug, slug))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete blog:", error)
    return NextResponse.json(
      { error: "Failed to delete blog post" },
      { status: 500 }
    )
  }
}
