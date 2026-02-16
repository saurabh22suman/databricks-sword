/**
 * Field Operations Loading Skeleton
 * Shows while loading field ops pages.
 */

export default function FieldOpsLoading(): React.ReactElement {
  return (
    <div className="min-h-screen bg-anime-950 py-12">
      <div className="container mx-auto px-4">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-10 w-64 bg-anime-800 animate-pulse rounded mb-2" />
          <div className="h-6 w-96 bg-anime-800 animate-pulse rounded" />
        </div>

        {/* Connection Status Skeleton */}
        <div className="h-16 bg-anime-900 border border-anime-700 animate-pulse rounded mb-8" />

        {/* Industry Cards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="cut-corner bg-anime-900 border border-anime-700 p-6 animate-pulse"
            >
              {/* Emoji */}
              <div className="h-12 w-12 bg-anime-800 rounded mb-4" />
              {/* Title */}
              <div className="h-6 w-3/4 bg-anime-800 rounded mb-2" />
              {/* Description */}
              <div className="h-4 w-full bg-anime-800 rounded mb-1" />
              <div className="h-4 w-2/3 bg-anime-800 rounded mb-4" />
              {/* Stats */}
              <div className="flex gap-4 mb-4">
                <div className="h-4 w-20 bg-anime-800 rounded" />
                <div className="h-4 w-16 bg-anime-800 rounded" />
              </div>
              {/* Button */}
              <div className="h-10 w-full bg-anime-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
