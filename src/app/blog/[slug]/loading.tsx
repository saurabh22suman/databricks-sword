/**
 * Loading state for individual blog posts.
 * Shows skeleton content with cyberpunk styling.
 */
export default function BlogPostLoading(): React.ReactElement {
  return (
    <div className="min-h-screen bg-anime-950 pt-20">
      <div className="grain-overlay fixed inset-0 pointer-events-none" />

      <div className="relative z-10 container mx-auto max-w-3xl px-4 py-16 animate-pulse">
        {/* Breadcrumb skeleton */}
        <div className="mb-8 flex items-center gap-2">
          <div className="h-4 w-12 bg-anime-800 rounded" />
          <div className="h-4 w-2 bg-anime-800 rounded" />
          <div className="h-4 w-32 bg-anime-800 rounded" />
        </div>

        {/* Category badge skeleton */}
        <div className="mb-4">
          <div className="h-6 w-24 bg-anime-800 rounded" />
        </div>

        {/* Title skeleton */}
        <div className="mb-4 space-y-3">
          <div className="h-10 w-3/4 bg-anime-800 rounded" />
          <div className="h-10 w-1/2 bg-anime-800 rounded" />
        </div>

        {/* Description skeleton */}
        <div className="h-6 w-full bg-anime-800 rounded mb-6" />

        {/* Meta skeleton */}
        <div className="flex gap-4 border-b border-anime-700 pb-6 mb-8">
          <div className="h-4 w-24 bg-anime-800 rounded" />
          <div className="h-4 w-32 bg-anime-800 rounded" />
        </div>

        {/* Content skeleton */}
        <div className="space-y-4">
          <div className="h-4 w-full bg-anime-800 rounded" />
          <div className="h-4 w-5/6 bg-anime-800 rounded" />
          <div className="h-4 w-4/6 bg-anime-800 rounded" />
          <div className="h-20 w-full bg-anime-800 rounded mt-6" />
          <div className="h-4 w-full bg-anime-800 rounded" />
          <div className="h-4 w-3/4 bg-anime-800 rounded" />
        </div>
      </div>
    </div>
  )
}
