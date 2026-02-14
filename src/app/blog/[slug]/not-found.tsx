import Link from "next/link"

/**
 * 404 page for blog posts that don't exist.
 */
export default function BlogPostNotFound(): React.ReactElement {
  return (
    <div className="min-h-screen bg-anime-950 pt-20">
      <div className="grain-overlay fixed inset-0 pointer-events-none" />

      <div className="relative z-10 container mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="cut-corner border-2 border-anime-accent/30 bg-anime-900/50 p-12">
          <div className="font-mono text-6xl font-bold text-anime-accent mb-4">
            404
          </div>
          <h1 className="font-heading text-3xl font-black uppercase italic tracking-tighter text-white mb-4">
            Post Not Found
          </h1>
          <p className="text-gray-400 mb-8">
            The blog post you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 cut-corner border-2 border-anime-cyan bg-anime-cyan/10 px-6 py-3 font-bold uppercase tracking-wider text-anime-cyan hover:bg-anime-cyan hover:text-anime-950 transition-all"
          >
            ← Back to Blog
          </Link>
        </div>
      </div>
    </div>
  )
}
