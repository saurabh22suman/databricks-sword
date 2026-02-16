import type { BlogSectionPost } from "@/components/landing/BlogSection"
import { BlogSection } from "@/components/landing/BlogSection"
import { FAQ } from "@/components/landing/FAQ"
import { FieldOperationsPreview } from "@/components/landing/FieldOperationsPreview"
import { Hero } from "@/components/landing/Hero"
import { InteractiveSyllabus } from "@/components/landing/InteractiveSyllabus"
import { blogPosts, getDb } from "@/lib/db"
import { INDUSTRY_CONFIGS } from "@/lib/field-ops/industries"
import { getContentFiles } from "@/lib/mdx/content"
import { blogFrontmatterSchema } from "@/lib/mdx/schema"
import { getAllMissions } from "@/lib/missions"
import { StructuredData, getCourseStructuredData } from "@/lib/seo/structured-data"
import { eq } from "drizzle-orm"
import type { Metadata } from "next"

// Force dynamic rendering for DB queries (blog posts)
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Databricks Sword — Master the Lakehouse Through Gamified Missions",
  description:
    "Level up your Databricks skills with 20 story-driven missions, 50+ challenges, and spaced repetition. Dark cyberpunk theme. All simulated—no cloud costs.",
  openGraph: {
    title: "Databricks Sword — Gamified Databricks Mastery",
    description: "Master Delta Lake, PySpark, MLflow, and Unity Catalog through interactive missions and challenges.",
    type: "website",
  },
}

/**
 * Landing page for Databricks Sword.
 * Features cyberpunk anime aesthetic with cinematic effects,
 * showcasing missions, data archive (FAQ), and system logs (blog).
 */
export default async function HomePage(): Promise<React.ReactElement> {
  const missions = await getAllMissions()

  // --- Fetch latest 3 blog posts for System Logs section ---
  let blogSectionPosts: BlogSectionPost[] = []
  try {
    // DB posts
    const db = getDb()
    const dbRows = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.status, "published"))
    const dbFormatted: BlogSectionPost[] = dbRows.map((p) => ({
      slug: p.slug,
      category: p.category,
      title: p.title,
      publishedAt: p.publishedAt?.toISOString().split("T")[0] ?? "",
      readTimeMinutes: Math.ceil((p.content?.length ?? 0) / 1500) || 5,
    }))

    // MDX posts
    const mdxFiles = await getContentFiles("blog", blogFrontmatterSchema)
    const dbSlugs = new Set(dbFormatted.map((p) => p.slug))
    const mdxFormatted: BlogSectionPost[] = mdxFiles
      .filter((p) => !dbSlugs.has(p.slug))
      .map((p) => ({
        slug: p.slug,
        category: p.frontmatter.category,
        title: p.frontmatter.title,
        publishedAt: p.frontmatter.publishedAt,
        readTimeMinutes: Math.ceil(p.content.length / 1500) || 5,
      }))

    const all = [...dbFormatted, ...mdxFormatted]
    all.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    blogSectionPosts = all.slice(0, 3)
  } catch (error) {
    console.error("Failed to load blog posts for landing page:", error)
  }

  // Select 2 featured Field Operations industries for landing page
  const featuredIndustries = [
    INDUSTRY_CONFIGS.retail,
    INDUSTRY_CONFIGS.gaming,
  ]

  return (
    <div className="min-h-screen bg-anime-950 text-white selection:bg-anime-accent selection:text-white relative pt-20">
      <StructuredData data={getCourseStructuredData()} />
      <div className="grain-overlay opacity-100" />
      <div className="fixed inset-0 bg-cyber-grid bg-[size:40px_40px] opacity-20 pointer-events-none animate-pulse-fast" />
      <div className="fixed top-0 left-0 w-full h-32 bg-gradient-to-b from-anime-accent/10 to-transparent pointer-events-none z-0" />
      
      <main className="relative z-10">
        <Hero />
        <FieldOperationsPreview industries={featuredIndustries} />
        <InteractiveSyllabus missions={missions} />
        <FAQ />
        <BlogSection posts={blogSectionPosts} />
      </main>
    </div>
  )
}
