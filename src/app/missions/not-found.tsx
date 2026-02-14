/**
 * @file not-found.tsx
 * @description 404 page for missions
 */

export default function MissionsNotFound(): React.ReactElement {
  return (
    <div className="min-h-screen bg-anime-950 cyber-grid flex items-center justify-center">
      <div className="grain-overlay fixed inset-0 pointer-events-none" />

      <div className="relative z-10 text-center max-w-md">
        {/* 404 Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-anime-purple/20 border-2 border-anime-purple flex items-center justify-center">
          <svg
            className="w-10 h-10 text-anime-purple"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h2 className="font-heading text-2xl font-bold text-anime-100 mb-4">
          Mission Not Found
        </h2>
        <p className="text-anime-400 mb-6">
          The mission you're looking for doesn't exist in the database.
        </p>

        <a
          href="/missions"
          className="inline-block px-6 py-3 rounded bg-anime-cyan text-anime-950 font-heading hover:bg-anime-cyan/90 transition-colors"
        >
          Back to Missions
        </a>
      </div>
    </div>
  );
}
