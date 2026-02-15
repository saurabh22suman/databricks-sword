import { ArrowRight } from "lucide-react"
import Link from "next/link"
import React from "react"

/** Blog post data for the landing page section */
export type BlogSectionPost = {
  slug: string
  category: string
  title: string
  publishedAt: string
  readTimeMinutes: number
}

/** Category display colors */
const CATEGORY_COLORS: Record<string, string> = {
  tutorials: "text-anime-cyan border-anime-cyan",
  "best-practices": "text-anime-yellow border-anime-yellow",
  architecture: "text-anime-purple border-anime-purple",
  news: "text-anime-green border-anime-green",
  "deep-dive": "text-anime-accent border-anime-accent",
}

/** Format date to the cyberpunk style: JAN.15.2025 */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
  const month = months[d.getUTCMonth()]
  const day = String(d.getUTCDate()).padStart(2, "0")
  const year = d.getUTCFullYear()
  return `${month}.${day}.${year}`
}

export type BlogSectionProps = {
  /** Top 3 blog posts sorted by date desc. Passed from server. */
  posts: BlogSectionPost[]
}

/**
 * Blog section for the landing page.
 * Shows the latest 3 posts with cyberpunk styling.
 * Each card links to the full blog post.
 */
export function BlogSection({ posts }: BlogSectionProps): React.ReactElement {
  if (posts.length === 0) return <></>

  return (
    <section id="blog" className="py-24 relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute top-10 right-0 w-96 h-96 bg-anime-accent/5 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-black italic text-white uppercase tracking-tighter">
              System <span className="text-anime-accent">Logs</span>
            </h2>
            <p className="text-gray-500 font-mono text-xs mt-2 uppercase tracking-widest">
              Latest Intel from the Network
            </p>
          </div>

          <Link
            href="/blog"
            className="hidden sm:flex items-center gap-2 text-white font-bold uppercase text-xs tracking-widest hover:text-anime-accent transition-colors group"
          >
            Access All Logs{" "}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {posts.map((post) => {
            const color =
              CATEGORY_COLORS[post.category] ??
              "text-anime-cyan border-anime-cyan"
            return (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block hover:-translate-y-2 transition-transform duration-500 ease-out"
              >
                {/* Card */}
                <article className="cut-corner border border-anime-700 bg-anime-900 p-6 transition-all group-hover:border-anime-accent group-hover:shadow-neon-red h-full">
                  {/* Category badge */}
                  <div className="mb-4">
                    <span
                      className={`border px-3 py-1 text-xs font-bold uppercase tracking-wider ${color}`}
                    >
                      {post.category.replace("-", " ")}
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-xs font-mono text-gray-500 mb-3 border-b border-anime-700 pb-2 group-hover:border-anime-accent/30 transition-colors">
                    <span>{formatDate(post.publishedAt)}</span>
                    <span>// {String(post.readTimeMinutes).padStart(2, "0")} MIN READ</span>
                  </div>

                  <h3 className="text-lg font-bold italic text-white group-hover:text-anime-accent transition-colors leading-tight">
                    {post.title}
                  </h3>
                </article>
              </Link>
            )
          })}
        </div>

        {/* Mobile CTA */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-white font-bold uppercase text-xs tracking-widest hover:text-anime-accent transition-colors"
          >
            Access All Logs{" "}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
