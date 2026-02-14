import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

/**
 * @file loading.tsx
 * @description Loading state for missions
 */

export default function MissionsLoading(): React.ReactElement {
  return (
    <div className="min-h-screen bg-anime-950 cyber-grid flex items-center justify-center">
      <div className="grain-overlay fixed inset-0 pointer-events-none" />

      <div className="relative z-10 text-center">
        {/* Lottie Loading Animation */}
        <div className="mx-auto mb-6">
          <LoadingSpinner />
        </div>

        <h2 className="font-heading text-2xl font-bold text-anime-100 mb-2">
          Loading Missions...
        </h2>
        <p className="text-anime-500">Initializing mission database</p>
      </div>
    </div>
  );
}
