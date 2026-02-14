"use client"

import { ArrowRight } from "lucide-react"
import Link from "next/link"
import React from "react"

type BlogPost = {
  id: number
  category: string
  title: string
  date: string
  readTime: string
  color: string
}

/** Hardcoded featured posts for landing page preview. Will be replaced with real data when blog posts exist. */
const FEATURED_POSTS: BlogPost[] = [
  {
    id: 1,
    category: "Tutorials",
    title: "How to Set Up Databricks Free Edition for Databricks Sword",
    date: "JAN.15.2025",
    readTime: "08 MIN",
    color: "text-anime-cyan border-anime-cyan",
  },
  {
    id: 2,
    category: "Architecture",
    title: "Medallion Architecture: Bronze, Silver, Gold Explained",
    date: "JAN.08.2025",
    readTime: "07 MIN",
    color: "text-anime-purple border-anime-purple",
  },
  {
    id: 3,
    category: "Best Practices",
    title: "5 Ways to Speed Up Your Delta Merge Operations",
    date: "JAN.01.2025",
    readTime: "05 MIN",
    color: "text-anime-yellow border-anime-yellow",
  },
]

/**
 * Blog section for the landing page.
 * Shows the latest 3 featured posts with cyberpunk styling.
 * NO dark: variants — we are dark-only.
 */
export function BlogSection(): React.ReactElement {
  const posts = FEATURED_POSTS

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
          {posts.map((post) => (
            <article
              key={post.id}
              className="group cursor-pointer hover:-translate-y-2 transition-transform duration-500 ease-out"
            >
              {/* Card */}
              <div className="cut-corner border border-anime-700 bg-anime-900 p-6 transition-all group-hover:border-anime-accent group-hover:shadow-neon-red">
                {/* Category badge */}
                <div className="mb-4">
                  <span
                    className={`border px-3 py-1 text-xs font-bold uppercase tracking-wider ${post.color}`}
                  >
                    {post.category}
                  </span>
                </div>

                {/* Meta */}
                <div className="flex items-center justify-between text-xs font-mono text-gray-500 mb-3 border-b border-anime-700 pb-2 group-hover:border-anime-accent/30 transition-colors">
                  <span>{post.date}</span>
                  <span>// {post.readTime} READ</span>
                </div>

                <h3 className="text-lg font-bold italic text-white group-hover:text-anime-accent transition-colors leading-tight">
                  {post.title}
                </h3>
              </div>
            </article>
          ))}
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
