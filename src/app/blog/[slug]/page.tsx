import { blogPosts, getDb } from "@/lib/db"
import { getContentBySlug, getContentSlugs } from "@/lib/mdx/content"
import { blogFrontmatterSchema } from "@/lib/mdx/schema"
import { eq } from "drizzle-orm"
import type { Metadata } from "next"
import { MDXRemote } from "next-mdx-remote/rsc"
import Link from "next/link"
import { notFound } from "next/navigation"

// Force dynamic rendering for DB queries
export const dynamic = "force-dynamic"

type BlogPostPageProps = {
  params: Promise<{ slug: string }>
}

type BlogData = {
  title: string
  description: string
  author: string
  category: string
  tags: string[]
  publishedAt: string
  featured: boolean
  content: string
  sourceUrl?: string | null
  citations?: Array<{ title: string; url: string; author?: string; date?: string }>
  source: "db" | "mdx"
}

/**
 * Get blog post from database.
 */
async function getDbPost(slug: string): Promise<BlogData | null> {
  try {
    const db = getDb()
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .limit(1)

    if (!post || post.status !== "published") return null

    return {
      title: post.title,
      description: post.description,
      author: post.author,
      category: post.category,
      tags: JSON.parse(post.tags),
      publishedAt: post.publishedAt?.toISOString().split("T")[0] ?? "",
      featured: post.featured,
      content: post.content,
      sourceUrl: post.sourceUrl,
      citations: JSON.parse(post.citations ?? "[]"),
      source: "db",
    }
  } catch {
    return null
  }
}

/**
 * Generates static params for all blog posts at build time.
 */
export function generateStaticParams(): Array<{ slug: string }> {
  const slugs = getContentSlugs("blog")
  return slugs.map((slug) => ({ slug }))
}

/**
 * Generates metadata for a blog post page.
 */
export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params

  // Try DB first
  const dbPost = await getDbPost(slug)
  if (dbPost) {
    return {
      title: `${dbPost.title} | Databricks Sword Blog`,
      description: dbPost.description,
      openGraph: {
        title: dbPost.title,
        description: dbPost.description,
        type: "article",
        publishedTime: dbPost.publishedAt,
        authors: [dbPost.author],
        tags: dbPost.tags,
      },
    }
  }

  // Fallback to MDX
  const mdxPost = await getContentBySlug("blog", slug, blogFrontmatterSchema)
  if (mdxPost) {
    return {
      title: `${mdxPost.frontmatter.title} | Databricks Sword Blog`,
      description: mdxPost.frontmatter.description,
      openGraph: {
        title: mdxPost.frontmatter.title,
        description: mdxPost.frontmatter.description,
        type: "article",
        publishedTime: mdxPost.frontmatter.publishedAt,
        authors: [mdxPost.frontmatter.author],
        tags: mdxPost.frontmatter.tags,
      },
    }
  }

  return {
    title: "Post Not Found | Databricks Sword",
  }
}

/**
 * Blog post page — renders a single blog post with cyberpunk styling.
 * Supports both database and MDX content sources.
 */
export default async function BlogPostPage({
  params,
}: BlogPostPageProps): Promise<React.ReactElement> {
  const { slug } = await params

  // Try DB first
  let post: BlogData | null = await getDbPost(slug)

  // Fallback to MDX
  if (!post) {
    const mdxPost = await getContentBySlug("blog", slug, blogFrontmatterSchema)
    if (mdxPost) {
      post = {
        title: mdxPost.frontmatter.title,
        description: mdxPost.frontmatter.description,
        author: mdxPost.frontmatter.author,
        category: mdxPost.frontmatter.category,
        tags: mdxPost.frontmatter.tags,
        publishedAt: mdxPost.frontmatter.publishedAt,
        featured: mdxPost.frontmatter.featured,
        content: mdxPost.content,
        source: "mdx",
      }
    }
  }

  if (!post) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-anime-950 pt-20">
      <div className="grain-overlay fixed inset-0 pointer-events-none" />

      <article className="relative z-10 container mx-auto max-w-3xl px-4 py-16">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm font-mono text-gray-500">
          <Link
            href="/blog"
            className="hover:text-anime-cyan transition-colors"
          >
            Blog
          </Link>
          <span className="text-anime-700">/</span>
          <span className="text-gray-400 truncate">{post.title}</span>
        </nav>

        {/* Header */}
        <header className="mb-12">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="border border-anime-cyan bg-anime-cyan/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-anime-cyan">
              {post.category}
            </span>
            {post.featured && (
              <span className="border border-anime-accent bg-anime-accent/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-anime-accent">
                Featured
              </span>
            )}
          </div>

          <h1 className="font-heading text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-white mb-4">
            {post.title}
          </h1>

          <p className="text-lg text-gray-400 mb-6">
            {post.description}
          </p>

          <div className="flex items-center gap-4 text-sm font-mono text-gray-500 border-b border-anime-700 pb-6">
            <span>By {post.author}</span>
            <span className="text-anime-700">|</span>
            <time dateTime={post.publishedAt}>
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-anime-900 border border-anime-700 px-2 py-1 font-mono text-xs text-gray-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Content - DB posts use markdown, MDX posts use MDXRemote */}
        <div className="prose prose-invert prose-anime max-w-none prose-headings:font-heading prose-headings:uppercase prose-headings:italic prose-headings:tracking-tight prose-a:text-anime-cyan prose-code:text-anime-green prose-pre:bg-anime-900 prose-pre:border prose-pre:border-anime-700 prose-p:my-6 prose-li:my-2 prose-ul:my-4 prose-ol:my-4 prose-h2:mt-12 prose-h2:mb-6 prose-h3:mt-8 prose-h3:mb-4 prose-blockquote:border-l-anime-cyan prose-blockquote:bg-anime-900/50 prose-blockquote:py-1">
          <MDXRemote source={post.content} />
        </div>

        {/* Citations */}
        {post.citations && post.citations.length > 0 && (
          <div className="mt-12 pt-8 border-t border-anime-700">
            <h3 className="font-heading text-lg uppercase italic text-anime-purple mb-4">
              Sources & Citations
            </h3>
            <ul className="space-y-2">
              {post.citations.map((citation, index) => (
                <li key={index} className="text-sm text-gray-400">
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-anime-cyan hover:text-cyan-400 transition-colors"
                  >
                    {citation.title}
                  </a>
                  {citation.author && <span> — {citation.author}</span>}
                  {citation.date && <span> ({citation.date})</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Source URL */}
        {post.sourceUrl && (
          <div className="mt-6 p-4 bg-anime-900/50 border border-anime-700 rounded-lg">
            <p className="text-sm text-gray-400">
              Originally published at{" "}
              <a
                href={post.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-anime-cyan hover:text-cyan-400 transition-colors"
              >
                {new URL(post.sourceUrl).hostname}
              </a>
            </p>
          </div>
        )}

        {/* Back link */}
        <div className="mt-16 pt-8 border-t border-anime-700">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 font-mono text-sm text-anime-cyan hover:text-cyan-400 transition-colors"
          >
            ← Back to all posts
          </Link>
        </div>
      </article>
    </div>
  )
}
