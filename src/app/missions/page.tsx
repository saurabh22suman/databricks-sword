/**
 * @file page.tsx
 * @description Mission select page - displays all available missions in a grid
 */

import { MissionGrid } from "@/components/missions/MissionGrid";
import { getAllMissions } from "@/lib/missions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Missions | Databricks Sword",
  description: "Choose your next mission to master the Databricks ecosystem",
};

/**
 * Missions page component
 *
 * Displays all available missions in a grid, grouped by industry.
 * Shows locked/unlocked state based on user XP.
 */
export default async function MissionsPage(): Promise<React.ReactElement> {
  const missions = await getAllMissions();

  // TODO: Get user XP from profile/session (for now, hardcode 0)
  const userXp = 0;

  return (
    <div className="min-h-screen bg-anime-950 cyber-grid pt-20">
      <div className="grain-overlay fixed inset-0 pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="font-heading text-5xl font-bold text-anime-100 mb-4">
            Mission Select
          </h1>
          <p className="text-anime-400 text-lg max-w-2xl mx-auto">
            Choose your mission. Master real-world Databricks scenarios across
            10 industries.
          </p>
        </div>

        {/* Mission Grid by Industry */}
        <MissionGrid missions={missions} userXp={userXp} />

        {/* Empty State */}
        {missions.length === 0 && (
          <div className="text-center py-20">
            <div className="w-40 h-40 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(0,255,255,0.2)]">
              <img
                src="/illustrations/empty-missions.png"
                alt="No missions available"
                className="w-full h-full object-contain opacity-80"
              />
            </div>
            <h3 className="font-heading text-xl font-bold text-anime-300 mb-2">
              No Missions Available
            </h3>
            <p className="text-anime-500">
              Missions are being uploaded to the system...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
