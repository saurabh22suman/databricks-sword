import { blogPosts, getDb } from "@/lib/db"
import { getContentFiles } from "@/lib/mdx/content"
import { blogFrontmatterSchema } from "@/lib/mdx/schema"
import { cn } from "@/lib/utils"
import { eq } from "drizzle-orm"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "System Logs | Databricks Sword Blog",
  description:
    "Articles, tutorials, and best practices for mastering the Databricks ecosystem.",
}

// Force dynamic rendering for DB queries
export const dynamic = "force-dynamic"

/** Category display colors */
const CATEGORY_COLORS: Record<string, string> = {
  tutorials: "text-anime-cyan border-anime-cyan",
  "best-practices": "text-anime-green border-anime-green",
  architecture: "text-anime-purple border-anime-purple",
  news: "text-anime-yellow border-anime-yellow",
  "deep-dive": "text-anime-accent border-anime-accent",
}

type BlogPost = {
  slug: string
  title: string
  description: string
  category: string
  tags: string[]
  publishedAt: string
  featured: boolean
  source: "db" | "mdx"
}

/**
 * Get blog posts from database.
 */
async function getDbPosts(): Promise<BlogPost[]> {
  try {
    const db = getDb()
    const posts = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.status, "published"))

    return posts.map((post) => ({
      slug: post.slug,
      title: post.title,
      description: post.description,
      category: post.category,
      tags: JSON.parse(post.tags),
      publishedAt: post.publishedAt?.toISOString().split("T")[0] ?? "",
      featured: post.featured,
      source: "db" as const,
    }))
  } catch (error) {
    console.error("Failed to fetch DB posts:", error)
    return []
  }
}

/**
 * Blog listing page — displays all blog posts sorted by date.
 * Loads posts from both database and MDX files (DB takes precedence).
 */
export default async function BlogPage(): Promise<React.ReactElement> {
  // Load from both sources
  const [dbPosts, mdxPosts] = await Promise.all([
    getDbPosts(),
    getContentFiles("blog", blogFrontmatterSchema),
  ])

  // Convert MDX posts to common format
  const mdxFormatted: BlogPost[] = mdxPosts.map((post) => ({
    slug: post.slug,
    title: post.frontmatter.title,
    description: post.frontmatter.description,
    category: post.frontmatter.category,
    tags: post.frontmatter.tags,
    publishedAt: post.frontmatter.publishedAt,
    featured: post.frontmatter.featured,
    source: "mdx" as const,
  }))

  // Merge: DB posts take precedence over MDX with same slug
  const dbSlugs = new Set(dbPosts.map((p) => p.slug))
  const uniqueMdxPosts = mdxFormatted.filter((p) => !dbSlugs.has(p.slug))
  const allPosts = [...dbPosts, ...uniqueMdxPosts]

  // Sort by publishedAt descending (newest first)
  const sortedPosts = allPosts.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )

  return (
    <div className="min-h-screen bg-anime-950 pt-20">
      <div className="grain-overlay fixed inset-0 pointer-events-none" />

      <div className="relative z-10 container mx-auto max-w-4xl px-4 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="mb-4 inline-block border border-anime-accent bg-anime-accent/10 px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-anime-accent">
            System Logs
          </div>
          <h1 className="font-heading text-5xl font-black uppercase italic tracking-tighter text-white mb-4">
            Blog
          </h1>
          <p className="text-lg text-gray-400">
            Articles, tutorials, and best practices for mastering the Databricks
            ecosystem.
          </p>
        </div>

        {/* Posts Grid */}
        {sortedPosts.length > 0 ? (
          <div className="grid gap-8">
            {sortedPosts.map((post) => {
              const categoryColor =
                CATEGORY_COLORS[post.category] ??
                "text-anime-cyan border-anime-cyan"
              return (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block"
                >
                  <article className="cut-corner border-2 border-anime-700 bg-anime-900 p-6 transition-all hover:border-anime-cyan hover:shadow-neon-cyan">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span
                        className={cn(
                          "border px-2 py-0.5 font-mono text-xs uppercase tracking-wider",
                          categoryColor,
                        )}
                      >
                        {post.category}
                      </span>
                      {post.featured && (
                        <span className="border border-anime-accent bg-anime-accent/10 px-2 py-0.5 font-mono text-xs uppercase tracking-wider text-anime-accent">
                          Featured
                        </span>
                      )}
                      <time
                        dateTime={post.publishedAt}
                        className="font-mono text-xs text-gray-500"
                      >
                        {new Date(post.publishedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                    </div>

                    <h2 className="font-heading text-2xl font-bold uppercase italic text-white mb-2 transition-colors group-hover:text-anime-cyan">
                      {post.title}
                    </h2>

                    <p className="text-gray-400 mb-4 line-clamp-2">
                      {post.description}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-anime-950 border border-anime-700 px-2 py-0.5 font-mono text-xs text-gray-500"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </article>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="cut-corner border-2 border-dashed border-anime-700 bg-anime-900/50 p-12 text-center">
            <p className="font-heading text-xl font-bold text-gray-400 mb-2">
              No Posts Yet
            </p>
            <p className="text-gray-500 font-mono text-sm">
              System logs are being compiled...
            </p>
            <Link
              href="/"
              className="mt-6 inline-block font-mono text-sm text-anime-cyan hover:text-cyan-400 transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
