import { blogPosts, getDb } from "@/lib/db"
import { eq } from "drizzle-orm"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const ADMIN_COOKIE_NAME = "admin_session"

/**
 * Verify admin authentication from cookie.
 */
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get(ADMIN_COOKIE_NAME)
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!session || !adminPassword) return false

  try {
    const decoded = Buffer.from(session.value, "base64").toString("utf8")
    const [storedPassword] = decoded.split(":")
    return storedPassword === adminPassword
  } catch {
    return false
  }
}

/**
 * Extract article content from HTML.
 * Basic extraction - works with most article pages.
 */
function extractArticleContent(html: string): {
  title: string
  description: string
  content: string
  author: string
} {
  // Extract title
  const titleMatch =
    html.match(/<title[^>]*>([^<]+)<\/title>/i) ||
    html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
    html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)
  const title = titleMatch
    ? decodeHtmlEntities(titleMatch[1].trim())
    : "Imported Article"

  // Extract description
  const descMatch =
    html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i) ||
    html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i)
  const description = descMatch ? decodeHtmlEntities(descMatch[1].trim()) : ""

  // Extract author
  const authorMatch =
    html.match(/<meta[^>]*name="author"[^>]*content="([^"]+)"/i) ||
    html.match(/<a[^>]*rel="author"[^>]*>([^<]+)<\/a>/i) ||
    html.match(/by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i)
  const author = authorMatch
    ? decodeHtmlEntities(authorMatch[1].trim())
    : "Unknown Author"

  // Extract main content
  let content = ""

  // Try to find article body
  const articleMatch =
    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
    html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(/<div[^>]*class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)

  if (articleMatch) {
    content = articleMatch[1]
  } else {
    // Fallback: extract all paragraphs
    const paragraphs = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || []
    content = paragraphs.join("\n")
  }

  // Convert HTML to Markdown-ish content
  content = htmlToMarkdown(content)

  return { title, description, content, author }
}

/**
 * Decode HTML entities.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
}

/**
 * Convert HTML to Markdown.
 * Basic conversion for common elements.
 */
function htmlToMarkdown(html: string): string {
  let md = html

  // Remove scripts, styles, and comments
  md = md.replace(/<script[\s\S]*?<\/script>/gi, "")
  md = md.replace(/<style[\s\S]*?<\/style>/gi, "")
  md = md.replace(/<!--[\s\S]*?-->/g, "")

  // Convert headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n")
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, "\n##### $1\n")
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, "\n###### $1\n")

  // Convert paragraphs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n")

  // Convert links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")

  // Convert bold and italic
  md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**")
  md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*")

  // Convert code
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`")
  md = md.replace(
    /<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    "\n```\n$1\n```\n"
  )
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "\n```\n$1\n```\n")

  // Convert lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, list) => {
    return list.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1")
  })
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, list) => {
    let counter = 0
    return list.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, () => {
      counter++
      return `\n${counter}. `
    })
  })

  // Convert blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "\n> $1\n")

  // Convert line breaks
  md = md.replace(/<br\s*\/?>/gi, "\n")

  // Remove remaining HTML tags
  md = md.replace(/<[^>]+>/g, "")

  // Decode entities
  md = decodeHtmlEntities(md)

  // Clean up whitespace
  md = md.replace(/\n{3,}/g, "\n\n")
  md = md.trim()

  return md
}

/**
 * Generate URL-friendly slug from title.
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
}

/**
 * POST /api/admin/import - Import article from URL and save to database
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { url, saveAsDraft } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Validate URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    // Fetch the page
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DatabricksSword/1.0; +https://databricks-sword.dev)",
        Accept: "text/html",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status}` },
        { status: 400 }
      )
    }

    const html = await response.text()

    // Extract content
    const { title, description, content, author } = extractArticleContent(html)

    if (!content || content.length < 100) {
      return NextResponse.json(
        { error: "Could not extract enough content from the URL" },
        { status: 400 }
      )
    }

    // Generate slug
    const baseSlug = generateSlug(title)
    let slug = baseSlug
    let counter = 1

    const db = getDb()

    // Ensure unique slug
    let existing = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .limit(1)

    while (existing.length > 0) {
      slug = `${baseSlug}-${counter}`
      counter++
      existing = await db
        .select({ id: blogPosts.id })
        .from(blogPosts)
        .where(eq(blogPosts.slug, slug))
        .limit(1)
    }

    // Determine category based on content/URL
    let category = "tutorials"
    const urlLower = url.toLowerCase()
    const contentLower = content.toLowerCase()

    if (
      urlLower.includes("architecture") ||
      contentLower.includes("architecture")
    ) {
      category = "architecture"
    } else if (
      urlLower.includes("best-practice") ||
      contentLower.includes("best practice")
    ) {
      category = "best-practices"
    } else if (
      urlLower.includes("deep-dive") ||
      contentLower.includes("deep dive")
    ) {
      category = "deep-dive"
    }

    // Extract potential tags from content
    const techKeywords = [
      "spark",
      "pyspark",
      "delta-lake",
      "databricks",
      "sql",
      "python",
      "data-engineering",
      "mlflow",
      "streaming",
      "unity-catalog",
    ]
    const tags = techKeywords.filter(
      (kw) =>
        contentLower.includes(kw.replace("-", " ")) ||
        contentLower.includes(kw)
    )

    // Add attribution header to content
    const attributedContent = `*Originally published at [${parsedUrl.hostname}](${url})*\n\n---\n\n${content}`

    const now = new Date()
    const status = saveAsDraft ? "draft" : "published"

    // Save to database
    const [newPost] = await db
      .insert(blogPosts)
      .values({
        slug,
        title,
        description: description || `Imported from ${parsedUrl.hostname}`,
        content: attributedContent,
        author: author || "Databricks Sword",
        category,
        tags: JSON.stringify(tags.length > 0 ? tags : ["imported"]),
        status,
        sourceUrl: url,
        citations: JSON.stringify([
          {
            title: `Original article`,
            url,
            author,
            date: now.toISOString().split("T")[0],
          },
        ]),
        featured: false,
        publishedAt: status === "published" ? now : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    return NextResponse.json({
      success: true,
      id: newPost.id,
      slug,
      title,
      status,
      preview: content.slice(0, 500) + "...",
    })
  } catch (error) {
    console.error("Import failed:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to import article",
      },
      { status: 500 }
    )
  }
}
